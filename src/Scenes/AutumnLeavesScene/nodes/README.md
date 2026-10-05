# AutumnScene nodes

The example node model and view. Replace them with your own; the comments in each say what every part is for.

## Contents:
- [./BranchSegmentModel.ts](./StarterShapeModel.ts): A regular polygon that spins at a slider-set speed, recolors from a color control (by subscribing to it), moves to a clicked point, and is nudged by the arrow keys. Shows `ControlKeys`, `static SetAppState`, `static PreloadAssets`, the constructor, `timeUpdate` with `dt`, and input methods.
- [./BranchSegmentView.ts](./StarterShapeView.ts): A custom `AGLNodeView` that draws the model's vertices with an `APolygonGraphic2D`, rebuilds it when the geometry changes, and applies the model's transform in `update()`.
- [./TreeModel.ts](./TreeModel.ts): The tree node model (currently a copy of the example spinning polygon, with its own control keys).
- [./TreeView.ts](./TreeView.ts): Draws a `TreeModel` as a filled polygon with an `APolygonGraphic2D`.
- [./index.ts](index.ts): Re-exports the classes above.
