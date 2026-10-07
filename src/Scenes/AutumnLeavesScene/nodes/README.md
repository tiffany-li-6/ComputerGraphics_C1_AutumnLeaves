# AutumnScene nodes

The example node model and view. Replace them with your own; the comments in each say what every part is for.

## Contents:
- [./BranchSegmentModel.ts](./StarterShapeModel.ts): A regular polygon that spins at a slider-set speed, recolors from a color control (by subscribing to it), moves to a clicked point, and is nudged by the arrow keys. Shows `ControlKeys`, `static SetAppState`, `static PreloadAssets`, the constructor, `timeUpdate` with `dt`, and input methods.
- [./BranchSegmentView.ts](./StarterShapeView.ts): A custom `AGLNodeView` that draws the model's vertices with an `APolygonGraphic2D`, rebuilds it when the geometry changes, and applies the model's transform in `update()`.
- [./LabCatModel.ts](./StarterShapeModel.ts): A labcat png textured square that changed location when nudged by the arrow keys. Shows `ControlKeys`, `static SetAppState`, `static PreloadAssets`, the constructor, and input methods.
- [./LabCatView.ts](./StarterShapeView.ts): A custom `AGLNodeView` that draws the model's vertices with an `APolygonGraphic2D`, rebuilds it when the geometry changes, and applies the model's transform in `update()`.
- [./LeafBlowerModel.ts](./StarterShapeModel.ts): A Leaf blower png textured rectangle that is a child of the Labcat model, and its angle is nudged by the keys '1' and '2'. Shows `ControlKeys`, `static SetAppState`, `static PreloadAssets`, the constructor, and input methods.
- [./LeafBlowerView.ts](./StarterShapeView.ts): A custom `AGLNodeView` that draws the model's vertices with an `APolygonGraphic2D`, rebuilds it when the geometry changes, and applies the model's transform in `update()`.
- [./index.ts](index.ts): Re-exports the classes above.
