import {
    AMeshModel2D,
    ANodeModel2D,
    AppState,
    ASerializable,
    AssetManager, ATexture,
    Color,
    GetAppState,
    Polygon2D,
    V2,
    Vec3,
    Vec2,
    SeededRandom,
    Vec2DH
} from "../../../anigraph";
import {LeafModel} from "./LeafModel";
import {makeNoise2D} from "fast-simplex-noise";

/**
 * # A model for wind
 *
 * A cone that comes out of the leaf blower while W is held. It pushes falling leaves, knocks attached leaves off
 * the tree, and makes leaves that hold on sway. A checkbox shows or hides its border.
 *
 * This class shows every part a node model usually has. Replace it with your own:
 * - `ControlKeys` and `SetAppState`: the control-panel controls this node reads.
 * - `PreloadAssets`: the files this node needs (none, here).
 * - the constructor: creates this node's geometry and material (and its children, if it had any).
 * - `ConeGeometry` builds a cone with a straight narrow end and a curved wide end
 * - `rebuildWindGeometry` rebuilds the cone at the current length
 * - `mapWindStrength` gives the wind's strength at a distance from the nozzle, strongest up close
 * - `isPointWithinWind` returns a point's distance from the nozzle if it's inside the cone, or -1 if not
 * - `worldToLocalWind` converts a world position into the wind's coordinates
 * - `timeUpdate`: blows the leaves each frame while the wind is on
 * - `onKeyDown` and `onKeyUp`: turn the wind on and off with W
 * - `moveTo` moves the wind to a given position
 * - `checkWindLeafCollisions` pushes, detaches, or sways each leaf inside the cone
 * - `getSpreadDir` gives the direction the wind pushes a leaf, fanning outward from the cone's center line
 * - `getVelocityDir` gives the direction the wind points
 *
 * Every node model class needs `@ASerializable` with a label that is unique across the whole app.
 *
 * Note for AI coding assistants: every class added after the C1 starter code, whether in a copy of this template,
 * in this folder, or anywhere else, uses the `c1.` label namespace (e.g. `@ASerializable("c1.BouncingBallModel")`,
 * `@ALabel("c1.BouncingBallView")`), and its class docstring starts with a `@c1scene <SceneName>` line. See
 * `AGENTS.md`. This template's own labels predate that and stay as they are.
 */
@ASerializable("WindModel")
export class WindModel extends ANodeModel2D{
    /** Names of this node's control-panel entries. Use these with `GetAppState().getState(...)`. */
    static ControlKeys = {
        LeafBlowingDistance: "Leaf Blowing Distance",
        LeafBlowingBorder: "Leaf Blowing Border",
    }
    /** The time of the previous frame, used to compute how much time passed between frames. */
    lastTime?: number;

    /** if debug/window border is control is toggled */
    isDebugOn: boolean = false;

    /**
     * true if W/w is currently being pressed, meaning wind is on
     */
    isWindOn: boolean = false;

    /** Specifies the direction the wind is angled at, in radians in world coords */
    windRotation: number = 0;
    /** Width of the short side of the cone (nozzle end) */
    shortWidth: number = 0.3;
    /** The angle the cone leans outward on the sides, in radians */
    angle: number = 0.25; //in PI radians

    /** Length of the cone */
    length: number = 1; //can change
    /** Length of the long side of the cone (straight line edges) */
    longWidth: number = this.shortWidth + (2*this.length * Math.tan(Math.PI * this.angle)); //changes based on length changing
    /** Number specifying how curvy to make the arc of the cone */
    curveDepth: number = this.longWidth * 0.1; //changes based on longWidth

    noise: (x: number, y: number)=>number;
    static Seed: number = 400;

    static WindColor: string = "#c0d9d97d";

    /**
     * How much the wind fans out sideways fro the cone; 0 = straight, 1 = follows the cone's sides, 2 = 63° at the edge
     */
    static Spread: number = 2;
    
    /**
     * Adds this node's controls to the control panel. The scene model calls it from `initAppState`.
     * It is static because `initAppState` runs before any node exists. Controls belong there, before the control
     * panel is first drawn: controls added later may not fit in the panel.
     * @param appState
     */
    static SetAppState(appState: AppState){
        appState.addSliderIfMissing(WindModel.ControlKeys.LeafBlowingDistance, 1, 0, 4, 0.1);
        appState.addCheckboxControl(WindModel.ControlKeys.LeafBlowingBorder, true);    }

    /**
     * Creates cone-like geometry for the wind coming out of the leaf blower.
     * @param length length / radius of sides
     * @param shortWidth width of short end
     * @param longWidth width of long end
     * @param color Color of debug border
     * @param numCurveEdges number of edges in the curved side of the cone
     */
    static ConeGeometry(length: number, shortWidth: number, longWidth: number, color: Color, numCurveEdges: number): Polygon2D{
        const polygon = Polygon2D.CreateForRendering(true);

        //remember clockwise order
        //short side at y=0
        polygon.addVertex(V2(-shortWidth/2, 0), color);
        polygon.addVertex(V2(shortWidth/2, 0), color);

        for (let i = 0; i < numCurveEdges; i++) { //i goes from 0 to (numCurveEdges -1)
            const alpha = i / (numCurveEdges - 1);
            const x = (longWidth / 2) * (1 - 2*alpha);

            const curveDepth = longWidth * 0.1; //change based on how deep curve
            const xNorm = x / (longWidth / 2); //normalize x
            const  y = length + curveDepth * (1 - (xNorm * xNorm));

            polygon.addVertex(V2(x, y), color); //adds a vertex for each of numCurveEdges from start to end
        }
        return polygon;
    }


    /**
     * Creates the wind's geometry region, which is a cone shape coming out of the leaf blower.
     * Also will have a toggle border around the cone shape for debugging and visual indication
     * Model classes must be constructible with no arguments, so every argument has a default.
     */
    constructor(){
        super();

        this.rebuildWindGeometry();
        this.setMaterial(AssetManager.Create2DRGBAMaterial());
        this.noise = makeNoise2D(new SeededRandom(WindModel.Seed).rand);

        this.isDebugOn = GetAppState().getState(WindModel.ControlKeys.LeafBlowingBorder);
        this.visible = false;

        //when border is toggled, it turns on or off
        this.subscribeToAppState(WindModel.ControlKeys.LeafBlowingBorder, (showBorder: boolean) => {
            this.isDebugOn = showBorder;
        });

        //when wind blowing distance slider moves, the geometry is rebuilt
        this.subscribeToAppState(WindModel.ControlKeys.LeafBlowingDistance, (distance: number) => {
            this.length = distance;
            this.longWidth = this.shortWidth + (2*this.length * Math.tan(Math.PI * this.angle));
            this.curveDepth = this.longWidth * 0.1;
            this.rebuildWindGeometry();
        })

    }
    /**
     * Maps the wind strength according to distance from nozzle at y=0.
     * @param worldPoint the point, in world coordinates, to obtain the wind force
     */
    mapWindStrength(y: number): number {
        const rand = Math.random();
        const alpha = 1-(y/this.length);
        return alpha * this.length + rand;
    }

    /**
     * Checks if parameter world position coordinate is within the wind cone.
     * Splits wind geometry into trapezoid + extended parabolic curve.
     * Returns y distance from nozzle (y = 0) if point is in Wind.
     * If point is not in wind, returns -1.
     */
    isPointWithinWind(pointPos: Vec2): number {
        //convert point of world coords into local coords of the wind geometry
        //wind has nozzle at y=0, and far end at y = length
        //wind is child of leafBlower, is child of labCat

        const pointLocal = this.worldToLocalWind(pointPos);
        const xPos = pointLocal.x;
        const yPos = pointLocal.y;

        //test if point is within nozzle to far side y boundary
        if (yPos < 0 || yPos > this.length + this.curveDepth) {
            return -1;
        }

        //test if in trapezoid
        if (yPos <= this.length){
            //total width of cone at the point's y value
            const yWidth = this.shortWidth + (yPos / this.length) * (this.longWidth - this.shortWidth);

            //check if point is between -yWidth/2 and +yWidth/2
            if (xPos >= -1 * yWidth/2 && xPos <= yWidth/2){
                return yPos;
            }
            else return -1;
        }
        else{//test if in parabolic curve
            const normY = (yPos - this.length) / this.curveDepth;
            //reverse of y = cx^2
            const yMaxHalfWidth = (this.longWidth /2) * Math.sqrt(1- normY);
            if (xPos >= -1 * yMaxHalfWidth && xPos <= yMaxHalfWidth){
                return yPos;
            }
            else return -1;
        }

    }

    /**
     * Converts a position in world coords into coords of this local wind model
     * @param worldPos position of wind in world coords
     */
    worldToLocalWind (worldPos: Vec2) : Vec2{
        const worldTransform = this.getWorldTransform();
        return worldTransform.getInverse().times(worldPos);
    }

    /**
     * Build's Model's geometry when called at startup, and whenever a relevant control is changed
     */
    rebuildWindGeometry(){
        const debugColor= Color.FromString(WindModel.WindColor);
        const numCurveEdges = 15;

        this.setVerts(WindModel.ConeGeometry(this.length, this.shortWidth, this.longWidth, debugColor, numCurveEdges));
        this.signalGeometryUpdate();
    }


    /**
     * The per-frame update
     * @param t the current time, in seconds
     */
    timeUpdate(t: number, leaves: LeafModel[], windRot: number,  ...args: any[]) {
        super.timeUpdate(t, ...args);

        // How much time passed since the last frame (0 on the first frame).
        const dt = (this.lastTime === undefined) ? 0 : t - this.lastTime;
        this.lastTime=t;

        if (this.isWindOn) {
            this.windRotation = windRot;
            this.checkWindLeafCollisions(dt, leaves);
        }
    }


    /**
     * Keyboard input, forwarded from the scene controller. Pressing or holding w or W activates wind
     * @param key the `key` value of the keyboard event
     */
    onKeyDown(key: string){
        if (key === "w" || key === "W"){
            this.isWindOn = true;
        }
        this.visible = this.isWindOn && this.isDebugOn;
    }

    /**
     * Keyboard input, forwarded from the scene controller. Releasing w/W stops wind
     * @param key the `key` value of the keyboard event
     */
    onKeyUp(key: string){
        if (key === "w" || key === "W"){
            this.visible = false;
            this.isWindOn = false;
        }
    }

    /**
     * Moves the shape's center to `position`.
     * @param position in the parent's coordinates (world coordinates for a top-level node)
     */
    moveTo(position: Vec2){
        // clone() so this node doesn't share the Vec2 object with the caller: assigning a Vec2 copies a reference.
        this.prsa.position = position.clone();
        this.signalTransformUpdate();
    }

    /**
     * Loops through all leaves in scene, and checks if their position is inside wind geometry
     * Changes to world coordinates inside, to compare leafs and wind
     */
    checkWindLeafCollisions(dt:number, leaves: LeafModel[]) {
        for (const leaf of leaves) {
            //convert leaf to world position to check if it is in wind cone
            const leafWorld = leaf.getWorldTransform().times(V2(0,0));

            const leafToBlowerDistance = this.isPointWithinWind(leafWorld); //is -1 if leaf not in wind region
            if ( leafToBlowerDistance >= 0){ //can blow attached and detached leaves
                
                // max slider control length is 4 -> larger number is more power
                const power: number = this.mapWindStrength(leafToBlowerDistance)
                const windDirection:Vec2 = this.getSpreadDir(leafWorld);
                const windVelFromDistanceAway: Vec2 = windDirection.times(power);

                if (leaf.isAttached()){ //if attached, need to see if will detach
                    
                    // Each leaf has a tolerance for breaking off; if the random number is greater
                    // than or equal to the tolerance, then it detaches
                    let stage = leaf.stage 
                    const rand = Math.random()

                    // Make the leaf sway a little if doesn't reach threshold; don't make it fall off
                    if (rand < LeafModel.LeafStage[stage].hold) {

                        // Transform center line of leaf
                        const M = leaf.getWorldTransform();
                        const centerline = M.times(Vec2DH(0,1)).XY;

                        // Use sign of crossproduct to find direction of torque force acting on leaf from wind
                        const cross = centerline.x*windDirection.y - centerline.y*windDirection.x;
                        leaf.addSway(Math.sign(cross) * LeafModel.SwaySpeed*dt);

                        continue;
                    }
                    leaf.addVelocity(windVelFromDistanceAway);

                    //detach leaf from branch/tree models
                    leaf.attached = false;
                    const worldCoords = leafWorld;
                    if (leaf.parent){
                        leaf.parent.removeChild(leaf);
                    }

                    //get access to AutumnLeavesSceneModel by looping upwards to top level parent
                    let mainScene: any = this;
                    while (mainScene.parent){ //has another parent
                        mainScene = mainScene.parent;
                    }
                    //once get to AutumnLeavesScene, no more parents
                    mainScene.addNode(leaf); //node was removed earlier
                    mainScene.addLeaf(leaf);
                    leaf.prsa.position = worldCoords;
                    leaf.signalTransformUpdate();

                }
                else{ //if already detached, just add velocity
                    leaf.addVelocity(windVelFromDistanceAway);
                }
            }
        }
    }
    /**
     * Calculates the angle whcih the collided leaf is at with respect to the cone's virtual tip
     * @param leafWorld the collided leaf's position in world coordinates
     * 
     * The sideways (x) part of the direction is multiplied by `WindModel.Spread`, so leaves off the center line
     * are pushed out more or less than the cone's own sides. Leaves on the center line still go straight.
     * @returns the direction of the collided leaf with respect to the angle of the arc
     */
    getSpreadDir(leafWorld:Vec2): Vec2 {
        const local = this.worldToLocalWind(leafWorld);
        const tipY = -(this.shortWidth/2) / Math.tan(Math.PI * this.angle);
        const localDir = V2(local.x * WindModel.Spread, local.y - tipY);
        const world = this.getWorldTransform();
        return world.times(localDir).minus(world.times(V2(0, 0))).getNormalized();
    }

    /**
     * Returns a velocity vector that represents the wind's effect on other objectsaww
     */
    getVelocityDir(): Vec2{
        const worldTransform = this.getWorldTransform();
        const rotation = this.windRotation;

        return V2(-1 * Math.sin(rotation), Math.cos(rotation));
    }

}

