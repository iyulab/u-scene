/**
 * Label placement for the angle diagram: ray labels and the delta label around a protractor.
 * Pure functions. They place texts on screen; they never derive domain values.
 */
import { boxesOverlap, clampAnchoredX, polarPoint } from '../core/geometry.js';
import type { LabelAnchor, LabelBox, LabelPlacement, Point } from '../core/geometry.js';

export interface RayLabelView {
  cx: number;
  cy: number;
  r: number;
  width: number;
  height: number;
}

/** Lower bound of the supported ray angle domain (degrees). */
export const RAY_ANGLE_MIN_DEG = 0;

/**
 * Upper bound of the supported ray angle domain (degrees): 210.
 *
 * Rays are supported from 0 to 210 degrees. A ray beyond 210 degrees cannot be given the
 * label-placement guarantees (no overlap, inside the viewBox), so `assertInAngleDomain`
 * throws for it. A host that can produce such values must omit the diagram before calling.
 *
 * Why "accept every angle" is not an achievable goal: some inputs have no upper bound. For
 * example, a bend whose overbend angle diverges as its elastic-recovery factor approaches zero
 * (a thin sheet with a very large radius) can produce hundreds of degrees. A finite viewBox
 * cannot hold the whole domain, so the decision is where to draw the line and to fail
 * explicitly beyond it.
 *
 * Why 210: it covers realistic overbend angles near 190 degrees with about 20 degrees of
 * margin, and deliberately stops short of the extreme-ratio region that cannot be drawn
 * honestly in a finite viewBox.
 *
 * Out-of-domain angles are never clamped silently: `rayLabelPlacements` and
 * `deltaLabelPosition` throw a RangeError. A silent clamp was the root cause of a real bug:
 * the ray line was drawn at its true angle while its label was clamped to the boundary and
 * detached from its ray.
 */
export const RAY_ANGLE_MAX_DEG = 210;

/**
 * Default protractor viewport (viewBox="0 0 340 300", angles 0-210 degrees). It is the single
 * source of truth so the preset and the tests share one coordinate system.
 *
 * height=300 is proven for the 0-210 degree domain. sin is maximal at 90 degrees (+1) and
 * minimal at 210 degrees (-0.5), so the extremes of the base label y
 * (cy - baseRadius*sin(angle) - NUDGE) occur at those two angles:
 *
 * - Lowest extreme at 210 degrees: base y = cy - 124*(-0.5) - 4 = cy + 58
 *   (baseRadius = R(110) + RAY_LABEL_RADIUS_OFFSET(14) = 124). With
 *   RAY_LABEL_GUARANTEED_RAY_COUNT(3) the worst case is k=2, so ranks up to 4 are tried and
 *   the largest descent (rank 3) is +38. The label y is at most cy+96, and the box bottom
 *   (+DESCENT 4) at most cy+100 = 290 for cy=190.
 * - Highest extreme at 90 degrees: base y = cy - 124 - 4 = cy-128, the largest ascent
 *   (rank 4) is -38 and the box top (-ASCENT 12) adds 12: cy-178 = 12 for cy=190.
 *
 * Both extremes follow from the constants above, not from observation (they are also
 * re-checked by exhaustive sweeps in the tests). The horizontal extreme is at 180 degrees
 * (cos=-1) and is unaffected by the domain extension.
 */
export const RAY_VIEW: RayLabelView = { cx: 170, cy: 190, r: 110, width: 340, height: 300 };

/** Default clearance radius between a ray tip (radius r) and its label anchor. */
const RAY_LABEL_RADIUS_OFFSET = 14;
/** Small vertical nudge that lifts a label off the ray line / baseline. */
const RAY_LABEL_VERTICAL_NUDGE = 4;
/** Within this many degrees of 90 the layout is left/right symmetric, so 'middle' anchors are used. */
const RAY_LABEL_CENTER_ZONE_DEG = 6;

/**
 * Typical label width assumption (11px font; an English label such as "Overbend 102.2 deg"
 * measures about 85-90px). It is used for the first overlap check that decides WHETHER to
 * stagger. Inflating it would stagger cases that do not actually overlap (such as [30,150])
 * and make the diagram untidy; de-collision must stay quiet when it is not needed.
 *
 * Exact durability range: the vertical separation of RAY_LABEL_STEP is safe regardless of
 * the width assumption, but only once a stagger has been triggered (two boxes separated
 * vertically by a box height cannot overlap however much they overlap in x). The initial
 * decision whether to stagger still uses this 90px value. If real labels are much wider
 * (German at 90-120px, worst-case design 170px) and two labels grow toward each other from
 * opposite sides (a symmetric far pair such as [30,150]), they can in theory overlap. That
 * is accepted as harmless interior crowding: the real concern is clipping at the viewport
 * edge, which RAY_LABEL_WORST_CASE_WIDTH and clampAnchoredX prevent separately. Raising the
 * assumption to 170 was considered and rejected: in a 340px viewport two worst-case labels
 * always overlap for any angle pair, which would break the "no stagger for [30,150]"
 * requirement and endanger the three-ray in-viewBox guarantee.
 */
export const RAY_LABEL_ASSUMED_WIDTH = 90;
/**
 * Worst-case label width, used ONLY for clamping into the viewport (clampAnchoredX), never
 * for the overlap decision. Translated labels can be 1.3-2x longer than English, so twice
 * the typical English width (170px) is assumed. Longer labels may still crowd the interior,
 * but they are never cut off by the viewBox.
 */
export const RAY_LABEL_WORST_CASE_WIDTH = 170;
/** Assumed height above the baseline (measured ascent is about 11.7px at 11px/600 weight; 12 leaves margin). */
export const RAY_LABEL_ASSUMED_ASCENT = 12;
/** Assumed height below the baseline (measured about 3px plus margin). */
export const RAY_LABEL_ASSUMED_DESCENT = 4;
/** Minimum visual gap between vertically stacked labels (pixels). */
const RAY_LABEL_VERTICAL_GAP = 3;
/** Vertical move of one de-collision step: the box height (ascent + descent) plus a gap.
 *  Separating by at least this much y breaks any box overlap regardless of width, because
 *  an AABB overlap needs both x and y to overlap. This holds only after a stagger has been
 *  triggered (see RAY_LABEL_ASSUMED_WIDTH). Unlike widening the radius, it does not depend
 *  on sin(angle), so it works at every angle.
 */
const RAY_LABEL_STEP = RAY_LABEL_ASSUMED_ASCENT + RAY_LABEL_ASSUMED_DESCENT + RAY_LABEL_VERTICAL_GAP;

/** Up to this many rays are guaranteed (by the tests) to be placed without overlap and
 *  without leaving the viewBox. De-collision itself works for any count (pigeonhole
 *  argument, see rayLabelPlacements), but the top/bottom room of RAY_VIEW is tuned for this
 *  count. If clusters of 4+ rays enter real use, grow RAY_VIEW.cy/r/height together and
 *  re-verify.
 */
export const RAY_LABEL_GUARANTEED_RAY_COUNT = 3;

/** Floating-point tolerance for the [RAY_ANGLE_MIN_DEG, RAY_ANGLE_MAX_DEG] boundary. It
 *  absorbs rounding residue on the exact boundary (for example 210.00000000001), not real
 *  out-of-domain values: assertInAngleDomain throws beyond it, so the clamp that follows
 *  only tidies residue of values already verified to be inside the domain. */
const ANGLE_DOMAIN_EPS = 1e-6;

/** Fails loudly (throws) when angleDeg is outside the supported domain. Callers whose
 *  values can exceed RAY_ANGLE_MAX_DEG must decide to skip the diagram before calling. */
function assertInAngleDomain(angleDeg: number, context: string): void {
  if (angleDeg < RAY_ANGLE_MIN_DEG - ANGLE_DOMAIN_EPS || angleDeg > RAY_ANGLE_MAX_DEG + ANGLE_DOMAIN_EPS) {
    throw new RangeError(
      `${context}: angle ${angleDeg}° is outside the supported domain ` +
        `[RAY_ANGLE_MIN_DEG, RAY_ANGLE_MAX_DEG] = [${RAY_ANGLE_MIN_DEG}, ${RAY_ANGLE_MAX_DEG}]°. ` +
        `Both bounds are exported from @iyulab/u-scene/engineering (see the README Rules): ` +
        `check an angle against them and omit the diagram instead of passing it.`
    );
  }
}

/** Clamp that only tidies floating-point boundary residue of values that passed assertInAngleDomain. */
function clampToAngleDomain(angleDeg: number): number {
  return Math.min(RAY_ANGLE_MAX_DEG, Math.max(RAY_ANGLE_MIN_DEG, angleDeg));
}

/** Rebuilds the rectangle a placement occupies from its anchor plus width and height. When
 *  width is omitted the typical width used for the overlap decision (RAY_LABEL_ASSUMED_WIDTH)
 *  applies. A caller registering a fixed text elsewhere (such as a baseline label) as an
 *  obstacle can pass RAY_LABEL_WORST_CASE_WIDTH to be conservative. */
export function rayLabelBox(p: LabelPlacement, width: number = RAY_LABEL_ASSUMED_WIDTH): LabelBox {
  const left = p.anchor === 'start' ? p.x : p.anchor === 'end' ? p.x - width : p.x - width / 2;
  return {
    left,
    right: left + width,
    top: p.y - RAY_LABEL_ASSUMED_ASCENT,
    bottom: p.y + RAY_LABEL_ASSUMED_DESCENT,
  };
}

/** Picks the anchor so a label always grows toward the center (inward) - the core of clipping prevention. */
function rayLabelAnchor(angleDeg: number): LabelAnchor {
  if (Math.abs(angleDeg - 90) <= RAY_LABEL_CENTER_ZONE_DEG) return 'middle';
  return angleDeg < 90 ? 'end' : 'start';
}

interface RayLabelBase {
  x: number;
  y: number;
  anchor: LabelAnchor;
}

function rayLabelBase(cx: number, cy: number, angleDeg: number, baseRadius: number, viewWidth: number): RayLabelBase {
  const anchor = rayLabelAnchor(angleDeg);
  const p = polarPoint(cx, cy, baseRadius, angleDeg);
  const x = clampAnchoredX(p.x, anchor, RAY_LABEL_WORST_CASE_WIDTH, viewWidth);
  return { x, y: p.y - RAY_LABEL_VERTICAL_NUDGE, anchor };
}

/** Turns a rank (0, 1, 2, 3, ...) into a vertical offset from the base y. Around the base
 *  (rank 0) it widens outward alternately: down (+1 step), up (-1 step), down (+2), up (-2)...
 *  Collecting ranks 0..2m gives {-19m, ..., -19, 0, 19, ..., 19m}: an arithmetic grid with
 *  STEP (19px) spacing. The pigeonhole bound on maxRank below relies on this grid property
 *  (dyForRank by itself does NOT guarantee that one placed box forbids at most one grid
 *  point - that mistake was a real bug, see rayLabelPlacements). */
function dyForRank(rank: number): number {
  if (rank === 0) return 0;
  const step = Math.ceil(rank / 2);
  const sign = rank % 2 === 1 ? 1 : -1;
  return sign * step * RAY_LABEL_STEP;
}

/**
 * Computes the placement (x, y, anchor) of all ray labels at once.
 *
 * Clipping prevention: the anchor point always sits outside radius r (baseRadius = r +
 * offset), while text-anchor is 'end' below 90 degrees (the point is right of center) and
 * 'start' above 90 degrees (left of center) so the text always grows toward the center. x is
 * additionally clamped for a worst-case width (RAY_LABEL_WORST_CASE_WIDTH, clipping
 * prevention only, separate from the de-collision width), so no text leaves the viewBox near
 * 0/180 degrees or near 90 degrees (middle anchor).
 *
 * De-collision is vertical only. An earlier version widened the radius on overlap, aiming at
 * a vertical separation of dy = -sin(theta)*delta-r. That works only near 90 degrees
 * (sin ~ 1); near 0/180 degrees (sin ~ 0) widening the radius moves labels almost entirely
 * along x - the same axis they already grow along - and fails to separate them. This version
 * always moves only y, in units of RAY_LABEL_STEP (label height plus gap), whatever the
 * angle. An AABB overlap needs both x and y to overlap, so a y gap of one box height
 * separates two boxes however much they overlap in x (even if real widths differ from the
 * assumption). Rays are placed one by one in ascending angle order; when the box overlaps an
 * already placed one (reconstructed from the assumed width and height) the rank grows via
 * dyForRank and the check repeats.
 *
 * maxRank bound (pigeonhole; the first version of this bound was wrong). How many grid
 * points (rank 0..N, STEP=19px spacing) can ONE already placed box forbid? That box used a y
 * from its own angle, so nothing aligns it with this ray's candidate grid. Its forbidden
 * interval (placedY - 16, placedY + 16) is 2*(ASCENT+DESCENT) = 32px wide (an overlap needs
 * |dy| < ASCENT+DESCENT = 16). An interval wider than the 19px grid spacing can contain at
 * most 2 grid points in the worst alignment (3 would need 2*19 = 38px > 32px). So k placed
 * boxes forbid at most 2k grid points, and preparing 2k+1 candidates (rank 0..2k) leaves at
 * least one free: maxRank = 2 * (number of already placed boxes), which grows with the
 * input rather than being a hard-coded constant. (The earlier comment "one rank per box" was
 * wrong; 102 triangles such as [46,58,76] produced real overlaps because of it.) Rays that
 * do not overlap are never staggered (for example 30 and 150 degrees): when rank 0 (dy=0)
 * does not overlap, the loop ends immediately.
 *
 * The bound is derived from the grid structure and the overlap inequality, not tuned
 * empirically. Still, in case of floating-point edges or future constant changes: if the
 * box still overlaps after using maxRank (mathematically unreachable), the function throws
 * instead of returning an overlap silently.
 *
 * At least RAY_LABEL_GUARANTEED_RAY_COUNT (3) rays keep this guarantee inside the viewBox;
 * RAY_VIEW is tuned for it and the tests sweep the full triangle domain (a+b+c=180, 1 degree
 * steps, 15,931 cases) plus clusters near 0, 180 and 180-210 degrees.
 *
 * Accepted limitation: the decision whether to stagger uses the typical width (90px), so in
 * languages with much wider labels a far symmetric pair growing toward each other (such as
 * [30,150]) can in theory overlap. This is harmless interior crowding, not viewport
 * clipping, and closing it would break the no-stagger requirement for [30,150] (see
 * RAY_LABEL_ASSUMED_WIDTH).
 *
 * Input contract: every angle must lie in [RAY_ANGLE_MIN_DEG, RAY_ANGLE_MAX_DEG] = [0, 210].
 * Anything else throws a RangeError - never a silent clamp (see RAY_ANGLE_MAX_DEG for the
 * bug a silent clamp caused). The remaining clampToAngleDomain call only tidies
 * floating-point boundary residue of validated values. Duplicate angles are normal input and
 * are separated by the vertical stack.
 *
 * reserved: boxes already occupied by non-ray fixed texts (such as a baseline label). They
 * are treated like already placed boxes, so de-collision avoids them. The pigeonhole
 * argument counts them too (they seed placedBoxes), so the guarantee holds.
 */
export function rayLabelPlacements(angles: number[], view: RayLabelView, reserved: LabelBox[] = []): LabelPlacement[] {
  const { cx, cy, r, width: viewWidth } = view;
  const baseRadius = r + RAY_LABEL_RADIUS_OFFSET;

  angles.forEach(a => assertInAngleDomain(a, 'rayLabelPlacements'));
  const clamped = angles.map(clampToAngleDomain);
  const bases = clamped.map(a => rayLabelBase(cx, cy, a, baseRadius, viewWidth));
  const order = angles.map((_, i) => i).sort((a, b) => clamped[a] - clamped[b]);

  const finalY = new Array<number>(angles.length).fill(0);
  const placedBoxes: LabelBox[] = [...reserved];

  for (const i of order) {
    const base = bases[i];
    let y = base.y;
    let box = rayLabelBox({ x: base.x, y, anchor: base.anchor });
    // maxRank = 2k (k = number of boxes already placed): one box forbids at most 2 grid
    // points, so rank 0..2k (2k+1 candidates) always contains a free one - see the
    // docblock proof. With k=0, maxRank=0, the loop does not run and rank 0 (the base) is taken.
    const maxRank = 2 * placedBoxes.length;
    for (let rank = 1; rank <= maxRank && placedBoxes.some(other => boxesOverlap(box, other)); rank++) {
      y = base.y + dyForRank(rank);
      box = rayLabelBox({ x: base.x, y, anchor: base.anchor });
    }
    if (placedBoxes.some(other => boxesOverlap(box, other))) {
      // Mathematically unreachable (docblock proof). Reaching it means a premise (the
      // STEP/ASCENT/DESCENT relation or the grid property of dyForRank) was broken, so fail
      // loudly instead of silently returning an overlap.
      throw new Error(
        `rayLabelPlacements: ray at angle ${clamped[i]}° could not find a non-overlapping rank ` +
          `within the proven bound (maxRank=${maxRank}, placedBoxes=${placedBoxes.length}). ` +
          `This should be unreachable — the pigeonhole proof in this file's docblock has been violated.`
      );
    }
    finalY[i] = y;
    placedBoxes.push(box);
  }

  return bases.map((base, i) => ({ x: base.x, y: finalY[i], anchor: base.anchor }));
}

/**
 * Computes the position of the delta label (the difference between two angles).
 *
 * The delta label is not a ray, so it is outside the de-collision proof and the RAY_VIEW
 * tuning of rayLabelPlacements - it needs its own system.
 *
 * Discarded earlier approach (pushing the radius out) and its defects: on overlap it
 * retried with a larger radius. Two defects (measured: 280 of 1,565 realistic inputs,
 * 17.9%, overlapped):
 *
 * 1. Push and clamp cancelled each other. Near 0/180 degrees (sin ~ 0) a larger radius moves
 *    the label almost entirely along x (the same cause as the ray-label bug), but the last
 *    line unconditionally ran clampAnchoredX and pulled x back into the viewport, undoing the
 *    x displacement the push had just found - exactly where both bugs live together.
 * 2. The last candidate was returned unverified. If the loop exhausted its tries it
 *    returned the final (still overlapping) candidate, and after the clamp that coordinate
 *    had never been checked at all.
 *
 * Current approach: the same principle as ray labels (vertical-only separation). Radial
 * displacement is a poor proxy for separation because it fails where sin(theta) ~ 0. Boxes
 * are axis aligned, so a purely vertical move of at least the box height (ASCENT+DESCENT)
 * breaks any AABB overlap whatever the x overlap. So this function:
 *   1. computes x ONCE and fixes it with clampAnchoredX (never changed afterwards, so push
 *      and clamp cannot cancel each other),
 *   2. searches only y, with the same dyForRank and STEP as ray labels,
 *   3. validates the final candidate of every rank (x is already fixed) - no path returns
 *      an unverified coordinate.
 *
 * maxRank bound (pigeonhole, as in rayLabelPlacements): every avoid box assumes a height of
 * ASCENT+DESCENT (16px) - this function builds its own box with the same constants
 * (rayLabelBox defaults) - so an overlap reduces to |dy| < 16. The candidate ys form an
 * arithmetic grid with STEP (19px) spacing around base.y. A forbidden interval of 32px
 * (2*16) wider than the spacing can forbid at most 2 grid points in the worst alignment, so
 * k avoid boxes forbid at most 2k points and 2k+1 candidates (rank 0..2k) always leave one:
 * maxRank = 2 * avoid.length. The proof is independent of the x position and width of the
 * avoid boxes (a box that does not overlap in x forbids no grid point at all; 2 is an upper
 * bound).
 *
 * Viewport containment: the realistic caller has avoid.length <= 3 (two rays plus one
 * baseline reservation), so maxRank <= 6 and the largest |dy| is 3*19 = 57px. With a base
 * radius of 84 and the angle contract [0,210], sin is maximal at 90 degrees (+1) and minimal
 * at 210 degrees (-0.5), so base.y lies in [cy-84, cy+42] = [106, 232]. The worst rank move
 * (+57) plus DESCENT (4) gives 293, inside RAY_VIEW.height (300) with 7px to spare. Since
 * the function cannot prove this for callers with avoid.length above 3 or a different
 * baseRadius, a safety net remains: if the candidate found by pigeonhole still leaves the
 * viewport, it is clamped into the viewport once more and the clamped coordinate is
 * re-verified against avoid (clamp is not free - the lesson of the x clamp applied to y).
 * If the re-verification fails (unreachable for avoid.length <= 3) it throws instead of
 * returning an overlap silently.
 *
 * With an empty avoid (or no overlap) the base radius position is returned unchanged.
 * `avoid` boxes are only read; the proven bound of the ray side is not touched.
 *
 * Premise (a codebase invariant not enforced by types): every box in `avoid` is built with
 * rayLabelBox() and so shares RAY_LABEL_ASSUMED_ASCENT/DESCENT heights (ray labels, the
 * reserved baseline label and band labels are all built with this helper). Boxes of another
 * height break the pigeonhole premise.
 */
export function deltaLabelPosition(
  fromDeg: number,
  toDeg: number,
  baseRadius: number,
  avoid: LabelBox[],
  view: Pick<RayLabelView, 'cx' | 'cy' | 'width' | 'height'>,
): Point {
  const { cx, cy, width: viewWidth, height: viewHeight } = view;
  // Same input contract as rayLabelPlacements: fromDeg/toDeg must lie in
  // [RAY_ANGLE_MIN_DEG, RAY_ANGLE_MAX_DEG]; outside throws (no silent clamp). A silent
  // clamp here would make the delta side and the ray side (which no longer clamps) refer to
  // different angles for an overbend angle beyond 180 degrees. The remaining
  // clampToAngleDomain only tidies floating-point residue of validated values.
  assertInAngleDomain(fromDeg, 'deltaLabelPosition(fromDeg)');
  assertInAngleDomain(toDeg, 'deltaLabelPosition(toDeg)');
  const clampedFrom = clampToAngleDomain(fromDeg);
  const clampedTo = clampToAngleDomain(toDeg);
  const midAngle = (clampedFrom + clampedTo) / 2;
  const base = polarPoint(cx, cy, baseRadius, midAngle);
  // x is decided once and never changes afterwards - this rules out push (y search) and
  // clamp cancelling each other (defect 1 in the docblock).
  const x = clampAnchoredX(base.x, 'middle', RAY_LABEL_WORST_CASE_WIDTH, viewWidth);

  let y = base.y;
  let box = rayLabelBox({ x, y, anchor: 'middle' }, RAY_LABEL_ASSUMED_WIDTH);
  // maxRank = 2 * avoid.length: see the pigeonhole proof in the docblock - it grows with the
  // input size (number of avoid boxes), not a hard-coded constant.
  const maxRank = 2 * avoid.length;
  for (let rank = 1; rank <= maxRank && avoid.some(other => boxesOverlap(box, other)); rank++) {
    y = base.y + dyForRank(rank);
    box = rayLabelBox({ x, y, anchor: 'middle' }, RAY_LABEL_ASSUMED_WIDTH);
  }

  const outOfViewport = box.top < 0 || box.bottom > viewHeight;
  if (outOfViewport) {
    // Clamp is not free - the coordinate after the clamp must be verified again (see
    // "Viewport containment" in the docblock). No path returns an unverified coordinate.
    y = Math.min(Math.max(y, RAY_LABEL_ASSUMED_ASCENT), viewHeight - RAY_LABEL_ASSUMED_DESCENT);
    box = rayLabelBox({ x, y, anchor: 'middle' }, RAY_LABEL_ASSUMED_WIDTH);
  }

  if (avoid.some(other => boxesOverlap(box, other))) {
    // Mathematically unreachable in the realistic range (avoid.length <= 3, docblock proof):
    // fail loudly instead of silently returning an overlap.
    throw new Error(
      `deltaLabelPosition: could not find a non-overlapping, in-viewport position ` +
        `within the proven bound (maxRank=${maxRank}, avoid=${avoid.length}). ` +
        `This should be unreachable for avoid.length ≤ 3 — see this file's docblock proof.`
    );
  }

  return { x, y };
}
