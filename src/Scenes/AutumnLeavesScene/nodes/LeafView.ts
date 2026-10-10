import {AGLNodeView, ALabel, APolygonGraphic2D, Color, GetAppState, Mat3, Polygon2D, V2, Vec2} from "../../../anigraph";
import {LeafModel} from "./LeafModel";


/**
 * # The view for a leaf
 *
 * Draws a `LeafModel` as a filled polygon with color interpolated from its vertex colors. When `ShowPoints` in the control
 * panel is on, it shows blue squares at each Bezier control point.
 */
@ALabel("LeafView")
export class LeafView extends AGLNodeView{
    /** Turn on to draw the control points */
    static ShowPoints = true;

    /** Size of the marker */
    static ControlMarkerSize = 0.09;

    element!: APolygonGraphic2D;

    /** Markers at the Bezier control points (toggeld by checkbox) */
    controlMarkers: APolygonGraphic2D[] = [];

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

        this.addStem()

        // Place the markers at the current points
        this.rebuildMarkers();
        this.subscribeToAppState(LeafModel.ControlKeys.ShowControlPoints, (show: boolean)=>{
            this.setControlPointsVisible(show);
        });

        this.subscribe(this.model.addGeometryListener(()=>{
            this.element.setVerts2D(this.model.verts);
            this.rebuildMarkers();
        }));

        this.update();
    }

    /**
     * Removes any existing markers and creates new ones at the model's current control points.
     */
    rebuildMarkers(){

        for (const marker of this.controlMarkers) {
            this.disposeGraphic(marker);
        }
        this.controlMarkers = [];

        if (!LeafView.ShowPoints) {
            return;
        }

        const controlPoints = this.model.leftControlPoints.concat(this.model.rightControlPoints.slice(1, 3));
        for (const p of controlPoints) {
            this.controlMarkers.push(this.addMarker(p, LeafView.ControlMarkerSize, Color.FromString("#2255ff")));
        }
        this.setControlPointsVisible(!!GetAppState().getState(LeafModel.ControlKeys.ShowControlPoints));
    }

    /**
     * Draws the leaf's center vein.
     */
    addStem(){
        const halfWidth = this.model.width * 0.04;     
        const top = this.model.length * 0.7;         
        const triangle = Polygon2D.FromLists([V2(-halfWidth, -4*halfWidth), V2(0, top), V2(halfWidth, -4*halfWidth)]);
        const stem = new APolygonGraphic2D(triangle, Color.FromString("#3b2412"));
        this.registerAndAddGraphic(stem);
    }

    /**
     * Adds a square centered at `position` in leaf coords.
     * @param position center of the square
     * @param size width of the square
     * @param color fill coloraw
     */
    addMarker(position: Vec2, size: number, color: Color): APolygonGraphic2D {
        const h = size / 2;
        const square = Polygon2D.FromLists([V2(-h, -h), V2(-h, h), V2(h, h), V2(h, -h)]);
        const marker = new APolygonGraphic2D(square, color);
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
