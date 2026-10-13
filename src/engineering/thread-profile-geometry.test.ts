import { describe, it, expect } from 'vitest';
import { threadProfileGeometry } from './thread-profile-geometry.js';

describe('threadProfileGeometry - thread form detail', () => {
  const VIEW = { width: 360, height: 220, padding: 34 };

  it('single scale: the pitch to thread-height mm ratio is preserved in px', () => {
    // With a minor diameter, hMm = (10 - 7) / 2 = 1.5 and P = 2, so pitchPx / threadHeightPx = 2 / 1.5.
    const g = threadProfileGeometry({ pitchMm: 2, threadAngleDeg: 60, majorDiameterMm: 10, minorDiameterMm: 7 }, VIEW);
    expect(g.pitchPx / g.threadHeightPx).toBeCloseTo(2 / 1.5, 5);
  });

  it('thread angle is drawn truthfully: 29 and 60 degrees give different flank slopes (different profilePath)', () => {
    const a = threadProfileGeometry({ pitchMm: 2, threadAngleDeg: 60, majorDiameterMm: 10, minorDiameterMm: 7 }, VIEW);
    const b = threadProfileGeometry({ pitchMm: 2, threadAngleDeg: 29, majorDiameterMm: 10, minorDiameterMm: 7 }, VIEW);
    expect(a.profilePath).not.toBe(b.profilePath);
  });

  it('optional reference lines: rootLine and pitchLine exist only when minor and pitch diameter are given', () => {
    const bare = threadProfileGeometry({ pitchMm: 2, threadAngleDeg: 60, majorDiameterMm: 10 }, VIEW);
    expect(bare.rootLine).toBeUndefined();
    expect(bare.pitchLine).toBeUndefined();
    expect(bare.minorLabel).toBeUndefined();
    const full = threadProfileGeometry({ pitchMm: 2, threadAngleDeg: 60, majorDiameterMm: 10, minorDiameterMm: 7, pitchDiameterMm: 8.7 }, VIEW);
    expect(full.rootLine).toBeDefined();
    expect(full.pitchLine).toBeDefined();
    expect(full.minorLabel).toBeDefined();
  });

  it('reference-line label de-collision: the three labels are separated by at least the minimum vertical gap', () => {
    const g = threadProfileGeometry({ pitchMm: 1.5, threadAngleDeg: 60, majorDiameterMm: 10, minorDiameterMm: 8.16, pitchDiameterMm: 9.03 }, VIEW);
    const ys = [g.majorLabel.y, g.pitchDiaLabel!.y, g.minorLabel!.y].sort((a, b) => a - b);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(18.5);
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(18.5);
  });

  it('degenerate input (pitch 0) does not throw', () => {
    expect(() => threadProfileGeometry({ pitchMm: 0, threadAngleDeg: 60, majorDiameterMm: 10 }, VIEW)).not.toThrow();
  });

  // wire layer
  it('without wireDiameterMm there are no wires and no overWiresLine', () => {
    const g = threadProfileGeometry({ pitchMm: 2, threadAngleDeg: 60, majorDiameterMm: 10, minorDiameterMm: 7 }, VIEW);
    expect(g.wires).toBeUndefined();
    expect(g.overWiresLine).toBeUndefined();
  });

  it('with wireDiameterMm there are three wires seated in the grooves plus an over-wires reference line', () => {
    const g = threadProfileGeometry({ pitchMm: 2, threadAngleDeg: 60, majorDiameterMm: 10, pitchDiameterMm: 8.7, wireDiameterMm: 1.155 }, VIEW);
    expect(g.wires).toHaveLength(3);
    expect(g.overWiresLine).toBeDefined();
  });

  it('wire tangency invariant (precise): wireSeatDepthPx * sin(alpha) = wireRadiusPx, for four thread angles', () => {
    for (const angleDeg of [60, 55, 29, 30]) {
      const alpha = ((angleDeg / 2) * Math.PI) / 180;
      const g = threadProfileGeometry({ pitchMm: 2, threadAngleDeg: angleDeg, majorDiameterMm: 10, minorDiameterMm: 7, wireDiameterMm: 1.155 }, VIEW);
      expect(g.wireSeatDepthPx! * Math.sin(alpha)).toBeCloseTo(g.wireRadiusPx!, 4);
    }
  });

  it('the tooth coordinates fit inside the viewBox', () => {
    const g = threadProfileGeometry({ pitchMm: 3, threadAngleDeg: 60, majorDiameterMm: 12, minorDiameterMm: 9, pitchDiameterMm: 10.5 }, VIEW);
    const nums = g.profilePath.match(/-?\d+\.?\d*/g)!.map(Number);
    for (const n of nums) { expect(n).toBeGreaterThanOrEqual(-1); expect(n).toBeLessThanOrEqual(Math.max(VIEW.width, VIEW.height) + 1); }
  });

  it('label gutter: the reference-line labels sit beyond the right end of the teeth, not on top of them', () => {
    const g = threadProfileGeometry({ pitchMm: 1.5, threadAngleDeg: 60, majorDiameterMm: 10, minorDiameterMm: 8.16, pitchDiameterMm: 9.03 }, VIEW);
    const profNums = g.profilePath.match(/-?\d+\.?\d*/g)!.map(Number);
    const xs = profNums.filter((_, i) => i % 2 === 0);
    const teethRight = Math.max(...xs);
    // The major label (anchor end, x = rightX) must lie right of the teeth for the gutter to exist.
    expect(g.majorLabel.x).toBeGreaterThan(teethRight);
  });

  it('over-wires label de-collision: it does not overlap the major or pitch-diameter label vertically', () => {
    const g = threadProfileGeometry({ pitchMm: 1.5, threadAngleDeg: 60, majorDiameterMm: 10, pitchDiameterMm: 9.0258, wireDiameterMm: 0.866 }, VIEW);
    const ys = [g.majorLabel.y, g.pitchDiaLabel!.y, g.overWiresLabel!.y].sort((a, b) => a - b);
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(18.5);
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(18.5);
  });
});
