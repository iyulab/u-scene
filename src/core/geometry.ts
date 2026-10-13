/**
 * Screen geometry for scenes: angle -> screen coordinates, arc paths and label boxes.
 * Pure functions. They place values on screen; they never derive domain values.
 */
export interface Point {
  x: number;
  y: number;
}

/** angleDeg is counter-clockwise from the +x axis (right). SVG's y axis grows downward, so y is flipped. */
export function polarPoint(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

/**
 * SVG path string for an arc of radius r around (cx, cy), drawn from fromDeg to toDeg.
 * The SVG sweep-flag is 1 for clockwise in screen coordinates (y down). A counter-clockwise
 * arc in math coordinates (increasing angle) is 0.
 */
export function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number): string {
  const a = polarPoint(cx, cy, r, fromDeg);
  const b = polarPoint(cx, cy, r, toDeg);
  const largeArc = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  const sweep = toDeg > fromDeg ? 0 : 1;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export type LabelAnchor = 'start' | 'middle' | 'end';

export interface LabelPlacement {
  x: number;
  y: number;
  anchor: LabelAnchor;
}

export interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Axis-aligned box overlap test - the single source of truth for label collision checks.
 *  Plain arithmetic comparison; no trigonometry. Boxes that only touch do not overlap. */
export function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** Clamps the anchor x so a label of the given (worst-case) width stays inside the view when
 *  it grows from that anchor. Real text shorter than the width is simply placed more
 *  conservatively than strictly needed. */
export function clampAnchoredX(x: number, anchor: LabelAnchor, width: number, viewWidth: number): number {
  if (anchor === 'end') return Math.min(Math.max(x, width), viewWidth);
  if (anchor === 'start') return Math.max(Math.min(x, viewWidth - width), 0);
  return Math.min(Math.max(x, width / 2), viewWidth - width / 2);
}
