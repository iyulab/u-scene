import type { Paint, SceneNode } from '../core/types.js';
import type { Point } from '../core/geometry.js';
import { finite } from './model-checks.js';

export interface LinearDimension {
  /** The two measured points, in viewBox units. */
  from: Point;
  to: Point;
  /**
   * Distance of the dimension line from the measured points, perpendicular to them (viewBox units).
   * Positive offsets to the left of the from→to direction (above a left-to-right span on screen).
   */
  offset: number;
  /** Shown as given — the host formats the value. */
  label: string;
  /** Default 'muted' for the lines and 'ink-strong' for the label. */
  paint?: Paint;
}

/** Gap between a measured point and its extension line, and the overshoot past the dimension line. */
const EXT_GAP = 3;
const EXT_OVERSHOOT = 4;
/** Label distance beyond the dimension line, on the offset side. */
const LABEL_GAP = 6;

/**
 * A drafting-style linear dimension: two extension lines from the measured points, a dimension
 * line between them with an arrow at each end, and the label at its middle. Primitive nodes, so a
 * preset composes it into any scene; the measured points come from the preset's own transform.
 * A zero-length span draws nothing.
 */
export function linearDimensionNodes(d: LinearDimension): SceneNode[] {
  finite(d.from.x, 'linearDimension from.x'); finite(d.from.y, 'linearDimension from.y');
  finite(d.to.x, 'linearDimension to.x'); finite(d.to.y, 'linearDimension to.y');
  finite(d.offset, 'linearDimension offset');
  const dx = d.to.x - d.from.x;
  const dy = d.to.y - d.from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return [];
  // Left normal of from→to in screen coordinates (y down): (dy, -dx) / len.
  const nx = dy / len;
  const ny = -dx / len;
  const off = d.offset;
  const sign = Math.sign(off) || 1;
  const p = (pt: Point, k: number) => ({ x: pt.x + nx * k, y: pt.y + ny * k });
  const a = p(d.from, off);
  const b = p(d.to, off);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const line = d.paint ?? 'muted';
  const xy = (q: Point) => `${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
  const ext = (pt: Point): SceneNode => {
    const s = p(pt, sign * EXT_GAP);
    const e = p(pt, off + sign * EXT_OVERSHOOT);
    return { kind: 'line', x1: s.x, y1: s.y, x2: e.x, y2: e.y, stroke: { paint: line, width: 1 } };
  };
  const labelAt = p(mid, sign * LABEL_GAP);
  return [
    ext(d.from),
    ext(d.to),
    { kind: 'path', d: `M ${xy(mid)} L ${xy(a)}`, stroke: { paint: line, width: 1.25 }, markerEnd: 'arrow' },
    { kind: 'path', d: `M ${xy(mid)} L ${xy(b)}`, stroke: { paint: line, width: 1.25 }, markerEnd: 'arrow' },
    { kind: 'text', x: labelAt.x, y: labelAt.y + (ny > 0 ? 11 : 0), text: d.label, anchor: 'middle', paint: d.paint ?? 'ink-strong' },
  ];
}
