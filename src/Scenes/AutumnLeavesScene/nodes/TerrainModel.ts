import {
    ANodeModel2D,
    ASerializable,
    AssetManager,
    Color,
    Polygon2D,
    SeededRandom,
    V2,
} from "../../../anigraph";
import {makeNoise2D} from "fast-simplex-noise";

/**
 * @c1scene AutumnLeavesScene
 * # A Terrain Model
 *
 * Flat ground with a gentle wobble along its top edge. 
 * The top edge is `heightAt(x)` sampled at `nSamples` evenly spaced x values across `width`, 
 * and two corners `depth` below close off the shape:
 * ```
 *   ~~~~~~~~~~~~~~~~~~~~~   <- top edge: (x, heightAt(x)), y = 0 on average
 *   |                   |
 *   •-------------------•   <- bottom corners at y = -depth
 * ```
 * The wobble comes from one layer of simplex noise. Nearby inputs give nearby outputs, so the edge is smooth
 * rather than jagged. The model's origin is at the middle of the ground's average surface (y = 0).
 */
@ASerializable("TerrainModel")
export class TerrainModel extends ANodeModel2D{

    /** The seed for the noise. */
    static Seed = 888;

    /** The noise function: takes two numbers, returns a value between -1 and 1. */
    noise: (x: number, y: number)=>number;

    /** How wide the ground is, in world units, centered on x = 0 */
    width: number;
    /** How far the ground extends below its surface, in world units */
    depth: number;
    /** The most the surface rises or dips from y = 0, in world units */
    amplitude: number;
    /** How quickly the wobble changes along x */
    frequency: number;
    /** Number of points along the top edge, more points = smoother edge */
    nSamples: number;

    /**
     * Builds the ground's geometry and material.
     * Model classes must be constructible with no arguments, so every argument has a default.
     * @param width 
     * @param depth 
     * @param amplitude 
     * @param frequency 
     * @param nSamples 
     * @param topColor 
     * @param bottomColor
     */
    constructor(width: number = 40, depth: number = 1, amplitude: number = 0.3, frequency: number = 0.2,
                nSamples: number = 80, topColor: Color = Color.FromString("#7a8c3a"), bottomColor: Color = Color.FromString("#4a3520")){
        super();
        this.width = width;
        this.depth = depth;
        this.amplitude = amplitude;
        this.frequency = frequency;
        this.nSamples = nSamples;
        this.noise = makeNoise2D(new SeededRandom(TerrainModel.Seed).rand);

        const polygon = Polygon2D.CreateForRendering(true);
        polygon.addVertex(V2(-width / 2, 0), bottomColor);
        for (let i = 0; i < nSamples; i++) {
            const x = -width / 2 + (i / (nSamples - 1)) * width;
            polygon.addVertex(V2(x, this.heightAt(x)+depth), topColor);
        }
        polygon.addVertex(V2(width / 2, 0), bottomColor);
        this.setVerts(polygon);

        // The RGBA material colors each pixel by interpolating the colors of the vertices around it
        this.setMaterial(AssetManager.Create2DRGBAMaterial());
    }

    /**
     * Height of the surface at `x`, in this node's coordinates: one layer of noise scaled by `amplitude`, so the
     * result is always between -amplitude and +amplitude. Use it to stand things on the ground.
     * @param x position along the ground
     */
    heightAt(x: number): number {
        return this.noise(x * this.frequency, 0) * this.amplitude;
    }
}
