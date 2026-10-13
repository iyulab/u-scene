/** Package version, kept in step with package.json by the release task. */
export const VERSION = '0.1.0';

export { TONES } from './core/types.js';
export type { Tone, HexColor, Paint, Stroke, Fill, PathNode, LineNode, CircleNode, RectNode, TextNode, SceneNode, Scene } from './core/types.js';
export { TONE_DEFAULTS, isTone, resolvePaint } from './core/paint.js';
export { assertScene } from './core/validate.js';
export { renderToSvgString } from './core/render.js';
export { polarPoint, arcPath, boxesOverlap, clampAnchoredX } from './core/geometry.js';
export type { Point, LabelAnchor, LabelPlacement, LabelBox } from './core/geometry.js';
