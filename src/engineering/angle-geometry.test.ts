import { describe, it, expect } from 'vitest';
import { polarPoint } from '../core/geometry.js';
import type { LabelPlacement, LabelBox } from '../core/geometry.js';
import { rayLabelPlacements, deltaLabelPosition, RAY_VIEW, RAY_ANGLE_MIN_DEG, RAY_ANGLE_MAX_DEG } from './angle-geometry.js';

describe('rayLabelPlacements', () => {
  // Use the same viewport the preset renders with, so the tests check real coordinates.
  const VIEW = RAY_VIEW;

  // Test-only box geometry, independent of the implementation. The implementation's
  // rayLabelBox() is deliberately not imported: the constants are redeclared here so the
  // implementation cannot grade itself with its own constants (an earlier ascent
  // correction from 8px to 11.7px slipped through exactly that way). A mismatch with the
  // implementation is the signal.
  const TEST_WIDTH = 90; // same value as RAY_LABEL_ASSUMED_WIDTH (the overlap-decision width), stated independently
  const TEST_ASCENT = 12; // same value as RAY_LABEL_ASSUMED_ASCENT, stated independently
  const TEST_DESCENT = 4; // same value as RAY_LABEL_ASSUMED_DESCENT, stated independently
  // Worst-case label width the diagram is designed to survive (long translations): 170px,
  // about twice the measured English width. Changing this to differ from the implementation
  // should fail a test - that shows how conservative the contract is.
  const WORST_CASE_WIDTH = 170;

  interface TestBox {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }

  function testBox(p: LabelPlacement, width = TEST_WIDTH): TestBox {
    const left = p.anchor === 'start' ? p.x : p.anchor === 'end' ? p.x - width : p.x - width / 2;
    return { left, right: left + width, top: p.y - TEST_ASCENT, bottom: p.y + TEST_DESCENT };
  }

  function boxesOverlap(a: TestBox, b: TestBox): boolean {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  }

  function expectInBounds(box: TestBox, note: string): void {
    expect(box.left, `${note} left`).toBeGreaterThanOrEqual(0);
    expect(box.right, `${note} right`).toBeLessThanOrEqual(VIEW.width);
    expect(box.top, `${note} top`).toBeGreaterThanOrEqual(0);
    expect(box.bottom, `${note} bottom`).toBeLessThanOrEqual(VIEW.height);
  }

  /** Checks that no pair of placements overlaps. */
  function expectAllPairsNonOverlapping(placements: LabelPlacement[], label: string, width = TEST_WIDTH): void {
    const boxes = placements.map(p => testBox(p, width));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(boxesOverlap(boxes[i], boxes[j]), `${label}: pair (${i},${j}) must not overlap`).toBe(false);
      }
    }
  }

  it('keeps the label rectangle fully inside the viewBox at 0, 5, 90, 175 and 180 degrees', () => {
    const angles = [0, 5, 90, 175, 180];
    for (const angleDeg of angles) {
      const [placement] = rayLabelPlacements([angleDeg], VIEW);
      expectInBounds(testBox(placement), `angle=${angleDeg}`);
    }
  });

  it('keeps a three-ray cluster around 90 degrees ([82, 90, 98], stagger triggered) inside the viewBox and non-overlapping', () => {
    const angles = [82, 90, 98];
    const placements = rayLabelPlacements(angles, VIEW);
    placements.forEach((p, i) => expectInBounds(testBox(p), `angle=${angles[i]}`));
    expectAllPairsNonOverlapping(placements, '[82,90,98]');
  });

  it('keeps an obtuse overbend label clear of the target label ([102.2, 90])', () => {
    const placements = rayLabelPlacements([102.2, 90], VIEW);
    expect(placements).toHaveLength(2);
    expectAllPairsNonOverlapping(placements, '[102.2,90]');
  });

  it('puts two close rays at different y values (de-collision is triggered)', () => {
    const placements = rayLabelPlacements([102.2, 90], VIEW);
    expect(Math.abs(placements[0].y - placements[1].y)).toBeGreaterThan(5);
  });

  it('keeps a wide pair facing each other across 90 degrees ([70, 110], 40 degrees apart) non-overlapping - an angle-difference threshold alone would miss it', () => {
    // Labels always grow toward the center (the anchor direction), so even much farther
    // apart than a 15 degree threshold, two rays facing each other across 90 degrees (similar
    // sin(theta), hence similar base y) grow toward each other and can overlap.
    const placements = rayLabelPlacements([70, 110], VIEW);
    expect(placements).toHaveLength(2);
    expectAllPairsNonOverlapping(placements, '[70,110]');
    placements.forEach((p, i) => expectInBounds(testBox(p), `[70,110] index=${i}`));
  });

  it('does not stagger far-apart rays ([30, 150], 120 degrees apart) - same y, de-collision stays quiet', () => {
    const placements = rayLabelPlacements([30, 150], VIEW);
    expect(placements[0].y).toBeCloseTo(placements[1].y, 6);
  });

  // Near 0/180 degrees: exactly where widening the radius used to be absorbed almost
  // entirely by x and failed to separate labels.
  it('separates a dense pair near 0 degrees ([1, 3], 2 degrees apart), where radial stagger used to fail', () => {
    const placements = rayLabelPlacements([1, 3], VIEW);
    expect(placements).toHaveLength(2);
    expectAllPairsNonOverlapping(placements, '[1,3]');
    placements.forEach((p, i) => expectInBounds(testBox(p), `[1,3] index=${i}`));
  });

  it('separates exactly duplicated angles ([0, 0]) vertically instead of drawing them on top of each other', () => {
    const placements = rayLabelPlacements([0, 0], VIEW);
    expect(placements).toHaveLength(2);
    expectAllPairsNonOverlapping(placements, '[0,0]');
    placements.forEach((p, i) => expectInBounds(testBox(p), `[0,0] index=${i}`));
  });

  it('separates a dense pair near 180 degrees ([177, 179], 2 degrees apart)', () => {
    const placements = rayLabelPlacements([177, 179], VIEW);
    expect(placements).toHaveLength(2);
    expectAllPairsNonOverlapping(placements, '[177,179]');
    placements.forEach((p, i) => expectInBounds(testBox(p), `[177,179] index=${i}`));
  });

  // Three-ray shape of an obtuse triangle (5, 5 and 170 degrees, summing to 180).
  it('honors the three-ray guarantee for an obtuse triangle ([5, 5, 170]): no overlap and inside the viewBox', () => {
    const placements = rayLabelPlacements([5, 5, 170], VIEW);
    expect(placements).toHaveLength(3);
    expectAllPairsNonOverlapping(placements, '[5,5,170]');
    placements.forEach((p, i) => expectInBounds(testBox(p), `[5,5,170] index=${i}`));
  });

  // reserved: a fixed non-ray text such as a baseline label. A ray near 0 degrees pushed
  // down by duplicates or neighbors can collide with the spot the baseline label occupies;
  // passing that box as reserved makes the layout avoid it.
  it('avoids a reserved box (the spot of a baseline label)', () => {
    const baselineBox = { left: VIEW.cx + VIEW.r - 20, right: VIEW.cx + VIEW.r, top: VIEW.cy + 2, bottom: VIEW.cy + 26 };
    // Duplicate angles near 5 degrees force the rank to be pushed downward toward the baseline.
    const placements = rayLabelPlacements([5, 5], VIEW, [baselineBox]);
    for (const p of placements) {
      const box = testBox(p);
      const overlapsBaseline = box.left < baselineBox.right && baselineBox.left < box.right && box.top < baselineBox.bottom && baselineBox.top < box.bottom;
      expect(overlapsBaseline, `ray label must not overlap reserved baseline box: ${JSON.stringify(box)}`).toBe(false);
    }
  });

  it('without reserved boxes (the default []) behaves as before, for example no stagger for [30, 150]', () => {
    const placements = rayLabelPlacements([30, 150], VIEW);
    expect(placements[0].y).toBeCloseTo(placements[1].y, 6);
  });

  // Worst-case label width (long translations) clamped to the viewBox.
  it('keeps a worst-case width label inside the viewBox near 90 degrees (middle anchor) - long-translation scenario', () => {
    const placements = rayLabelPlacements([90], VIEW);
    expect(placements[0].anchor).toBe('middle');
    expectInBounds(testBox(placements[0], WORST_CASE_WIDTH), 'middle worst-case');
  });

  it('keeps a worst-case width label inside the viewBox near 0 and 180 degrees (start/end anchors)', () => {
    const [zero] = rayLabelPlacements([0], VIEW);
    const [oneEighty] = rayLabelPlacements([180], VIEW);
    expectInBounds(testBox(zero, WORST_CASE_WIDTH), '0° worst-case');
    expectInBounds(testBox(oneEighty, WORST_CASE_WIDTH), '180° worst-case');
  });

  it('chooses the anchor so a label always grows toward the center: end at 0 degrees, start at 180 degrees', () => {
    const [zero] = rayLabelPlacements([0], VIEW);
    const [oneEighty] = rayLabelPlacements([180], VIEW);
    expect(zero.anchor).toBe('end');
    expect(oneEighty.anchor).toBe('start');
  });

  it('places a label near 90 degrees symmetrically with a middle anchor', () => {
    const [ninety] = rayLabelPlacements([90], VIEW);
    expect(ninety.anchor).toBe('middle');
  });

  // Out-of-range angles are never clamped silently. A silent clamp used to draw the ray
  // line at its true angle while its label was clamped to the boundary and detached from
  // its ray. The domain is [0, 210] (RAY_ANGLE_MAX_DEG); beyond it the call fails loudly.
  it('throws for angles outside the domain (-10, 211) instead of clamping silently', () => {
    expect(() => rayLabelPlacements([-10], VIEW)).toThrow(RangeError);
    expect(() => rayLabelPlacements([RAY_ANGLE_MAX_DEG + 1], VIEW)).toThrow(RangeError);
  });

  it('places the domain boundary values (0 and 210) without throwing', () => {
    expect(() => rayLabelPlacements([RAY_ANGLE_MIN_DEG], VIEW)).not.toThrow();
    expect(() => rayLabelPlacements([RAY_ANGLE_MAX_DEG], VIEW)).not.toThrow();
  });

  // Pigeonhole regression sweeps. An earlier version used maxRank = placedBoxes.length + 1,
  // but one placed box can forbid up to 2 candidates of the 19px rank grid (a 32px
  // forbidden width against 19px spacing), so that bound was too small. It only showed up
  // with clusters of three or more rays, which is why hand-picked cases missed it. These
  // sweeps cover the whole triangle domain (a+b+c=180, 1 degree steps) and the clusters
  // near 0, 180 and 180-210 degrees.
  describe('maxRank pigeonhole regression sweeps', () => {
    /** Checks that all placements (a) do not overlap each other and (b) stay inside the viewBox. */
    function assertPlacementsValid(placements: LabelPlacement[], label: string): void {
      const boxes = placements.map(p => testBox(p));
      for (let i = 0; i < boxes.length; i++) {
        expectInBounds(boxes[i], `${label} index=${i}`);
        for (let j = i + 1; j < boxes.length; j++) {
          expect(boxesOverlap(boxes[i], boxes[j]), `${label}: pair (${i},${j}) must not overlap`).toBe(false);
        }
      }
    }

    it('the whole triangle domain (a+b+c=180, a,b,c>=1, 1 degree steps): no overlap, all inside the viewBox', () => {
      // Exhaustive: a=1..178, b=1..(179-a), c=180-a-b (>=1) - exactly C(179,2) = 15,931
      // cases. The function sorts its input by ascending angle internally, so permuting
      // (a,b,c) changes nothing; one multiset represents every real render of that triangle.
      let count = 0;
      for (let a = 1; a <= 178; a++) {
        for (let b = 1; a + b <= 179; b++) {
          const c = 180 - a - b;
          count++;
          const placements = rayLabelPlacements([a, b, c], VIEW);
          assertPlacementsValid(placements, `[${a},${b},${c}]`);
        }
      }
      expect(count).toBe(15931);
      // The exhaustive sweep can take ~26s on a CI runner (under 5s locally), beyond the
      // default 5s timeout, so this sweep gets an explicit timeout rather than less coverage.
    }, 180_000);

    it('the cluster near 0 degrees (0-20, every 3-ray combination): no overlap, all inside the viewBox', () => {
      let count = 0;
      for (let a = 0; a <= 20; a++) {
        for (let b = a; b <= 20; b++) {
          for (let c = b; c <= 20; c++) {
            count++;
            const placements = rayLabelPlacements([a, b, c], VIEW);
            assertPlacementsValid(placements, `near-0 [${a},${b},${c}]`);
          }
        }
      }
      expect(count).toBeGreaterThan(0);
    }, 60_000);

    it('the cluster near 180 degrees (160-180, every 3-ray combination): no overlap, all inside the viewBox', () => {
      let count = 0;
      for (let a = 160; a <= 180; a++) {
        for (let b = a; b <= 180; b++) {
          for (let c = b; c <= 180; c++) {
            count++;
            const placements = rayLabelPlacements([a, b, c], VIEW);
            assertPlacementsValid(placements, `near-180 [${a},${b},${c}]`);
          }
        }
      }
      expect(count).toBeGreaterThan(0);
    }, 60_000);

    // Domain extension (0-180 to 0-210): overbend angles beyond 180 degrees are real, so
    // the 180-210 degree region is swept with the same strength (every 3-ray combination).
    it('the cluster at 180-210 degrees (every 3-ray combination): no overlap, all inside the viewBox (domain-extension regression)', () => {
      let count = 0;
      for (let a = 180; a <= 210; a++) {
        for (let b = a; b <= 210; b++) {
          for (let c = b; c <= 210; c++) {
            count++;
            const placements = rayLabelPlacements([a, b, c], VIEW);
            assertPlacementsValid(placements, `near-210 [${a},${b},${c}]`);
          }
        }
      }
      expect(count).toBeGreaterThan(0);
    }, 60_000);

    it('every single ray over the whole domain (0-210 degrees, 1 degree steps): inside the viewBox', () => {
      let count = 0;
      for (let a = RAY_ANGLE_MIN_DEG; a <= RAY_ANGLE_MAX_DEG; a++) {
        count++;
        const [placement] = rayLabelPlacements([a], VIEW);
        expectInBounds(testBox(placement), `single angle=${a}`);
      }
      expect(count).toBe(211);
    });

    it('every ray pair (a<b) over the whole domain (0-210 degrees): no overlap, all inside the viewBox', () => {
      let count = 0;
      for (let a = RAY_ANGLE_MIN_DEG; a <= RAY_ANGLE_MAX_DEG; a += 3) {
        for (let b = a + 1; b <= RAY_ANGLE_MAX_DEG; b += 3) {
          count++;
          const placements = rayLabelPlacements([a, b], VIEW);
          assertPlacementsValid(placements, `pair [${a},${b}]`);
        }
      }
      expect(count).toBeGreaterThan(1000);
    });

    it('the previously failing cases ([46,58,76], [47,58,75], [48,57,75], [1,8,15]) no longer overlap', () => {
      for (const angles of [[46, 58, 76], [47, 58, 75], [48, 57, 75], [1, 8, 15]]) {
        const placements = rayLabelPlacements(angles, VIEW);
        assertPlacementsValid(placements, `[${angles.join(',')}]`);
      }
    });

    it('ten rays 20 degrees apart (0, 20, ..., 180): the symmetric pair (20 and 160 degrees) does not overlap (inside-viewBox is only guaranteed up to RAY_LABEL_GUARANTEED_RAY_COUNT=3, so it is not checked here)', () => {
      const angles = Array.from({ length: 10 }, (_, i) => i * 20);
      const placements = rayLabelPlacements(angles, VIEW);
      const boxes = placements.map(p => testBox(p));
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          expect(boxesOverlap(boxes[i], boxes[j]), `10-ray 20° step: pair (${i},${j}) must not overlap`).toBe(false);
        }
      }
    });
  });
});

describe('deltaLabelPosition', () => {
  // As in the rayLabelPlacements tests, the box geometry used to judge overlap is redeclared
  // here instead of imported (the implementation must not grade itself with its own
  // constants). deltaLabelPosition builds its avoid boxes with the typical width (90px), so
  // the same value is stated independently here.
  const TEST_WIDTH = 90;
  const TEST_ASCENT = 12;
  const TEST_DESCENT = 4;
  const CENTER = { cx: RAY_VIEW.cx, cy: RAY_VIEW.cy, width: RAY_VIEW.width, height: RAY_VIEW.height };

  function testBox(x: number, y: number, anchor: 'start' | 'middle' | 'end', width = TEST_WIDTH): LabelBox {
    const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
    return { left, right: left + width, top: y - TEST_ASCENT, bottom: y + TEST_DESCENT };
  }

  function overlaps(a: LabelBox, b: LabelBox): boolean {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  }

  function expectInBounds(box: LabelBox, note: string): void {
    expect(box.left, `${note} left`).toBeGreaterThanOrEqual(0);
    expect(box.right, `${note} right`).toBeLessThanOrEqual(RAY_VIEW.width);
    expect(box.top, `${note} top`).toBeGreaterThanOrEqual(0);
    expect(box.bottom, `${note} bottom`).toBeLessThanOrEqual(RAY_VIEW.height);
  }

  it('returns the base radius position unchanged when there is nothing to avoid', () => {
    const p = deltaLabelPosition(150, 170.4, 84, [], CENTER);
    const expected = polarPoint(CENTER.cx, CENTER.cy, 84, 160.2);
    expect(p.x).toBeCloseTo(expected.x, 9);
    expect(p.y).toBeCloseTo(expected.y, 9);
  });

  it('keeps the delta label clear of the overbend ray label when both rays sit near 180 degrees (150 and 170.4)', () => {
    // Regression: with the target at 150 and the overbend at about 170.4 the two rays sit
    // close to 180 degrees, and the delta label (radius 84) used to overlap the overbend
    // ray label (radius 124, anchor 'start').
    const rayPlacements = rayLabelPlacements([170.4, 150], RAY_VIEW);
    const rayBoxes = rayPlacements.map(p => testBox(p.x, p.y, p.anchor));

    const deltaBaseRadius = 84; // the preset's delta radius (62) plus the label offset (22)
    const deltaPos = deltaLabelPosition(150, 170.4, deltaBaseRadius, rayBoxes, CENTER);
    const deltaBox = testBox(deltaPos.x, deltaPos.y, 'middle');

    for (const rayBox of rayBoxes) {
      expect(overlaps(deltaBox, rayBox), `delta box ${JSON.stringify(deltaBox)} must not overlap ray box ${JSON.stringify(rayBox)}`).toBe(false);
    }
    expectInBounds(deltaBox, '150° delta');
  });

  it('keeps the delta label clear of the ray labels for an acute pair (30 and 34.08 degrees)', () => {
    const rayPlacements = rayLabelPlacements([34.08, 30], RAY_VIEW);
    const rayBoxes = rayPlacements.map(p => testBox(p.x, p.y, p.anchor));
    const deltaPos = deltaLabelPosition(30, 34.08, 84, rayBoxes, CENTER);
    const deltaBox = testBox(deltaPos.x, deltaPos.y, 'middle');
    for (const rayBox of rayBoxes) {
      expect(overlaps(deltaBox, rayBox)).toBe(false);
    }
    expectInBounds(deltaBox, '30° delta');
  });

  it('keeps a very narrow delta label (0.58 degrees wide, rays at 175 and 175.58) clear of the neighboring ray labels and the baseline label', () => {
    // Worst case seen in practice: the two rays hug each other near 180 degrees and the
    // delta is so narrow that its label is squeezed into the small gap between the ray
    // labels. The earlier radius-push implementation moved the label almost entirely along
    // x and the final clampAnchoredX undid that move, leaving the delta label on top of the
    // target label.
    const targetAngle = 175;
    const overbendAngle = 175.58;
    const reservedBox = testBox(RAY_VIEW.cx + RAY_VIEW.r, RAY_VIEW.cy + 14, 'end', 170); // baseline (worst-case width)
    const rayPlacements = rayLabelPlacements([overbendAngle, targetAngle], RAY_VIEW, [reservedBox]);
    const rayBoxes = rayPlacements.map(p => testBox(p.x, p.y, p.anchor));
    const avoid = [reservedBox, ...rayBoxes];

    const deltaPos = deltaLabelPosition(targetAngle, overbendAngle, 84, avoid, CENTER);
    const deltaBox = testBox(deltaPos.x, deltaPos.y, 'middle');
    for (const box of avoid) {
      expect(overlaps(deltaBox, box), `delta box ${JSON.stringify(deltaBox)} must not overlap ${JSON.stringify(box)}`).toBe(false);
    }
    expectInBounds(deltaBox, 'narrow delta worst case');
  });

  it('on overlap keeps x and separates y by at least the box height (16px) - the same vertical separation as ray labels, not a radius push', () => {
    const midAngle = 160.2;
    const base = polarPoint(CENTER.cx, CENTER.cy, 84, midAngle);
    const collidingBox = testBox(base.x, base.y, 'middle');
    const p = deltaLabelPosition(150, 170.4, 84, [collidingBox], CENTER);
    const resolvedBox = testBox(p.x, p.y, 'middle');
    expect(overlaps(resolvedBox, collidingBox)).toBe(false);
    // x is not the subject of the push - it stays at base.x (the clamp is a no-op because
    // base.x is already inside the viewport).
    expect(p.x).toBeCloseTo(base.x, 9);
    // The separation is purely vertical and at least enough to break the AABB overlap
    // condition (|dy| < ASCENT+DESCENT = 16).
    expect(Math.abs(p.y - base.y)).toBeGreaterThanOrEqual(TEST_ASCENT + TEST_DESCENT);
  });

  it('keeps a wide (worst-case 170px) label from being cut off at the left edge of the viewBox', () => {
    // Regression: a wide translated label (about 116px against about 87px in English) was
    // cut off at x<0 for rays at 150 and about 170 degrees. Ray labels are protected by
    // clampAnchoredX because their anchor always grows toward the center, but the delta
    // label is always 'middle' anchored, so its x needs its own clamp, separate from the
    // vertical separation.
    const WORST_CASE_WIDTH = 170;
    const rayPlacements = rayLabelPlacements([170.4, 150], RAY_VIEW);
    const rayBoxes = rayPlacements.map(p => testBox(p.x, p.y, p.anchor));
    const deltaPos = deltaLabelPosition(150, 170.4, 84, rayBoxes, CENTER);

    expect(deltaPos.x).toBeGreaterThanOrEqual(WORST_CASE_WIDTH / 2);
    expect(deltaPos.x).toBeLessThanOrEqual(RAY_VIEW.width - WORST_CASE_WIDTH / 2);
  });

  it('keeps a worst-case width delta label inside the viewBox near 0 and 180 degrees even with nothing to avoid (clamp only)', () => {
    const WORST_CASE_WIDTH = 170;
    for (const [fromDeg, toDeg] of [[0, 5], [175, 180]] as const) {
      const p = deltaLabelPosition(fromDeg, toDeg, 84, [], CENTER);
      expect(p.x, `[${fromDeg},${toDeg}] x`).toBeGreaterThanOrEqual(WORST_CASE_WIDTH / 2);
      expect(p.x, `[${fromDeg},${toDeg}] x`).toBeLessThanOrEqual(RAY_VIEW.width - WORST_CASE_WIDTH / 2);
    }
  });

  // Pigeonhole regression sweeps (same principle as rayLabelPlacements). A general geometry
  // sweep: fromDeg (the target role) over 0-180 degrees and delta (toDeg - fromDeg) over
  // 0.1-30 degrees. Each time it places two ray labels plus a baseline reservation
  // (avoid.length = 3, the realistic composition) and checks the delta label overlaps
  // nothing and stays inside the viewBox - the maxRank = 2 * avoid.length proof across the
  // whole range.
  describe('delta/ray overlap regression sweeps - fromDeg x delta', () => {
    it('fromDeg 0-180 degrees (5 degree steps) x delta 0.1-30 degrees (2 degree steps): no overlap, all inside the viewBox', () => {
      let count = 0;
      for (let fromDeg = 0; fromDeg <= 180; fromDeg += 5) {
        for (let delta = 0.1; delta <= 30; delta += 2) {
          const toDeg = fromDeg + delta;
          count++;
          const reservedBox = testBox(RAY_VIEW.cx + RAY_VIEW.r, RAY_VIEW.cy + 14, 'end', 170);
          const rayPlacements = rayLabelPlacements([toDeg, fromDeg], RAY_VIEW, [reservedBox]);
          const rayBoxes = rayPlacements.map(p => testBox(p.x, p.y, p.anchor));
          const avoid = [reservedBox, ...rayBoxes];

          const deltaPos = deltaLabelPosition(fromDeg, toDeg, 84, avoid, CENTER);
          const deltaBox = testBox(deltaPos.x, deltaPos.y, 'middle');
          const note = `fromDeg=${fromDeg},toDeg=${toDeg.toFixed(1)}`;
          for (const box of avoid) {
            expect(overlaps(deltaBox, box), `${note}: delta must not overlap ${JSON.stringify(box)}`).toBe(false);
          }
          expectInBounds(deltaBox, note);
        }
      }
      expect(count).toBeGreaterThan(500);
    });

    // Domain extension (0-180 to 0-210): sweeps the region where toDeg (the overbend role)
    // exceeds 180 degrees and reaches RAY_ANGLE_MAX_DEG (target below 180, overbend between
    // 180 and 210).
    it('fromDeg (target) 100-179 degrees (1 degree steps) x toDeg (overbend) up to RAY_ANGLE_MAX_DEG: no overlap, all inside the viewBox', () => {
      let count = 0;
      for (let fromDeg = 100; fromDeg <= 179; fromDeg++) {
        const toDeg = RAY_ANGLE_MAX_DEG - 0.001; // just inside the domain upper bound (boundary check)
        if (toDeg <= fromDeg) continue;
        count++;
        const reservedBox = testBox(RAY_VIEW.cx + RAY_VIEW.r, RAY_VIEW.cy + 14, 'end', 170);
        const rayPlacements = rayLabelPlacements([toDeg, fromDeg], RAY_VIEW, [reservedBox]);
        const rayBoxes = rayPlacements.map(p => testBox(p.x, p.y, p.anchor));
        const avoid = [reservedBox, ...rayBoxes];

        const deltaPos = deltaLabelPosition(fromDeg, toDeg, 84, avoid, CENTER);
        const deltaBox = testBox(deltaPos.x, deltaPos.y, 'middle');
        const note = `fromDeg=${fromDeg},toDeg=${toDeg.toFixed(3)}`;
        for (const box of avoid) {
          expect(overlaps(deltaBox, box), `${note}: delta must not overlap ${JSON.stringify(box)}`).toBe(false);
        }
        expectInBounds(deltaBox, note);
      }
      expect(count).toBeGreaterThan(0);
    });
  });
});
