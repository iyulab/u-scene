/**
 * Bent-sheet cross-section: a sheet of thickness t bent over an inside radius Ri through a
 * bend angle beta. Pure functions that move already-computed values to screen coordinates;
 * they never derive domain values.
 *
 * Scale fidelity (the core contract): the thickness-to-radius ratio must be drawn honestly -
 * a 0.5 mm sheet bent over a 20 mm radius must show a radius 40 times the thickness. So the
 * mm-to-px conversion applies a single uniform scale to t, Ri and k*t (the ratio is
 * preserved), and the viewport fit is uniform as well. The returned insideRadiusPx,
 * thicknessPx and neutralRadiusPx expose this consistency so tests can assert it directly.
 */
import { clampAnchoredX, polarPoint } from '../core/geometry.js';
import type { LabelPlacement, Point } from '../core/geometry.js';

/** Lower bound of the bend-angle domain (degrees): 0 is a flat sheet. */
export const BEND_ANGLE_MIN_DEG = 0;
/** Upper bound of the bend-angle domain (degrees): 180 is a fully folded sheet. */
export const BEND_ANGLE_MAX_DEG = 180;

export interface BendSectionInput {
  /** Sheet thickness (mm). */
  thicknessMm: number;
  /** Inside bend radius (mm). */
  insideRadiusMm: number;
  /** Bend angle (degrees) - the angle the material turns through (90 = a right-angle bend). [0, 180]. */
  bendAngleDeg: number;
  /**
   * Neutral-axis position factor (0-1): k*t outward from the inside surface. Optional: without it
   * there is no neutral axis — `neutralPath`, `neutralLabel` and `neutralRadiusPx` are null, and no
   * stand-in value is used for them.
   */
  kFactor?: number;
  /**
   * Lower and upper bounds of the neutral-axis uncertainty band (0-1, same scale as
   * `kFactor`). The band is drawn only when **both** are present: a range that was not
   * computed is never invented around a single value. A band without `kFactor` is a supported
   * model — the range is drawn, with no centre line inside it.
   */
  kFactorMin?: number;
  kFactorMax?: number;
}

export interface BendSectionView {
  width: number;
  height: number;
  /** Minimum margin between the figure and the viewport edge (px), room for the labels to grow. */
  padding: number;
}

export interface BendSectionGeometry {
  /** Closed outline of the material band (fill). */
  materialPath: string;
  /** Neutral axis (dashed): left flange extension, neutral arc, right flange extension. Null without `kFactor`. */
  neutralPath: string | null;
  /**
   * Closed outline of the neutral-axis uncertainty band (fill). Filled only when both
   * `kFactorMin` and `kFactorMax` were given; otherwise an empty string and the renderer
   * skips it.
   */
  neutralBandPath: string;
  /** Small arc around O that marks the bend angle. */
  angleArcPath: string;
  /** Two thin helper radii from O to the tangent points (the angle's boundaries). */
  angleRadii: [string, string];
  /** Thickness dimension line at the end of the right flange. */
  thicknessTick: string;
  /** Radius dimension line from O to the inside apex. */
  radiusTick: string;
  thicknessLabel: LabelPlacement;
  radiusLabel: LabelPlacement;
  angleLabel: LabelPlacement;
  /** Null without `kFactor`. */
  neutralLabel: LabelPlacement | null;
  /** Scale-consistency fields, exposed for tests and regression protection. */
  scale: number;
  insideRadiusPx: number;
  thicknessPx: number;
  /** Null without `kFactor`. */
  neutralRadiusPx: number | null;
}

/** Reference radius from the centre of curvature to the outer surface (px, before fit). The real size is re-scaled uniformly by the fit. */
const BEND_OUTER_R_BASE = 64;
/** Flange (leg) length (px, before fit) - schematic, so no dimension label is attached (scale-independent). */
const BEND_FLANGE_LEN = 60;
/** Minimum radius of the bend-angle arc (px), so the angle stays readable for a very small Ri. */
const BEND_ANGLE_ARC_MIN = 15;
/** Clearance between a label anchor and the figure (px). */
const BEND_LABEL_GAP = 13;

function bendClampAngle(deg: number): number {
  return Math.min(BEND_ANGLE_MAX_DEG, Math.max(BEND_ANGLE_MIN_DEG, deg));
}

/**
 * Bent-sheet cross-section geometry - pure. Places O (the centre of curvature) at the origin,
 * computes every point in raw px, then fits their bounding box to the viewport with a uniform
 * scale (ratio preserved). Label anchors are fixed at the geometric position of each dimension
 * (they do not cluster the way ray labels do, so no de-collision engine is needed).
 */
export function bendSectionGeometry(input: BendSectionInput, view: BendSectionView): BendSectionGeometry {
  const beta = bendClampAngle(input.bendAngleDeg);
  const t = Math.max(0, input.thicknessMm);
  const ri = Math.max(0, input.insideRadiusMm);
  const hasNeutral = input.kFactor != null;
  const k = hasNeutral ? Math.min(1, Math.max(0, input.kFactor!)) : 0; // read only when hasNeutral

  // ── raw radii (O at the origin, before fit). One scale, sBase, preserves the ratio ──
  const denom = ri + t || 1; // guards the degenerate all-zero input (the figure is empty but nothing throws)
  const sBase = BEND_OUTER_R_BASE / denom;
  const riPx = sBase * ri;
  const tPx = sBase * t;
  const roPx = riPx + tPx; // = BEND_OUTER_R_BASE
  const rnPx = riPx + k * tPx;
  // The band exists only when both kFactorMin and kFactorMax are given; clamped like kFactor ([0, 1]).
  const hasBand = input.kFactorMin != null && input.kFactorMax != null;
  const kMin = hasBand ? Math.min(1, Math.max(0, input.kFactorMin!)) : 0; // read only when hasBand
  const kMax = hasBand ? Math.min(1, Math.max(0, input.kFactorMax!)) : 0;
  const rnPxMin = riPx + kMin * tPx;
  const rnPxMax = riPx + kMax * tPx;

  // ── tangent-point angles (math convention, symmetric about the downward bisector at -90 degrees) ──
  const thetaR = -90 + beta / 2;
  const thetaL = -90 - beta / 2;
  const rR = (thetaR * Math.PI) / 180;
  const rL = (thetaL * Math.PI) / 180;

  // Unit direction of the tangent (flange) - the tangent of a point on the circle in the
  // direction of increasing theta. The right side uses +theta, the left side -theta.
  const dR: Point = { x: -Math.sin(rR), y: -Math.cos(rR) };
  const dL: Point = { x: Math.sin(rL), y: Math.cos(rL) };

  const at = (r: number, deg: number): Point => polarPoint(0, 0, r, deg); // raw point, O at the origin
  const along = (p: Point, d: Point, len: number): Point => ({ x: p.x + d.x * len, y: p.y + d.y * len });

  // tangent points (inside, outside, neutral)
  const priIn = at(riPx, thetaR), proOut = at(roPx, thetaR), prN = at(rnPx, thetaR);
  const pliIn = at(riPx, thetaL), ploOut = at(roPx, thetaL), plN = at(rnPx, thetaL);
  // flange ends
  const riTip = along(priIn, dR, BEND_FLANGE_LEN), roTip = along(proOut, dR, BEND_FLANGE_LEN);
  const liTip = along(pliIn, dL, BEND_FLANGE_LEN), loTip = along(ploOut, dL, BEND_FLANGE_LEN);
  const rnTip = along(prN, dR, BEND_FLANGE_LEN), lnTip = along(plN, dL, BEND_FLANGE_LEN);
  // band tangent points and flange ends (lower and upper bound); without a band they are not read.
  const prNMin = at(rnPxMin, thetaR), plNMin = at(rnPxMin, thetaL);
  const prNMax = at(rnPxMax, thetaR), plNMax = at(rnPxMax, thetaL);
  const rnTipMin = along(prNMin, dR, BEND_FLANGE_LEN), lnTipMin = along(plNMin, dL, BEND_FLANGE_LEN);
  const rnTipMax = along(prNMax, dR, BEND_FLANGE_LEN), lnTipMax = along(plNMax, dL, BEND_FLANGE_LEN);
  // inside apex (target of the radius dimension) and the angle arc
  const apex = at(riPx, -90);
  const arcR = Math.max(BEND_ANGLE_ARC_MIN, riPx * 0.45);
  const arcL = at(arcR, thetaL), arcRp = at(arcR, thetaR);
  const O: Point = { x: 0, y: 0 };

  // ── bounding box -> uniform fit to the viewport ──
  const all: Point[] = [
    proOut, ploOut, priIn, pliIn, roTip, riTip, loTip, liTip, apex, O, arcL, arcRp,
    ...(hasNeutral ? [rnTip, lnTip] : []),
    ...(hasBand ? [rnTipMin, lnTipMin, rnTipMax, lnTipMax] : []),
  ];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of all) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const bw = maxX - minX || 1, bh = maxY - minY || 1;
  const pad = view.padding;
  const fit = Math.min((view.width - 2 * pad) / bw, (view.height - 2 * pad) / bh);
  const bcx = (minX + maxX) / 2, bcy = (minY + maxY) / 2;
  const T = (p: Point): Point => ({
    x: (p.x - bcx) * fit + view.width / 2,
    y: (p.y - bcy) * fit + view.height / 2,
  });
  const c = (p: Point): string => `${T(p).x.toFixed(2)} ${T(p).y.toFixed(2)}`;
  const R = (r: number): number => r * fit; // radius after fit

  // Arc segment (large-arc = 0 since beta <= 180). Sweep: clockwise on screen = 1; increasing theta (thetaL to thetaR) is counter-clockwise = 0.
  const arcSeg = (r: number, sweep: 0 | 1, to: Point): string => `A ${R(r).toFixed(2)} ${R(r).toFixed(2)} 0 0 ${sweep} ${c(to)}`;

  // Material outline: left flange end (outside) -> left outside tangent -> outside arc
  //   -> right outside tangent -> right flange end (outside) -> right flange end (inside)
  //   -> right inside tangent -> inside arc (reversed) -> left inside tangent -> left flange end (inside) -> Z
  const materialPath =
    `M ${c(loTip)} L ${c(ploOut)} ${arcSeg(roPx, 0, proOut)} L ${c(roTip)} ` +
    `L ${c(riTip)} L ${c(priIn)} ${arcSeg(riPx, 1, pliIn)} L ${c(liTip)} Z`;

  // Neutral axis (dashed): left extension -> neutral arc -> right extension
  const neutralPath = hasNeutral ? `M ${c(lnTip)} L ${c(plN)} ${arcSeg(rnPx, 0, prN)} L ${c(rnTip)}` : null;

  // Neutral-axis band (fill): the same out-and-back construction as materialPath - follow the
  // lower-bound arc, jump to the upper bound at the right flange, then retrace the upper-bound
  // arc in the opposite direction (sweep flipped) and close.
  const neutralBandPath = hasBand
    ? `M ${c(lnTipMin)} L ${c(plNMin)} ${arcSeg(rnPxMin, 0, prNMin)} L ${c(rnTipMin)} ` +
      `L ${c(rnTipMax)} L ${c(prNMax)} ${arcSeg(rnPxMax, 1, plNMax)} L ${c(lnTipMax)} Z`
    : '';

  // bend-angle arc and helper radii
  const angleArcPath = `M ${c(arcL)} ${arcSeg(arcR, 0, arcRp)}`;
  const angleRadii: [string, string] = [`M ${c(O)} L ${c(pliIn)}`, `M ${c(O)} L ${c(priIn)}`];

  // thickness dimension line (at the right flange end) and radius dimension line (O to apex)
  const thicknessTick = `M ${c(riTip)} L ${c(roTip)}`;
  const radiusTick = `M ${c(O)} L ${c(apex)}`;

  // ── label anchors (fixed at the geometric position of each dimension) ──
  // The thickness and neutral-axis labels sit in the free margin **above** the flange ends
  // (the space above a flange is always empty). Pushing them outward past the end made the
  // right label overflow the viewport and the left label overlap the material outline
  // (observed). Their x is confined to the viewport by clampAnchoredX so that a short symbol
  // label (about 64 px) is never clipped.
  const BEND_LABEL_RESERVE = 64;
  const clampMid = (x: number): number => clampAnchoredX(x, 'middle', BEND_LABEL_RESERVE, view.width);
  const thicknessLabel: LabelPlacement = { x: clampMid(T(roTip).x), y: T(roTip).y - BEND_LABEL_GAP, anchor: 'middle' };
  const neutralLabel: LabelPlacement | null = hasNeutral ? { x: clampMid(T(lnTip).x), y: T(lnTip).y - BEND_LABEL_GAP, anchor: 'middle' } : null;
  const rMid: Point = { x: apex.x / 2, y: apex.y / 2 };
  const radiusLabel: LabelPlacement = { x: T(rMid).x - BEND_LABEL_GAP, y: T(rMid).y, anchor: 'end' };
  const angleLabel: LabelPlacement = { ...T(at(arcR + BEND_LABEL_GAP / fit, -90)), anchor: 'middle' };

  return {
    materialPath, neutralPath, neutralBandPath, angleArcPath, angleRadii, thicknessTick, radiusTick,
    thicknessLabel, radiusLabel, angleLabel, neutralLabel,
    scale: sBase * fit, insideRadiusPx: R(riPx), thicknessPx: R(tPx), neutralRadiusPx: hasNeutral ? R(rnPx) : null,
  };
}
