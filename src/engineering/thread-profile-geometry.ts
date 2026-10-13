/**
 * Thread-profile detail: a few thread periods drawn large, with the major, minor and pitch
 * diameters as labelled horizontal reference lines. Pure functions that move already-computed
 * values to screen coordinates; they never derive domain values.
 */
import type { LabelPlacement, Point } from '../core/geometry.js';

export interface ThreadProfileInput {
  /** Axial thread period (mm). */
  pitchMm: number;
  /** Included thread angle (degrees) - 60 (metric/unified), 55 (Whitworth), 29 (ACME), 30 (trapezoidal). */
  threadAngleDeg: number;
  /** Major diameter (mm); the crest radius is major / 2. Required. */
  majorDiameterMm: number;
  /** Minor diameter (mm), the root reference line. **Optional.** Without it the apex of the fundamental triangle is drawn as the root. */
  minorDiameterMm?: number;
  /** Pitch diameter (mm), the effective-diameter reference line. **Optional.** */
  pitchDiameterMm?: number;
  /** Wire diameter (mm) for the three-wire layer. **Optional.** */
  wireDiameterMm?: number;
}

export interface ThreadProfileView { width: number; height: number; padding: number; }

export interface ThreadProfileGeometry {
  /** Single tooth strip (crest above, root below). Not mirrored. */
  profilePath: string;
  /** Horizontal reference line at the major diameter (crest). */
  crestLine: string;
  /** Horizontal reference line at the minor diameter (root) - only when a minor diameter is given. */
  rootLine?: string;
  /** Horizontal reference line at the pitch diameter - only when a pitch diameter is given. */
  pitchLine?: string;
  /** Pitch P dimension line (root to root, below the teeth). */
  pitchDimPath: string;
  /** Small arc for the thread angle (the included V angle of one crest). */
  angleArcPath: string;
  /** Wire circles seated in the grooves - only when a wire diameter is given. */
  wires?: { cx: number; cy: number; r: number }[];
  /** Over-wires M reference line (horizontal tangent at the top of the wires) - only with wires. */
  overWiresLine?: string;
  /** Label anchors. */
  majorLabel: LabelPlacement;
  minorLabel?: LabelPlacement;
  pitchDiaLabel?: LabelPlacement;
  pitchLabel: LabelPlacement;
  angleLabel: LabelPlacement;
  overWiresLabel?: LabelPlacement;
  /** Verification fields. */
  scale: number;
  pitchPx: number;
  /** Thread height (crest to root) in px, after fit. Scale invariant: pitchPx / threadHeightPx == P / hMm. */
  threadHeightPx: number;
  wireRadiusPx?: number;
  /** Depth in px from the wire centre to the groove's virtual apex. wireSeatDepthPx * sin(alpha) = wireRadiusPx (tangency). */
  wireSeatDepthPx?: number;
}

/** Number of thread periods drawn (fixed, schematic). */
export const PROFILE_PERIODS = 3;
/** Minimum vertical gap between labels (px), to de-collide nearby reference-line labels. It is
 *  the height of an 11 px label box (about 15 px) plus some breathing room. At 15 px (exactly
 *  the height) the labels touched and, depending on browser font rendering, were judged to
 *  overlap when re-verified in a browser; 19 gives a visible separation. */
const THREAD_LABEL_MIN_GAP = 19;
const THREAD_LABEL_GAP = 10;
/** Right-hand gutter for the reference-line labels (px): the teeth are fitted this much
 *  further left so the labels do not sit on top of them. */
const THREAD_LABEL_GUTTER = 80;

/**
 * Thread-form detail geometry - pure. Instead of a full-diameter section (which, with a major
 * diameter far larger than the pitch, drew as two thin tooth bands around an empty middle),
 * it draws a few teeth large and expresses the major, minor and pitch diameters as labelled
 * horizontal reference lines. A **single scale** is applied to both axes (pitch and thread
 * height, i.e. crest to root) so the thread angle looks honest. The minor and pitch-diameter
 * reference lines are drawn only when the input carries that value (nothing is invented).
 */
export function threadProfileGeometry(input: ThreadProfileInput, view: ThreadProfileView): ThreadProfileGeometry {
  const P = Math.max(0, input.pitchMm);
  const angle = Math.min(179, Math.max(1, input.threadAngleDeg));
  const alpha = ((angle / 2) * Math.PI) / 180;
  const tanA = Math.tan(alpha);
  const sinA = Math.sin(alpha);
  const majorD = Math.max(0, input.majorDiameterMm);

  // ── thread height (radial crest-to-root difference, mm): the real value with a minor diameter, otherwise the fundamental triangle ──
  const hMm = input.minorDiameterMm != null
    ? Math.max(0, (majorD - input.minorDiameterMm) / 2)
    : (tanA > 0 ? (P / 2) / tanA : 0);
  // radial depth of the pitch line below the crest (mm) - only when given
  const pitchDepthMm = input.pitchDiameterMm != null ? (majorD - input.pitchDiameterMm) / 2 : undefined;

  // ── raw points in mm space (y up, root at y = 0, crest at y = hMm); a single fit is applied at the end ──
  const f = hMm * tanA;                        // axial run of a flank
  const flat = Math.max(0, (P - 2 * f) / 2);   // crest flat and root flat, each
  const pts: Point[] = [];
  for (let i = 0; i < PROFILE_PERIODS; i++) {
    const x = i * P;
    pts.push({ x, y: hMm });
    pts.push({ x: x + flat, y: hMm });
    pts.push({ x: x + flat + f, y: 0 });
    pts.push({ x: x + flat + f + flat, y: 0 });
  }
  pts.push({ x: PROFILE_PERIODS * P, y: hMm });
  const width = PROFILE_PERIODS * P || 1;

  // ── wire (optional): the groove's virtual apex is (rootFlat / 2) / tanA below the root; the wire centre is apex + rw / sinA ──
  let wireCenterY: number | undefined, rwMm = 0, wireTopY: number | undefined;
  if (input.wireDiameterMm != null && input.wireDiameterMm > 0 && P > 0) {
    rwMm = input.wireDiameterMm / 2;
    const apexY = 0 - (flat / 2) / (tanA || 1);
    wireCenterY = apexY + rwMm / (sinA || 1);
    wireTopY = wireCenterY + rwMm;
  }

  // ── y of the P dimension line (below the root) and of the thread-angle apex (above the crest) ──
  const pDimY = 0 - Math.max(hMm * 0.25, P * 0.15);         // below the root
  const angleApexY = hMm + (flat / 2) / (tanA || 1);        // virtual apex above the crest

  // ── bounding box (all elements) -> uniform fit to the viewport ──
  const ys = [0, hMm, pDimY, angleApexY];
  if (wireTopY != null) ys.push(wireTopY, wireCenterY! - rwMm);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const minX = 0, maxX = width;
  const bw = maxX - minX || 1, bh = maxY - minY || 1;
  const pad = view.padding;
  const fitW = view.width - 2 * pad - THREAD_LABEL_GUTTER;
  const fit = Math.min(fitW / bw, (view.height - 2 * pad) / bh);
  const bcx = (minX + maxX) / 2, bcy = (minY + maxY) / 2;
  const toothCenterX = pad + fitW / 2;
  const Tx = (x: number): number => (x - bcx) * fit + toothCenterX;
  const Ty = (y: number): number => (-y - (-(bcy))) * fit + view.height / 2; // y up to screen, centred
  const c = (p: Point): string => `${Tx(p.x).toFixed(2)} ${Ty(p.y).toFixed(2)}`;
  const R = (r: number): number => r * fit;
  const hLine = (yRaw: number): string => `M ${Tx(0).toFixed(2)} ${Ty(yRaw).toFixed(2)} L ${(view.width - pad).toFixed(2)} ${Ty(yRaw).toFixed(2)}`;

  const profilePath = 'M ' + pts.map(c).join(' L ');
  const crestLine = hLine(hMm);
  const rootLine = input.minorDiameterMm != null ? hLine(0) : undefined;
  const pitchLine = pitchDepthMm != null ? hLine(hMm - pitchDepthMm) : undefined;

  // pitch dimension line (root to root, one period)
  const pdY = Ty(pDimY);
  const pitchDimPath = `M ${Tx(0).toFixed(2)} ${pdY.toFixed(2)} L ${Tx(P).toFixed(2)} ${pdY.toFixed(2)}`;

  // thread-angle arc (on the crest of the middle tooth)
  const toothCx = PROFILE_PERIODS > 1 ? P + flat / 2 : flat / 2;
  const arcR = 15;
  const ax = Tx(toothCx), ay = Ty(angleApexY);
  const angleArcPath = `M ${(ax - arcR * Math.sin(alpha)).toFixed(2)} ${(ay + arcR * Math.cos(alpha)).toFixed(2)} A ${arcR} ${arcR} 0 0 1 ${(ax + arcR * Math.sin(alpha)).toFixed(2)} ${(ay + arcR * Math.cos(alpha)).toFixed(2)}`;

  // wires and the M reference line
  let wires: { cx: number; cy: number; r: number }[] | undefined;
  let overWiresLine: string | undefined, overWiresLabel: LabelPlacement | undefined;
  let wireRadiusPx: number | undefined, wireSeatDepthPx: number | undefined;
  if (wireCenterY != null) {
    const grooveCx = (i: number): number => i * P + flat + f + flat / 2;
    wires = [0, 1, 2].map(i => ({ cx: Tx(grooveCx(i)), cy: Ty(wireCenterY!), r: R(rwMm) }));
    overWiresLine = hLine(wireTopY!);
    wireRadiusPx = R(rwMm);
    wireSeatDepthPx = (wireCenterY - (0 - (flat / 2) / (tanA || 1))) * fit;
  }

  // ── reference-line labels (right end), de-collided with a minimum vertical gap when close ──
  const rightX = view.width - pad;
  type LbW = { key: string; y: number };
  const wants: LbW[] = [{ key: 'major', y: Ty(hMm) }];
  if (pitchLine) wants.push({ key: 'pitchDia', y: Ty(hMm - pitchDepthMm!) });
  if (rootLine) wants.push({ key: 'minor', y: Ty(0) });
  if (wireTopY != null) wants.push({ key: 'overWires', y: Ty(wireTopY) });
  wants.sort((a, b) => a.y - b.y);
  for (let i = 1; i < wants.length; i++) {
    if (wants[i].y - wants[i - 1].y < THREAD_LABEL_MIN_GAP) wants[i].y = wants[i - 1].y + THREAD_LABEL_MIN_GAP;
  }
  const yOf = (k: string): number => wants.find(w => w.key === k)!.y;
  const majorLabel: LabelPlacement = { x: rightX, y: yOf('major'), anchor: 'end' };
  const minorLabel = rootLine ? { x: rightX, y: yOf('minor'), anchor: 'end' as const } : undefined;
  const pitchDiaLabel = pitchLine ? { x: rightX, y: yOf('pitchDia'), anchor: 'end' as const } : undefined;
  if (wireTopY != null) overWiresLabel = { x: rightX, y: yOf('overWires'), anchor: 'end' };
  const pitchLabel: LabelPlacement = { x: Tx(P / 2), y: pdY + THREAD_LABEL_GAP + 4, anchor: 'middle' };
  const angleLabel: LabelPlacement = { x: ax, y: ay - 4, anchor: 'middle' };

  return {
    profilePath, crestLine, rootLine, pitchLine, pitchDimPath, angleArcPath,
    wires, overWiresLine,
    majorLabel, minorLabel, pitchDiaLabel, pitchLabel, angleLabel, overWiresLabel,
    scale: fit, pitchPx: R(P), threadHeightPx: R(hMm),
    wireRadiusPx, wireSeatDepthPx,
  };
}
