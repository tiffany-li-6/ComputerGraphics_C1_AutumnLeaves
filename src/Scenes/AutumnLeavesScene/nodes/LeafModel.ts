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
 *               |
 *              stem (0, 0)
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

    /** The 4 control points of the left curve, stem to tip. Kept so the view can draw them. */
    leftControlPoints: Vec2[] = [];
    /** The 4 control points of the right curve, stem to tip. Kept so the view can draw them. */
    rightControlPoints: Vec2[] = [];
    /** The sampled outline points, in polygon (clockwise) order. Same positions as the vertices in `verts`. */
    outlinePoints: Vec2[] = [];

    /** The time of the previous frame, used to compute how much time passed between frames. */
    lastTime?: number;

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
    constructor(length: number = 2, width: number = 1.2, baseColor: Color = Color.FromString("#e8a33d"), tipColor: Color = Color.FromString("#b8321f")){
        super();
        this.length = length;
        this.width = width;
        this.baseColor = baseColor;
        this.tipColor = tipColor;
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
}
