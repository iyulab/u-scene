/** Package version, kept in step with package.json by the release task. */
export const VERSION = '0.4.0';

export { TONES } from './core/types.js';
export type { Tone, HexColor, Paint, Stroke, Fill, PathNode, LineNode, CircleNode, RectNode, TextNode, SceneNode, Scene } from './core/types.js';
export { TONE_DEFAULTS, TEXT_TONE_SHARE, isTone, resolvePaint, resolveTextPaint } from './core/paint.js';
export { assertScene } from './core/validate.js';
export { renderToSvgString } from './core/render.js';
export { polarPoint, arcPath, boxesOverlap, clampAnchoredX } from './core/geometry.js';
export type { Point, LabelAnchor, LabelPlacement, LabelBox } from './core/geometry.js';
export { handlePosition, valueAtPoint, steppedValue, trackRange } from './core/handles.js';
export type { Handle, HandleStop } from './core/handles.js';
