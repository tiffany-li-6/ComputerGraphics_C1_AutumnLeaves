import {
    AMeshModel2D,
    AppState,
    ASerializable,
    AssetManager,
    Color,
    Polygon2D,
    V2,
    Vec2
} from "../../../anigraph";
import * as Bezier from "../tools/CubicBezierFunctions";

/**
 * @c1scene AutumnLeavesScene
 * # A Leaf model
 *
 * A leaf whose outline is made of two cubic Bezier curves that both start at the stem (the origin) and end at the
 * tip, `(0, length)`. The left curve bulges out to `-x` and the right curve to `+x`:
 * ```
 *                ^  tip (0, length)
 *             /    )
 *     left   (  |  )   right
 *    curve    \ | /    curve
 *               |  (0, 0)
 *              stem 
 * ```
 * Each curve is sampled into points with `createLeafSpline`, and the sampled points become the vertices of a filled
 * polygon. Every vertex gets a color that is interpolated from `baseColor` (at the stem) to `tipColor` (at the tip),
 * and the RGBA material blends those colors across the triangles of the polygon.
 *
 * The stem is at the origin, so the leaf rotates around the point where it attaches to a branch.
 */
@ASerializable("LeafModel")
export class LeafModel extends AMeshModel2D {
    /** Names of this node's control-panel entries. Use these with `GetAppState().getState(...)`. */
    static ControlKeys = {
        Lifespan: "StarterLifespan",
        Color: "StarterShapeColor",
        /** Checkbox: whether leaf views draw their Bezier control points. */
        ShowControlPoints: "LeafShowControlPoints",
    }

    /** How many points each side's Bezier curve is sampled into (including both endpoints). */
    static NumSamplesPerSide = 16;

    /** Length of the leaf, from stem to tip, in world units. */
    length: number;
    /** Widest extent of the leaf, in world units (roughly; the curve never quite reaches its control points). */
    width: number;
    /** Color at the stem. */
    baseColor: Color;
    /** Color at the tip. */
    tipColor: Color;
    /** Age of the leaf, continuous number, increases with time */
    age: number;
    /** Stage of the leaf, integer number from 0 to 3, floor of age */
    stage: number;
    /** Offset for the stage to add noise/randomness to the color of each leaf */
    offset: number = 0;

    /** The 4 control points of the left curve, stem to tip. Kept so the view can draw them. */
    leftControlPoints: Vec2[] = [];
    /** The 4 control points of the right curve, stem to tip. Kept so the view can draw them. */
    rightControlPoints: Vec2[] = [];
    /** The sampled outline points, in polygon (clockwise) order. Same positions as the vertices in `verts`. */
    outlinePoints: Vec2[] = [];

    /** The time of the previous frame, used to compute how much time passed between frames. */
    lastTime?: number;

    /** Is this leaf attached to the tree or not? */
    attached: boolean = true;

    /** Velocity of this leaf */
    velocity: Vec2 = V2(0,0);

    /** Maximum speed for y-axis a leaf can move at*/
    maxFallSpeedY: number = 6;

    /** How far inside the screen's edges a falling leaf's stem stops, so the leaf body stays visible. */
    static EdgeMargin = 0.3;

    /**
     * A falling leaf's stem stays within [-XLimit, XLimit] in x. The scene sets it every frame from the screen's
     * left and right edges, which widen when the window gets wider.
     */
    static XLimit = 9.7;

    /** A falling leaf's stem can't go above this y. The scene sets it every frame from the top of the screen. */
    static YMax = 9.7;

    /** Table of the corresponding base and tip colors and hold threshold for each stage of a leaf*/
    static LeafStage = [
        { base: Color.FromString("#4a7a2a"), tip: Color.FromString("#5f9a35"), hold: 1.0  }, // stage 0: green, green
        { base: Color.FromString("#5f9a35"), tip: Color.FromString("#e0c341"), hold: 0.99 }, // stage 1: green, yellow
        { base: Color.FromString("#e0c341"), tip: Color.FromString("#e07b28"), hold: 0.95 }, // stage 2: yellow, orange
        { base: Color.FromString("#e07b28"), tip: Color.FromString("#7a4a22"), hold: 0.5  }, // stage 3: orange, brown
    ];

    /** Rate of color change from green to brown per second */
    static SeasonSpeed: number = 3/60;

    /** Weights for each characteristic of the leaf to determine the offset for age:
     * Consists of height within the tree, procedural noise based on (x,y) location, and random noise */
    static HeightWeight = 0.6;
    static NoiseWeight = 0.3;
    static RandomWeight = 0.1;

    static MaxSway = 0.3;
    static SwaySpeed = 2;
    static SwayReturn = 4;

    /** The angle of rotation assigned to the leaf when initially sprouted */
    restAngle:number = 0;
    /** The angle the wind is rotating the leaf at, from the sproutRoation angle */
    swayAngle:number = 0;

    /**
     * Adds this node's controls to the control panel. The scene model calls it from `initAppState`.
     * @param appState
     */
    static SetAppState(appState: AppState){
        // A slider: name, initial value, min, max, step size
        appState.addSliderIfMissing(LeafModel.ControlKeys.Lifespan, 5, 1, 30, 5);
        // A color picker: name, initial value
        appState.addColorControl(LeafModel.ControlKeys.Color, Color.FromString("#3377ff"));
        // A checkbox: name, initial value. Read by LeafView to show or hide the control-point markers.
        appState.addCheckboxControl(LeafModel.ControlKeys.ShowControlPoints, false);
    }

    /**
     * Builds the leaf's geometry and material.
     * Model classes must be constructible with no arguments, so every argument has a default.
     * @param length distance from stem to tip, in world units
     * @param width how wide the leaf is, in world units
     * @param baseColor color at the stem
     * @param tipColor color at the tip
     */
    constructor(length: number = 2, width: number = 1.2, baseColor: Color = LeafModel.LeafStage[0].base, tipColor: Color = LeafModel.LeafStage[0].tip){
        super();
        this.length = length;
        this.width = width;
        this.baseColor = baseColor;
        this.tipColor = tipColor;
        this.age = 0;
        this.stage = 0;
        this.rebuildGeometry();

        // The RGBA material colors each pixel by interpolating the colors of the vertices around it.
        this.setMaterial(AssetManager.Create2DRGBAMaterial());
    }

    /**
     * The control points of the right side of the leaf, stem to tip. The left side is the mirror image (x negated).
     * - p0 is the stem and p3 is the tip, so the curve passes through both.
     * - p1 and p2 pull the curve outward. p1 is low and wide, giving a round bottom; p2 is high and narrower, so
     *   the curve comes in to a point at the tip.
     * The tangent at the stem points from p0 to p1, and the tangent at the tip points from p2 to p3.
     * @param length distance from stem to tip
     * @param width how wide the leaf is
     */
    static RightControlPoints(length: number, width: number): Vec2[] {
        const halfWidth = width / 2;
        return [
            V2(0, 0),                              // p0: stem
            V2(halfWidth * 1.7, length * 0.2),     // p1: pulls the lower half outward
            V2(halfWidth * 0.9, length * 0.75),    // p2: pulls the upper half outward, less
            V2(0, length),                         // p3: tip
        ];
    }

    /**
     * Samples a single cubic Bezier segment into `nSamples` points, evenly spaced in alpha from 0 to 1 (both
     * endpoints included, so the first point is `controlPoints[0]` and the last is `controlPoints[3]`).
     * @param controlPoints the 4 control points p0, p1, p2, p3
     * @param nSamples number of points to return (at least 2)
     * @returns the sampled points, in order from p0 to p3
     */
    static createLeafSpline(controlPoints: Vec2[], nSamples: number = LeafModel.NumSamplesPerSide): Vec2[] {
        const [p0, p1, p2, p3] = controlPoints;
        const points: Vec2[] = [];
        for (let i = 0; i < nSamples; i++) {
            const alpha = i / (nSamples - 1);
            points.push(Bezier.GetCubicBezierSplineSegmentValueForAlpha(alpha, p0, p1, p2, p3));
        }
        return points;
    }

    /**
     * Builds the leaf's outline polygon: up the left curve from stem to tip, then down the right curve from tip
     * back to the stem, which goes around **clockwise**. The stem and tip are shared by both curves, so the right
     * curve's copies of them are dropped (duplicate vertices can break the polygon's triangulation).
     *
     * Each vertex is colored by how far up the leaf it is: `baseColor` at the stem, `tipColor` at the edges.
     */
    rebuildGeometry(){
        this.rightControlPoints = LeafModel.RightControlPoints(this.length, this.width);
        this.leftControlPoints = this.rightControlPoints.map(p => V2(-p.x, p.y));

        const leftSide = LeafModel.createLeafSpline(this.leftControlPoints);    // stem -> tip
        const rightSide = LeafModel.createLeafSpline(this.rightControlPoints);  // stem -> tip
        // Right side reversed (tip -> stem), without its first and last points (the shared tip and stem).
        const rightSideDown = rightSide.slice(1, -1).reverse();
        this.outlinePoints = leftSide.concat(rightSideDown);

        const polygon = Polygon2D.CreateForRendering(true);
        for (const p of this.outlinePoints) {
            // 0 at the stem, 1 at the tip
            const alpha = Math.min(Math.max(p.y / this.length, 0), 1);
            const color = this.baseColor.times(1 - alpha).plus(this.tipColor.times(alpha)) as Color;
            polygon.addVertex(p, color);
        }
        this.setVerts(polygon);
    }

    /**
     * The per-frame update. Nothing animates yet.
     * @param t the current time, in seconds
     */
    timeUpdate(t: number, ...args: any[]){
        super.timeUpdate(t, ...args);

        const dt = (this.lastTime === undefined) ? 0 : t - this.lastTime;
        this.lastTime = t;

        if (!this.attached){ //only update if leaf is detached and needs to move

            //velocity changes by drag force and gravity
            const draggedGravity = 3.0; //drag force and gravity combo for y movement
            this.velocity.y -= draggedGravity * dt;

            //cap falling speed so leaves don't keep speeding up on long falls
            if (this.velocity.y < -this.maxFallSpeedY){
                this.velocity.y = -this.maxFallSpeedY;
            }

            const dragOnX = 3;
            this.velocity.x -= this.velocity.x * dragOnX * dt;

            //velocity changed by wind effect will be applied through WindModel

            //update leaf position
            this.prsa.position = this.prsa.position.plus(this.velocity.times(dt));
            
            if (this.prsa.position.y < -9.5){
                this.prsa.position = V2(this.prsa.position.x, -9.5);
            }

            // Side walls: stop at the edge and drop the sideways speed, so the leaf falls down along the wall
            // instead of pushing into it
            if (Math.abs(this.prsa.position.x) > LeafModel.XLimit){
                this.prsa.position = V2(Math.sign(this.prsa.position.x) * LeafModel.XLimit, this.prsa.position.y);
                this.velocity.x = 0;
            }

            // Ceiling: stop rising, and gravity brings it back down
            if (this.prsa.position.y > LeafModel.YMax){
                this.prsa.position = V2(this.prsa.position.x, LeafModel.YMax);
                this.velocity.y = Math.min(this.velocity.y, 0);
            }
            this.signalTransformUpdate()
        }
    }
    
    /**
     * Update the color of the leaf for the given season progression `seasonProgress`
     * @param seasonProgress the current progress of the season from 0, green, to 3, brown.
     */
    updateSeason(seasonProgress: number){
        this.age = Math.min(Math.max(seasonProgress + this.offset, 0), 3);
        const prevStage = Math.min(Math.floor(this.age), 2);
        this.stage = prevStage

        // Create interpolation between target color values according to LeafStage
        const alpha = this.age - prevStage;
        const a = LeafModel.LeafStage[prevStage];
        const b = LeafModel.LeafStage[prevStage + 1];
        this.baseColor = a.base.times(1 - alpha).plus(b.base.times(alpha)) as Color;
        this.tipColor  = a.tip.times(1 - alpha).plus(b.tip.times(alpha)) as Color;
        this.rebuildGeometry();
    }

    /**
     * Sets the offset from the season progress for each leaf depending on height in the tree,
     * procedural noise based on location in tree, and a random factor. The higher the leaf is in
     * the tree, the larger its offset; the higher the offset, the earlier the leaf will start changing colors,
     * @param height number from 0 (bottom) to 1 (top) representing height relative to the tree
     * @param noise number from 0 to 1 generated by procedural noise where nearby leaves have a similar number
     * @param random numbe from 0 to 1, randomly generated with Math.random()
     */
    setSeasonOffset(height:number, noise:number, random: number) {
        this.offset = LeafModel.HeightWeight*height + LeafModel.NoiseWeight*noise + LeafModel.RandomWeight*random;
    }

    /** Adds `angle` amount to swayAngle by as a result of wind */
    addSway(angle:number) {
        this.swayAngle = Math.min(Math.max(this.swayAngle + angle), LeafModel.MaxSway);
    }

    /** Springs back the sway back to the resting angle `restAngle` according to factor `LeafModel.SwayReturn`
     * It preserves the sign of the angle (positive or negative sway) since we only change the swayAngle by
     * a factor between 0 and 1
     * @param dt 
    */
    updateSway(dt: number){
        if (!this.attached) { return; }
        this.swayAngle = this.swayAngle - this.swayAngle * Math.min(LeafModel.SwayReturn * dt, 1);
        this.prsa.rotation = this.restAngle + this.swayAngle;
        this.signalTransformUpdate();
    }

    /**
     * Moves the leaf's stem to `position`.
     * @param position in the parent's coordinates (world coordinates for a top-level node)
     */
    moveTo(position: Vec2){
        // clone() so this node doesn't share the Vec2 object with the caller: assigning a Vec2 copies a reference.
        this.prsa.position = position.clone();
        this.signalTransformUpdate();
    }

    /**
     * Returns if this leaf is attached to the tree
     */
    isAttached(){
        return this.attached;
    }

    /**
     * Changes velocity of this leaf
     * @param v velocity change vector
     */
    addVelocity(v : Vec2){
        this.velocity = this.velocity.clone().plus(v);
    }

}
