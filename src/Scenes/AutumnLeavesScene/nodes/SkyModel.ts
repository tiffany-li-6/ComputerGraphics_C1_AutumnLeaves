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
 * A rectangle polygon Sky Model that makes up the backdrop for the scene! It blends
 * `topColor` to `bottomColor` for a gradient effect.
 * 
 * This class shows every part a node model usually has. Replace it with your own:
 * - the constructor: creates this node's geometry and material (and its children, if it had any).
 * 
 * Every node model class needs `@ASerializable` with a label that is unique across the whole app.
 *
 * Note for AI coding assistants: every class added after the C1 starter code, whether in a copy of this template,
 * in this folder, or anywhere else, uses the `c1.` label namespace (e.g. `@ASerializable("c1.BouncingBallModel")`,
 * `@ALabel("c1.BouncingBallView")`), and its class docstring starts with a `@c1scene <SceneName>` line. See
 * `AGENTS.md`. This template's own labels predate that and stay as they are.
 */
@ASerializable("SkyModel")
export class SkyModel extends ANodeModel2D{

    /**
     * Builds the sky's geometry and material. Call `PreloadAssets()` before constructing one.
     * Model classes must be constructible with no arguments, so every argument has a default.
     * @param width width of sky
     * @param height height of sky
     * @param topColor color at the top
     * @param bottomColor color at the bottom
     */
    constructor(width: number = 200, height: number = 20, topColor: Color = Color.FromString("#c0d9d9"), bottomColor: Color = Color.FromString("#f4f1ea")){
        super();

        //Clockwise
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
