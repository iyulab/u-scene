/**
 * Box layout: one layer of identical boxes on a floor (a pallet deck, a container floor) in plan, and
 * the stack of layers beside it in elevation, on one scale. Pure functions that move already-computed
 * placements to screen coordinates; they never decide how many boxes fit or where they go.
 */
import type { Point } from '../core/geometry.js';

/** One box of the layer: position of its corner on the floor, and its footprint (the floor's own unit). */
export interface BoxLayoutBox {
  x: number;
  y: number;
  length: number;
  width: number;
}

export interface BoxLayoutInput {
  /** Floor length (x) and width (y), the same unit as the boxes. > 0. */
  floorLength: number;
  floorWidth: number;
  boxes: readonly BoxLayoutBox[];
  /** Layers drawn in the elevation (a whole number, already computed by the caller). >= 1. */
  layers: number;
  /** Height of one layer, the same unit. > 0. */
  boxHeight: number;
  /** Height of the deck under the load (a pallet), the same unit. >= 0. */
  deckHeight: number;
  /** A height the stack is held to, drawn as a dashed line; the same unit. > 0 when given. */
  limitHeight?: number;
}

export interface BoxLayoutView {
  width: number;
  /** Tallest drawing allowed (px): plan + gap + elevation share it, and the scale shrinks to meet it. */
  maxHeight: number;
  /** Room for the vertical dimension texts (px), at least `BOX_LAYOUT_LEFT` / `BOX_LAYOUT_RIGHT`: a longer label asks for more. */
  leftGutter?: number;
  rightGutter?: number;
}

export interface Rect { x: number; y: number; width: number; height: number; }

export interface BoxLayoutGeometry {
  /** Unit to px, the same on every axis and in both views. */
  scale: number;
  viewHeight: number;
  /** The floor in plan, and each box in plan. */
  floorRect: Rect;
  planBoxes: Rect[];
  /** The deck band under the stack (elevation), when deckHeight > 0. */
  deckRect?: Rect;
  /** One rect per box per layer in elevation: the columns of the layer, one on top of another. */
  stackBoxes: Rect[];
  /** Left and right ends of the ground line, and its y. */
  groundY: number;
  /** y of the height limit line, when given. */
  limitY?: number;
  /** Measured spans for the dimension lines. */
  lengthSpan: { from: Point; to: Point };
  widthSpan: { from: Point; to: Point };
  heightSpan: { from: Point; to: Point };
  /** Smallest box edge in plan and the layer height in elevation (px) - what the caller checks to be visible. */
  minEdgePx: number;
  layerPx: number;
}

/** Least gutters for the dimension lines and their labels (px). */
export const BOX_LAYOUT_LEFT = 78;
export const BOX_LAYOUT_RIGHT = 78;
export const BOX_LAYOUT_TOP = 30;
export const BOX_LAYOUT_BOTTOM = 14;
/** Gap between the plan and the elevation (px). */
export const BOX_LAYOUT_GAP = 30;
/** A box or layer drawn smaller than this (px) cannot be told apart from its neighbours. */
export const BOX_LAYOUT_MIN_PX = 2;

/** One scale for both views: the floor fits the width, and plan + elevation fit the height. */
export function boxLayoutGeometry(m: BoxLayoutInput, view: BoxLayoutView): BoxLayoutGeometry {
  const stackHeight = m.deckHeight + m.layers * m.boxHeight;
  const elevationUnits = Math.max(stackHeight, m.limitHeight ?? 0);
  const left = Math.max(view.leftGutter ?? 0, BOX_LAYOUT_LEFT);
  const right = Math.max(view.rightGutter ?? 0, BOX_LAYOUT_RIGHT);
  const availW = view.width - left - right;
  const availH = view.maxHeight - BOX_LAYOUT_TOP - BOX_LAYOUT_BOTTOM - BOX_LAYOUT_GAP;
  const scale = Math.min(availW / m.floorLength, availH / (m.floorWidth + elevationUnits));

  const x0 = left;
  const y0 = BOX_LAYOUT_TOP;
  const floorRect: Rect = { x: x0, y: y0, width: m.floorLength * scale, height: m.floorWidth * scale };
  const planBoxes = m.boxes.map((b): Rect => ({ x: x0 + b.x * scale, y: y0 + b.y * scale, width: b.length * scale, height: b.width * scale }));

  const groundY = y0 + floorRect.height + BOX_LAYOUT_GAP + elevationUnits * scale;
  const layerPx = m.boxHeight * scale;
  const deckPx = m.deckHeight * scale;
  const deckRect: Rect | undefined = m.deckHeight > 0
    ? { x: x0, y: groundY - deckPx, width: floorRect.width, height: deckPx }
    : undefined;

  // The columns of one layer: each distinct x of a box is one column in the front view.
  const columns = new Map<string, { x: number; length: number }>();
  for (const b of m.boxes) {
    const key = b.x.toFixed(4);
    if (!columns.has(key)) columns.set(key, { x: b.x, length: b.length });
  }
  const stackBoxes: Rect[] = [];
  for (let layer = 0; layer < m.layers; layer++) {
    const top = groundY - deckPx - (layer + 1) * layerPx;
    for (const c of columns.values()) stackBoxes.push({ x: x0 + c.x * scale, y: top, width: c.length * scale, height: layerPx });
  }

  const stackTopY = groundY - stackHeight * scale;
  const xRight = x0 + floorRect.width;
  return {
    scale,
    viewHeight: groundY + BOX_LAYOUT_BOTTOM,
    floorRect,
    planBoxes,
    ...(deckRect ? { deckRect } : {}),
    stackBoxes,
    groundY,
    ...(m.limitHeight !== undefined ? { limitY: groundY - m.limitHeight * scale } : {}),
    lengthSpan: { from: { x: x0, y: y0 }, to: { x: xRight, y: y0 } },
    // upward on screen, so the dimension sits to the left of the floor
    widthSpan: { from: { x: x0, y: y0 + floorRect.height }, to: { x: x0, y: y0 } },
    // downward on screen, so the dimension sits to the right of the stack
    heightSpan: { from: { x: xRight, y: stackTopY }, to: { x: xRight, y: groundY } },
    minEdgePx: Math.min(...planBoxes.map((r) => Math.min(r.width, r.height))),
    layerPx,
  };
}

/**
 * The most boxes `view` can show apart, and the most layers: a box edge or a layer drawn under
 * `BOX_LAYOUT_MIN_PX` cannot be told from its neighbour, so a count above these can never be drawn
 * in any floor shape. Derived from the view, so it follows any change to it.
 */
export function boxLayoutLimits(view: BoxLayoutView): { maxBoxes: number; maxLayers: number } {
  const availW = view.width - BOX_LAYOUT_LEFT - BOX_LAYOUT_RIGHT;
  const availH = view.maxHeight - BOX_LAYOUT_TOP - BOX_LAYOUT_BOTTOM - BOX_LAYOUT_GAP;
  return {
    maxBoxes: Math.floor(availW / BOX_LAYOUT_MIN_PX) * Math.floor(availH / BOX_LAYOUT_MIN_PX),
    maxLayers: Math.floor(availH / BOX_LAYOUT_MIN_PX),
  };
}
