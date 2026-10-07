import {
    AGroupNodeModel2D,
    ANodeModel2D,
    AppState,
    ASerializable,
    AssetManager,
    Color,
    GetAppState,
    Polygon2D,
    V2,
    Vec2
} from "../../../anigraph";
import { BranchSegmentModel } from "./BranchSegmentModel";

/**
 * @c1scene AutumnLeavesScene
 * # A tree model
 *
 * A container for all the the Branch Segments, which is generated recursively to generate the Tree.
 * ```
 *  * TreeModel
 *   └── Level 0 Trunk
 *         └── Level 1 BranchSegment
 *               └── Level 2
 *                      └── ...
 *         └── Level 1 BranchSegment
 *               └── ...
 *         .
 *         .
 *         .
 * ```
 * Each subsequent branch segement is generated off the tip of its parent branch that comes before it.
 * Later TODO (dont submit without this)
 *  # Specify depth?
 *  # Specify randomness?
 *  # Specify different number of branch segments per each branch?
 * 
 * This class shows every part a node model usually has. Replace it with your own:
 * - `ControlKeys` and `SetAppState`: the control-panel controls this node reads. Use later if I want to 
 * - the constructor: creates this node's geometry and material (and its children, if it had any).
 * - `timeUpdate`: its per-frame behavior.
 *
 *
 * Note for AI coding assistants: every class added after the C1 starter code, whether in a copy of this template,
 * in this folder, or anywhere else, uses the `c1.` label namespace (e.g. `@ASerializable("c1.BouncingBallModel")`,
 * `@ALabel("c1.BouncingBallView")`), and its class docstring starts with a `@c1scene <SceneName>` line. See
 * `AGENTS.md`. This template's own labels predate that and stay as they are.
 */
@ASerializable("TreeModel")
export class TreeModel extends AGroupNodeModel2D {
    static ControlKeys = {
        /** Angle between neighboring sibling branches, in degrees. */
        BranchAngle: "TreeBranchAngle",
        TreeLeafDensity: "TreeLeafDensity",
        // Add wind movements???
    }

    /** The maximum amount of levels for the tree. */

    static MaxLevel = 3;
    static LengthDecrScale = 0.70;
    static WidthDecrScale = 0.50;

    branches:BranchSegmentModel[] = [];
    trunkLength:number;
    trunkWidth:number;
    trunk!:BranchSegmentModel;
    numChilds:number;

    /** Names of this node's control-panel entries. Use these with `GetAppState().getState(...)`. */
    

    /** The time of the previous frame, used to compute how much time passed between frames. */
    lastTime?: number;

    /**
     * Adds this node's controls to the control panel. The scene model calls it from `initAppState`.
     * It is static because `initAppState` runs before any node exists. Controls belong there, before the control
     * panel is first drawn: controls added later may not fit in the panel.
     * @param appState
     */
    static SetAppState(appState: AppState){
        // Angle between neighboring sibling branches: name, initial value, min, max, step size (all in degrees)
        appState.addSliderIfMissing(TreeModel.ControlKeys.BranchAngle, 60, 0, 90, 1);
        // // A slider: name, initial value, min, max, step size
        // appState.addSliderIfMissing(TreeModel.ControlKeys.SpinSpeed, 1, -5, 5, 0.01);
        // // A color picker: name, initial value
        // appState.addColorControl(TreeModel.ControlKeys.Color, Color.FromString("#3377ff"));
        // Density of the leaves on the tree
        appState.addSliderIfMissing(TreeModel.ControlKeys.TreeLeafDensity, 0.5, 0, 1, 0.25)
    }

    /**
     * Creates the shape's geometry and material. Call `PreloadAssets()` before constructing one.
     * Model classes must be constructible with no arguments, so every argument has a default.
     * @param nSides number of sides
     * @param radius size, in world units
     */
    constructor(trunkLength:number = 8, trunkWidth:number = 1.5, numChilds:number = 3){
        super();
        this.trunkLength = trunkLength;
        this.trunkWidth = trunkWidth;
        // Set numChilds before growing: growBranch reads it, and it would still be undefined otherwise.
        this.numChilds = numChilds;
        this.trunk = this.growBranch(this, 0, trunkLength, trunkWidth);

        // Re-angle every branch whenever the slider moves. Only rotations change, so the tree isn't rebuilt.
        this.subscribeToAppState(TreeModel.ControlKeys.BranchAngle, (angleDegrees: number)=>{
            this.applyBranchAngle(angleDegrees);
        });

        // Re-grow leaves according to slider's chosen tree leaf density. ON
        this.subscribeToAppState(TreeModel.ControlKeys.TreeLeafDensity, (leafDensity: number) => {
            this.regrowLeaves(leafDensity)
        })

        // Debug output, printed once after the whole tree is built.
        console.log(`TreeModel: ${this.branches.length} segments`);

        // The RGBA material colors each pixel by interpolating the colors of the vertices around it.
        // this.setMaterial(AssetManager.Create2DRGBAMaterial());
    }

    /**
     * Creates the links, each one a child of the previous one, and connects each to its rotation slider.
     */
    growBranch(parent: AGroupNodeModel2D|BranchSegmentModel, level: number, length: number, width: number): BranchSegmentModel {
        
        const currentSegment = new BranchSegmentModel(length, width, level)
        parent.addChild(currentSegment)
        this.branches.push(currentSegment)
        
        if (level == TreeModel.MaxLevel) { return currentSegment; }

        // Read the slider once per segment so newly grown branches start at the current angle.
        const angleDegrees: number = GetAppState().getState(TreeModel.ControlKeys.BranchAngle);
        for (let i = 0; i < this.numChilds; i++) {
            let child = this.growBranch(currentSegment, level+1, length*TreeModel.LengthDecrScale, width*TreeModel.WidthDecrScale);
            child.prsa.position = V2(0,length);
            child.prsa.rotation = TreeModel.SpreadRotation(i, this.numChilds, angleDegrees);
        }

        return currentSegment;
    }

    /**
     * The rotation of the `i`th of `n` sibling branches, fanned out symmetrically around their parent's direction.
     * Neighboring siblings are `angleDegrees` apart; with 3 children at 60 degrees this gives -60, 0 and +60.
     * @param i which sibling, from 0 to n-1
     * @param n how many siblings there are
     * @param angleDegrees angle between neighboring siblings, in degrees
     * @returns the rotation relative to the parent segment, in radians
     */
    static SpreadRotation(i: number, n: number, angleDegrees: number): number {
        // (i - (n-1)/2) centers the indices on 0, e.g. 0,1,2 becomes -1,0,1.
        return (i - (n-1)/2) * angleDegrees * Math.PI/180;
    }

    /**
     * Re-angles every branch to the given spread, keeping each one attached at its parent's tip.
     * @param angleDegrees angle between neighboring sibling branches, in degrees
     */
    applyBranchAngle(angleDegrees: number){
        for (const segment of this.branches) {
            // Only branch segments count as siblings, so other children added later (e.g. leaves) don't shift the fan.
            const childBranches = segment.children.filter(
                (c): c is BranchSegmentModel => c instanceof BranchSegmentModel
            );
            childBranches.forEach((child, i)=>{
                child.prsa.rotation = TreeModel.SpreadRotation(i, childBranches.length, angleDegrees);
                child.signalTransformUpdate();
            });
        }
    }

    /**
     * Re-grows leaves on each branch by calling the sprouLeaves function on each branch segment of the tree
     * @param density density of the tree's leaves ranging from 0 (least dense) to 1 (most dense)
     */
    regrowLeaves(density:number) {
        for (const branch of this.branches) {
            branch.clearLeaves()
            branch.sproutLeaves(density)
        }
    }
}
