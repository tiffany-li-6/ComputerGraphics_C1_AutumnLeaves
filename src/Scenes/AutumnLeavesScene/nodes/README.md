# AutumnScene nodes

The node models and views that make up the autumn tree scene.

## Contents:

- [./LabCatModel.ts](./LabCatModel.ts): A labcat png textured square that changed location when nudged by the arrow keys. Shows `ControlKeys`, `static SetAppState`, `static PreloadAssets`, the constructor, and input methods.
- [./LabCatView.ts](./LabCatView.ts): A custom `AGLNodeView` that draws the model's vertices with an `APolygonGraphic2D`, rebuilds it when the geometry changes, and applies the model's transform in `update()`.
- [./LeafBlowerModel.ts](./LeafBlowerModel.ts): A Leaf blower png textured rectangle that is a child of the Labcat model, and its angle is nudged by the keys '1' and '2'. Shows `ControlKeys`, `static SetAppState`, `static PreloadAssets`, the constructor, and input methods.
- [./LeafBlowerView.ts](./LeafBlowerView.ts): A custom `AGLNodeView` that draws the model's vertices with an `APolygonGraphic2D`, rebuilds it when the geometry changes, and applies the model's transform in `update()`.
- [./BranchSegmentModel.ts](./BranchSegmentModel.ts): One rectangular segment of a branch, with its base at its origin so it rotates around the point where it attaches to its parent. Stores its `length`, `width` and `level` (0 for the trunk).
- [./BranchSegmentView.ts](./BranchSegmentView.ts): A custom `AGLNodeView` that draws a branch segment's vertices with an `APolygonGraphic2D`, rebuilds it when the geometry changes, and applies the model's transform in `update()`.
- [./LeafModel.ts](./LeafModel.ts): A leaf whose outline is two mirrored cubic Bezier curves from stem to tip, sampled with `createLeafSpline` into a filled polygon whose vertex colors blend from `baseColor` at the stem to `tipColor` at the tip. Adds a "show control points" checkbox to the control panel.
- [./WindModel.ts](./WindModel.ts): A a cone-like geometry that extends out of the leafblower and enacts force on objects in range. Shows `ControlKeys`, `static SetAppState`, `static PreloadAssets`, the constructor, `timeUpdate` with `dt`, and input methods.
- [./WindView.ts](./WindView.ts): A custom `AGLNodeView` that draws the model's vertices with an `APolygonGraphic2D`, rebuilds it when the geometry changes, and applies the model's transform in `update()`.
- [./LeafView.ts](./LeafView.ts): Draws a `LeafModel` as a filled polygon and, when `ShowPoints` is on, marks the Bezier control points (blue). The control points can be shown or hidden with a control-panel checkbox. The markers are rebuilt whenever the leaf's geometry changes.
- [./TerrainModel.ts](./TerrainModel.ts): Ground with a gentle wobble along its top edge from one layer of simplex noise, colored from `topColor` at the surface to `bottomColor` below. `heightAt(x)` gives the surface height, for standing things on the ground. Drawn by the engine's `PolygonView2D`.
- [./SkyModel.ts](./SkyModel.ts): The backdrop: one wide rectangle whose vertex colors blend from the wind's color at the top of the screen to cream at the bottom, behind every other node (negative `zValue`). Drawn by the engine's `PolygonView2D`.
- [./TreeModel.ts](./TreeModel.ts): A group node with no geometry of its own that recursively grows `BranchSegmentModel` children into a tree, with a slider for the total angle between the two outermost sibling branches. Drawn by the engine's `AGroupNodeView`.
- [./index.ts](index.ts): Re-exports the classes above.
