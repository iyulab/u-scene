/**
 * Ring cross-section: concentric outer and inner circles - a plated barrel, a tube section,
 * a flange face. An inner diameter of 0 gives a solid disc. Circles are drawn as two arcs
 * each (no trigonometry needed); only the bolt-hole placement uses `polarPoint`.
 */
import { polarPoint } from '../core/geometry.js';
import type { LabelPlacement } from '../core/geometry.js';

export interface RingSectionInput {
  /** Outer diameter (mm). > 0. */
  outerDiameterMm: number;
  /** Inner diameter (mm). 0 <= ID < OD. 0 is a solid disc. */
  innerDiameterMm: number;
  /** Optional concentric reference circle (mm, e.g. a raised face), drawn to the same scale. */
  referenceDiameterMm?: number;
  /** Optional bolt circle diameter (mm). The bolt pattern is drawn only together with boltCount. */
  boltCircleDiameterMm?: number;
  /** Optional number of bolt holes (>= 2). */
  boltCount?: number;
}

export interface RingSectionView { width: number; height: number; padding: number; }

export interface RingSectionGeometry {
  /** Outer circle (+ hole circle) - fill with `fill-rule: evenodd` to paint the ring. */
  ringPath: string;
  /** Outer-diameter dimension line (above the circle, with end ticks). */
  outerDimPath: string;
  /** Inner-diameter dimension line (horizontal through the centre, with end ticks) - only when there is a hole. */
  innerDimPath?: string;
  /** Wall-thickness dimension line (across the right-hand wall). Only when there is a hole. */
  wallDimPath?: string;
  outerLabel: LabelPlacement;
  innerLabel: LabelPlacement;
  wallLabel: LabelPlacement;
  /** Anchor of the auxiliary label under the circle (cross-section area and the like). */
  noteLabel: LabelPlacement;
  cx: number;
  cy: number;
  outerRadiusPx: number;
  innerRadiusPx: number;
  wallPx: number;
  scale: number;
  /** Whether the wall was thinner than the minimum visible width, so the inner circle was shrunk (the outer scale is kept). */
  clamped: boolean;
  viewHeight: number;
  /** Reference circle (referenceDiameterMm) path and radius - only when present. */
  referencePath?: string;
  referenceRadiusPx?: number;
  /** Bolt circle path (for a dashed stroke) and hole markers - only when a bolt pattern is present. The hole radius is display only (the bolt hole diameter is not an input). */
  boltCirclePath?: string;
  boltHoles?: { cx: number; cy: number; r: number }[];
  /** Anchors of the extra label rows in the right-hand gutter (top to bottom) - they continue below the wall and inner-diameter labels. */
  gutterLabels: LabelPlacement[];
}

/** A wall thinner than this looks like one line where two circles overlap (px). */
export const RING_MIN_WALL_PX = 3;
const RING_LABEL_GUTTER = 110;
const RING_TOP_RESERVE = 34;
const RING_BOTTOM_RESERVE = 34;
const RING_DIM_OFFSET = 12;
const RING_TICK = 4;
/** Minimum hole diameter (px) to place the inner-diameter label inside the hole - an assumed label width. */
const RING_INNER_LABEL_MIN_PX = 96;

function circlePath(cx: number, cy: number, r: number): string {
  const f = (n: number): string => n.toFixed(2);
  return `M ${f(cx - r)} ${f(cy)} A ${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)} A ${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;
}

/**
 * Ring section geometry - pure. Outer and inner diameters are drawn on **one scale** so the
 * wall-thickness ratio looks honest. A wall thinner than the minimum visible width keeps the
 * outer diameter and shrinks only the inner circle (clamped) - the labels carry the real values.
 */
export function ringSectionGeometry(input: RingSectionInput, view: RingSectionView): RingSectionGeometry {
  const OD = input.outerDiameterMm > 0 ? input.outerDiameterMm : 1;
  const ID = input.innerDiameterMm > 0 && input.innerDiameterMm < OD ? input.innerDiameterMm : 0;
  const pad = view.padding;
  const availW = Math.max(1, view.width - 2 * pad - RING_LABEL_GUTTER);
  const availH = Math.max(1, view.height - 2 * pad - RING_TOP_RESERVE - RING_BOTTOM_RESERVE);
  const scale = Math.min(availW, availH) / OD;
  const outerRadiusPx = (OD * scale) / 2;
  let innerRadiusPx = (ID * scale) / 2;
  let clamped = false;
  if (ID > 0 && outerRadiusPx - innerRadiusPx < RING_MIN_WALL_PX) {
    innerRadiusPx = Math.max(0, outerRadiusPx - RING_MIN_WALL_PX);
    clamped = true;
  }
  const wallPx = ID > 0 ? outerRadiusPx - innerRadiusPx : outerRadiusPx;

  const cx = pad + availW / 2;
  const cy = pad + RING_TOP_RESERVE + outerRadiusPx;
  const f = (n: number): string => n.toFixed(2);

  const ringPath = ID > 0 ? `${circlePath(cx, cy, outerRadiusPx)} ${circlePath(cx, cy, innerRadiusPx)}` : circlePath(cx, cy, outerRadiusPx);

  const dimY = cy - outerRadiusPx - RING_DIM_OFFSET;
  const hDim = (x0: number, x1: number, y: number): string =>
    `M ${f(x0)} ${f(y)} L ${f(x1)} ${f(y)} M ${f(x0)} ${f(y - RING_TICK)} L ${f(x0)} ${f(y + RING_TICK)} M ${f(x1)} ${f(y - RING_TICK)} L ${f(x1)} ${f(y + RING_TICK)}`;
  const outerDimPath = hDim(cx - outerRadiusPx, cx + outerRadiusPx, dimY);
  const innerDimPath = ID > 0 ? hDim(cx - innerRadiusPx, cx + innerRadiusPx, cy) : undefined;
  const wallDimPath = ID > 0 ? hDim(cx + innerRadiusPx, cx + outerRadiusPx, cy) : undefined;

  const outerLabel: LabelPlacement = { x: cx, y: dimY - 8, anchor: 'middle' };
  const gutterX = cx + outerRadiusPx + 10;
  const wallLabel: LabelPlacement = { x: gutterX, y: cy + 4, anchor: 'start' };
  const innerFits = 2 * innerRadiusPx >= RING_INNER_LABEL_MIN_PX;
  const innerLabel: LabelPlacement = innerFits
    ? { x: cx, y: cy - 8, anchor: 'middle' }
    : { x: gutterX, y: cy + 22, anchor: 'start' };
  const noteLabel: LabelPlacement = { x: cx, y: cy + outerRadiusPx + 22, anchor: 'middle' };
  const viewHeight = Math.min(view.height, noteLabel.y + pad / 2);

  let referencePath: string | undefined;
  let referenceRadiusPx: number | undefined;
  if (input.referenceDiameterMm != null && input.referenceDiameterMm > 0 && input.referenceDiameterMm < OD) {
    referenceRadiusPx = (input.referenceDiameterMm * scale) / 2;
    referencePath = circlePath(cx, cy, referenceRadiusPx);
  }

  let boltCirclePath: string | undefined;
  let boltHoles: { cx: number; cy: number; r: number }[] | undefined;
  const n = input.boltCount != null ? Math.round(input.boltCount) : 0;
  const bcd = input.boltCircleDiameterMm ?? 0;
  if (n >= 2 && bcd > 0 && bcd < OD) {
    const rBC = (bcd * scale) / 2;
    boltCirclePath = circlePath(cx, cy, rBC);
    // Display-only hole radius: 30% of the chord between neighbouring hole centres, 45% of the margin between the bolt circle and the outer edge, at most 7px - so holes overlap neither each other nor the edge.
    const chord = 2 * rBC * Math.sin(Math.PI / n);
    const r = Math.max(1.5, Math.min(7, chord * 0.3, (outerRadiusPx - rBC) * 0.45));
    // Flange convention: holes straddle the centrelines (the first hole is rotated by half a pitch).
    const step = 360 / n;
    boltHoles = Array.from({ length: n }, (_, i) => {
      const p = polarPoint(cx, cy, rBC, 90 + step / 2 + i * step);
      return { cx: p.x, cy: p.y, r };
    });
  }

  // Gutter label rows: with a hole they start below the wall (cy+4) and inner-diameter (cy+22) labels; a solid disc starts at cy+4. 18px apart.
  const firstGutterY = hasHoleRow(ID, innerFits) ? cy + 40 : ID > 0 ? cy + 22 : cy + 4;
  const gutterLabels: LabelPlacement[] = [0, 1, 2, 3].map(i => ({ x: gutterX, y: firstGutterY + i * 18, anchor: 'start' as const }));

  return {
    ringPath, outerDimPath, innerDimPath, wallDimPath,
    outerLabel, innerLabel, wallLabel, noteLabel,
    cx, cy, outerRadiusPx, innerRadiusPx, wallPx, scale, clamped, viewHeight,
    referencePath, referenceRadiusPx, boltCirclePath, boltHoles, gutterLabels,
  };
}

/** Whether the inner-diameter label takes the second gutter row (cy+22) - when there is a hole and the label does not fit inside it. */
function hasHoleRow(innerDiameterMm: number, innerFits: boolean): boolean {
  return innerDiameterMm > 0 && !innerFits;
}
