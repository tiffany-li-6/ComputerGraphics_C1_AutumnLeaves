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

/**
 * # A Sky Model
 *
 * The scene's backdrop: one big rectangle whose colors blend from `topColor` at the top of the screen to
 * `bottomColor` at the bottom.
 */
@ASerializable("SkyModel")
export class SkyModel extends ANodeModel2D{

    /**
     * Builds the sky's geometry and material.
     * Model classes must be constructible with no arguments, so every argument has a default.
     * @param width how wide the sky is, in world units, centered on x = 0. Wide enough to cover any window shape.
     * @param height how tall the sky is, in world units, centered on y = 0. The scene shows y from -10 to 10.
     * @param topColor color along the top edge
     * @param bottomColor color along the bottom edge
     */
    constructor(width: number = 200, height: number = 20, topColor: Color = Color.FromString("#c0d9d9"), bottomColor: Color = Color.FromString("#f4f1ea")){
        super();

        // Clockwise, like the other polygons in this scene
        const polygon = Polygon2D.CreateForRendering(true);
        polygon.addVertex(V2(-width / 2, -height / 2), bottomColor);
        polygon.addVertex(V2(-width / 2, height / 2), topColor);
        polygon.addVertex(V2(width / 2, height / 2), topColor);
        polygon.addVertex(V2(width / 2, -height / 2), bottomColor);
        this.setVerts(polygon);

        // The RGBA material colors each pixel by interpolating the colors of the vertices around it
        this.setMaterial(AssetManager.Create2DRGBAMaterial());
        this.zValue = -0.1;
    }
}
