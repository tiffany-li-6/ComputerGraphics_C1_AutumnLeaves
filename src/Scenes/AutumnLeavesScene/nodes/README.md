# AutumnScene nodes

The node models and views that make up the autumn tree scene.

## Contents:
- [./BranchSegmentModel.ts](./BranchSegmentModel.ts): One rectangular segment of a branch, with its base at its origin so it rotates around the point where it attaches to its parent. Stores its `length`, `width` and `level` (0 for the trunk).
- [./BranchSegmentView.ts](./BranchSegmentView.ts): A custom `AGLNodeView` that draws a branch segment's vertices with an `APolygonGraphic2D`, rebuilds it when the geometry changes, and applies the model's transform in `update()`.
- [./LeafModel.ts](./LeafModel.ts): A leaf whose outline is two mirrored cubic Bezier curves from stem to tip, sampled with `createLeafSpline` into a filled polygon whose vertex colors blend from `baseColor` at the stem to `tipColor` at the tip. Adds a "show control points" checkbox to the control panel.
- [./LeafView.ts](./LeafView.ts): Draws a `LeafModel` as a filled polygon and, when `ShowPoints` is on, marks the sampled outline points (black) and the Bezier control points (blue). The control points can be shown or hidden with a control-panel checkbox. The markers are rebuilt whenever the leaf's geometry changes.
- [./TreeModel.ts](./TreeModel.ts): A group node with no geometry of its own that recursively grows `BranchSegmentModel` children into a tree, with a slider for the angle between sibling branches. Drawn by the engine's `AGroupNodeView`.
- [./index.ts](index.ts): Re-exports the classes above.
