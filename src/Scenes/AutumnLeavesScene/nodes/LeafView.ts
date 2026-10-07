import {AGLNodeView, ALabel, APolygonGraphic2D, Color, GetAppState, Mat3, Polygon2D, V2, Vec2} from "../../../anigraph";
import {LeafModel} from "./LeafModel";


/**
 * @c1scene AutumnLeavesScene
 * # The view for a leaf
 *
 * Draws a `LeafModel` as a filled polygon whose color is blended from its vertex colors. When `ShowPoints` is on,
 * it also draws a small square at each sampled outline point and a larger square at each Bezier control point,
 * so you can check that the curves have the shape you expect. The control-point markers can be shown or hidden
 * with the `LeafModel.ControlKeys.ShowControlPoints` checkbox in the control panel.
 */
@ALabel("LeafView")
export class LeafView extends AGLNodeView{
    /** Turn on to draw the sampled points and control points over the leaf (for debugging the curve). */
    static ShowPoints = true;

    /** Size of the marker drawn at each sampled outline point, in world units. */
    static SampleMarkerSize = 0.05;
    /** Size of the marker drawn at each control point, in world units. */
    static ControlMarkerSize = 0.09;

    /** The graphic that draws the filled leaf. */
    element!: APolygonGraphic2D;

    /** Markers at the sampled outline points (only created when `ShowPoints` is on). */
    sampleMarkers: APolygonGraphic2D[] = [];
    /** Markers at the Bezier control points (only created when `ShowPoints` is on). Toggled by the checkbox. */
    controlMarkers: APolygonGraphic2D[] = [];

    /** The model, typed as the class this view draws. */
    get model(): LeafModel {
        return this._model as LeafModel;
    }

    /**
     * Creates the graphics, once, when the view is created. Register each graphic with `registerAndAddGraphic` so
     * the view displays it and cleans it up when the view is released.
     */
    init(): void {
        this.element = new APolygonGraphic2D();
        this.element.init(this.model.verts, this.model.material);
        this.registerAndAddGraphic(this.element);

        // Place the markers at the current points, and keep the control points matching the checkbox.
        this.rebuildMarkers();
        this.subscribeToAppState(LeafModel.ControlKeys.ShowControlPoints, (show: boolean)=>{
            this.setControlPointsVisible(show);
        });

        // Rebuild the fill and the markers whenever the model signals that its geometry changed.
        this.subscribe(this.model.addGeometryListener(()=>{
            this.element.setVerts2D(this.model.verts);
            this.rebuildMarkers();
        }));

        this.update();
    }

    /**
     * Removes any existing markers and creates new ones at the model's current sampled points and control points.
     * Called once from `init` and again after every geometry change, so the markers always match the leaf (even if
     * the number of sampled points changes). Does nothing beyond clearing the old markers when `ShowPoints` is off.
     */
    rebuildMarkers(){
        // Dispose of the old markers so they stop drawing and free their resources.
        for (const marker of this.sampleMarkers.concat(this.controlMarkers)) {
            this.disposeGraphic(marker);
        }
        this.sampleMarkers = [];
        this.controlMarkers = [];

        if (!LeafView.ShowPoints) {
            return;
        }

        // Sampled outline points: small black squares.
        for (const p of this.model.outlinePoints) {
            this.sampleMarkers.push(this.addMarker(p, LeafView.SampleMarkerSize, Color.FromString("#000000")));
        }
        // Control points: larger blue squares
        const controlPoints = this.model.leftControlPoints.concat(this.model.rightControlPoints.slice(1, 3));
        for (const p of controlPoints) {
            this.controlMarkers.push(this.addMarker(p, LeafView.ControlMarkerSize, Color.FromString("#2255ff")));
        }

        // New markers start visible, so hide the control points if the checkbox is off.
        this.setControlPointsVisible(!!GetAppState().getState(LeafModel.ControlKeys.ShowControlPoints));
    }

    /**
     * Adds a small filled square centered at `position` (in the leaf's own coordinates).
     * @param position center of the square
     * @param size width of the square
     * @param color fill color
     * @returns the marker, so the caller can keep track of it
     */
    addMarker(position: Vec2, size: number, color: Color): APolygonGraphic2D {
        const h = size / 2;
        const square = Polygon2D.FromLists([V2(-h, -h), V2(-h, h), V2(h, h), V2(h, -h)]);
        const marker = new APolygonGraphic2D(square, color);
        // Graphics added to this view already get the model's transform, so only offset within the leaf.
        marker.setTransform(Mat3.Translation2D(position));
        this.registerAndAddGraphic(marker);
        return marker;
    }

    /**
     * Shows or hides every control-point marker.
     * @param visible true to show them
     */
    setControlPointsVisible(visible: boolean){
        for (const marker of this.controlMarkers) {
            marker.visible = visible;
        }
    }

    /**
     * Runs whenever the model's state changes, including its transform. Applies the model's transform.
     */
    update(...args: any[]): void {
        this.setTransform(this.model.transform);
    }
}
