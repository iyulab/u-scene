import { describe, it, expect } from 'vitest';
import { ringSectionGeometry, RING_MIN_WALL_PX } from './ring-section-geometry.js';
import type { RingSectionView } from './ring-section-geometry.js';

describe('ringSectionGeometry', () => {
  const VIEW: RingSectionView = { width: 360, height: 280, padding: 24 };

  it('draws both circles on one scale - outer:inner radius equals OD:ID', () => {
    const g = ringSectionGeometry({ outerDiameterMm: 21.3, innerDiameterMm: 15.76 }, VIEW);
    expect(g.clamped).toBe(false);
    expect(g.outerRadiusPx / g.innerRadiusPx).toBeCloseTo(21.3 / 15.76, 6);
    expect(g.outerRadiusPx - g.innerRadiusPx).toBeCloseTo(g.wallPx, 6);
  });

  it('the ring path is two closed circles (outer, then hole) for an even-odd fill', () => {
    const g = ringSectionGeometry({ outerDiameterMm: 0.35, innerDiameterMm: 0.3 }, VIEW);
    expect(g.ringPath.match(/M /g)).toHaveLength(2);
    expect(g.ringPath.match(/A /g)).toHaveLength(4);
  });

  it('a wall too thin to see is held at the minimum and flagged', () => {
    const g = ringSectionGeometry({ outerDiameterMm: 323.9, innerDiameterMm: 315.98 }, VIEW);
    expect(g.clamped).toBe(true);
    expect(g.wallPx).toBeGreaterThanOrEqual(RING_MIN_WALL_PX);
  });

  it('a solid section (no hole) has no inner circle', () => {
    const g = ringSectionGeometry({ outerDiameterMm: 10, innerDiameterMm: 0 }, VIEW);
    expect(g.innerRadiusPx).toBe(0);
    expect(g.ringPath.match(/M /g)).toHaveLength(1);
  });

  it('keeps labels inside the viewBox and the view cropped to the drawing', () => {
    for (const [od, id] of [[21.3, 15.76], [0.35, 0.3], [323.9, 315.98], [60.3, 38.18]]) {
      const g = ringSectionGeometry({ outerDiameterMm: od, innerDiameterMm: id }, VIEW);
      for (const l of [g.outerLabel, g.innerLabel, g.wallLabel, g.noteLabel]) {
        expect(l.x).toBeGreaterThanOrEqual(0);
        expect(l.x).toBeLessThanOrEqual(VIEW.width);
        expect(l.y).toBeGreaterThan(0);
        expect(l.y).toBeLessThanOrEqual(g.viewHeight);
      }
      expect(g.viewHeight).toBeLessThanOrEqual(VIEW.height);
    }
  });
});

describe('ringSectionGeometry bolt pattern (flange face)', () => {
  const VIEW: RingSectionView = { width: 360, height: 280, padding: 24 };
  const flange = { outerDiameterMm: 228.6, innerDiameterMm: 0, referenceDiameterMm: 122.2, boltCircleDiameterMm: 190.5, boltCount: 8 };

  it('places exactly boltCount holes on the bolt circle, to the same scale as the OD', () => {
    const g = ringSectionGeometry(flange, VIEW);
    expect(g.boltHoles).toHaveLength(8);
    const rBC = (190.5 * g.scale) / 2;
    for (const h of g.boltHoles!) {
      const dx = h.cx - g.cx, dy = h.cy - g.cy;
      expect(dx * dx + dy * dy).toBeCloseTo(rBC * rBC, 3);
    }
  });

  it('straddles the centrelines - no hole sits on the vertical axis (flange convention)', () => {
    for (const n of [4, 8, 12]) {
      const g = ringSectionGeometry({ ...flange, boltCount: n }, VIEW);
      for (const h of g.boltHoles!) expect(Math.abs(h.cx - g.cx)).toBeGreaterThan(1);
    }
  });

  it('draws the raised-face reference circle to scale', () => {
    const g = ringSectionGeometry(flange, VIEW);
    expect(g.referenceRadiusPx! / g.outerRadiusPx).toBeCloseTo(122.2 / 228.6, 6);
  });

  it('bolt hole markers never overlap each other', () => {
    const g = ringSectionGeometry({ ...flange, boltCount: 24, boltCircleDiameterMm: 200 }, VIEW);
    const [a, b] = g.boltHoles!;
    const d2 = (a.cx - b.cx) ** 2 + (a.cy - b.cy) ** 2;
    expect(d2).toBeGreaterThan((a.r + b.r) ** 2);
  });
});
