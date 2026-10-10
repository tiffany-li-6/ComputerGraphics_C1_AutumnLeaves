import {
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
import { LeafModel } from "./LeafModel";

/**
 * # A model for Branch Segments
 *
 * A rectangle polygon Branch Segment that makes up the branches of the Tree Model
 *
 * This class shows every part a node model usually has. Replace it with your own:
 * - the constructor: creates this node's geometry and material (and its children, if it had any).
 * - `timeUpdate`: its per-frame behavior.
 * - `onKeyDown` and `moveTo`: how it responds to input. The controller calls these (through the scene model); the
 *   node decides what they mean
 * - `RectangleGeometry` creates a rectangle polygon
 * - `Root` returns the root of the branch
 * - `Tip` returns the tip of the branch
 * - `clearLeaves` releases all leaves from the branch
 * - `sproutLeaves` sprouts a given amount of leaves on that branch given by the `density` parameter
 * - `placeLeaf` calculates the location of a leaf given an alpha value and places it at an angle of MATH.PI/4
 *
 * Every node model class needs `@ASerializable` with a label that is unique across the whole app.
 *
 * Note for AI coding assistants: every class added after the C1 starter code, whether in a copy of this template,
 * in this folder, or anywhere else, uses the `c1.` label namespace (e.g. `@ASerializable("c1.BouncingBallModel")`,
 * `@ALabel("c1.BouncingBallView")`), and its class docstring starts with a `@c1scene <SceneName>` line. See
 * `AGENTS.md`. This template's own labels predate that and stay as they are.
 */
@ASerializable("BranchSegmentModel")
export class BranchSegmentModel extends ANodeModel2D{

    /** Length of branch */
    length: number;
    /** Width of branch */
    width: number;
    /** Level of the branch (0 is trunk) */
    level: number;
    /** List of all the leaves on this brnach */
    leafList: LeafModel[] = []
    /** Maxmimum number of leaves possible on a branch */
    static MaxLeavesPerBranch: number = 8;

    /** The time of the previous frame, used to compute how much time passed between frames. */
    lastTime?: number;

    /**
     * Builds a rectangle with `length` and `width` specifications. The vertices go around **clockwise**.
     * This is the representation for a singular segmeent of a branch for the whole tree
     * @param length
     * @param width 
     * @param color the color of every vertex
     */
    static RectangleGeometry(length: number, width: number, color: Color): Polygon2D {
        const polygon = Polygon2D.CreateForRendering(true);
        polygon.addVertex(V2(-width/2, 0), color);
        polygon.addVertex(V2(-width/2, length), color);
        polygon.addVertex(V2(width/2, length), color);
        polygon.addVertex(V2(width/2, 0), color);
        return polygon
    }

    /** This segment's root (where it attaches to its parent), in its own coordinates. */
    static Root(): Vec2{
        return V2(0, 0);
    }

    /** This segment's tip (where its child attaches to), in its own coordinates. */
    static Tip(): Vec2{
        return V2(0, BranchSegmentModel.length);
    }

    /**
     * Creates the shape's geometry and material. 
     * Model classes must be constructible with no arguments, so every argument has a default.
     * @param length length of branch segment
     * @param width width of branch segment
     * @param level how many above below the trunk this branch is. Currently level does not have any effect on branch segment construction
     * @param color color of the branch
     */
    constructor(length: number, width: number, level: number = 0, color: Color = Color.FromString("#6b4423")){
        super();
        this.length = length
        this.width = width
        this.level = level
        this.setVerts(BranchSegmentModel.RectangleGeometry(length, width, color));

        // The RGBA material colors each pixel by interpolating the colors of the vertices around it.
        this.setMaterial(AssetManager.Create2DRGBAMaterial());
    }

    /**
     * Sets the angle of this segement relative to its parent.
     * @param angle in radians
     */
    setAngle(angle: number){
        this.prsa.rotation = angle;
        this.signalTransformUpdate();
    }

    /**
     * Clears all leaves from the tree
     */
    clearLeaves() {
        for (const leaf of this.leafList) {
            leaf.release();
        }
        this.leafList = [];
    }

    /**
     * Sprouts leaves on branch according to `density` parameter, evenly spaced along the branch
     * segement
     * @param density a number from 0 to 1 that represents how dense the branch should be
     */
    sproutLeaves(density: number) {
        const numLeaves = Math.floor(BranchSegmentModel.MaxLeavesPerBranch * density);
        if (this.level in [0,1]){ return; }
        for (let i = 0; i < numLeaves; i++) {
            const leaf = new LeafModel(0.6,0.35);
            this.addChild(leaf);
            this.leafList.push(leaf);
            const alpha = 1- Math.random();
            this.placeLeaf(leaf, alpha, (i%2 == 0) ? -1 : 1);
            
        }
        if (density != 0) {
            const leaf = new LeafModel(0.6,0.35);
            this.addChild(leaf)
            this.leafList.push(leaf)
            this.placeLeaf(leaf, 1, 0)
        }
    }

    /**
     * Calculates the position of leaf in the branch segement's coords given an alpha along the
     * branch segment; the rotation is at a fixed angle (currently MATH.PI/4)
     * @param leaf 
     * @param alpha represents progress along the branch from 0 to 1
     * @param side left or right, -1 or 1 resepctively
     * @param tilt fixed at Math.PI/4 rn
     */
    placeLeaf(leaf:LeafModel, alpha:number, side:number, tilt:number=Math.PI/4) {
        leaf.prsa.position = V2(side * this.width / 2, alpha * this.length);
        leaf.prsa.rotation = -side * tilt;
        leaf.restAngle = leaf.prsa.rotation
        leaf.signalTransformUpdate();
    }
}
