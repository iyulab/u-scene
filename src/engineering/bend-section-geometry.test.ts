import { describe, it, expect } from 'vitest';
import { bendSectionGeometry } from './bend-section-geometry.js';
import type { BendSectionView } from './bend-section-geometry.js';

describe('bendSectionGeometry - bent sheet cross-section', () => {
  const VIEW: BendSectionView = { width: 340, height: 260, padding: 34 };

  /** Extracts the "M x y" / "L x y" points of a path. Arc segments are skipped on purpose:
   *  their radius arguments would be indistinguishable from coordinates. */
  function pointCoords(path: string): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    const re = /[ML]\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(path))) out.push([parseFloat(m[1]), parseFloat(m[2])]);
    return out;
  }

  it('scale fidelity (core contract): thickness:radius pixel ratio equals the mm ratio', () => {
    for (const [t, ri] of [[1, 10], [0.5, 20], [5, 1], [3, 3], [2, 8]] as const) {
      const g = bendSectionGeometry({ thicknessMm: t, insideRadiusMm: ri, bendAngleDeg: 90, kFactor: 0.4 }, VIEW);
      expect(g.thicknessPx / g.insideRadiusPx, `t=${t},ri=${ri}`).toBeCloseTo(t / ri, 6);
      expect(g.insideRadiusPx).toBeGreaterThan(0);
      expect(g.thicknessPx).toBeGreaterThan(0);
    }
  });

  it('neutral axis position: (Rn - Ri) px equals k * thickness px, so the K-factor is drawn honestly', () => {
    for (const k of [0, 0.3, 0.4, 0.5, 1]) {
      const g = bendSectionGeometry({ thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: 90, kFactor: k }, VIEW);
      expect(g.neutralRadiusPx! - g.insideRadiusPx, `k=${k}`).toBeCloseTo(k * g.thicknessPx, 5);
    }
  });

  it('boundary angles 0 (flat), 90 and 180 (fully folded) give finite coordinates inside the viewport', () => {
    for (const beta of [0, 45, 90, 135, 180]) {
      const g = bendSectionGeometry({ thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: beta, kFactor: 0.4 }, VIEW);
      const paths = [g.materialPath, g.neutralPath!, g.angleArcPath, ...g.angleRadii, g.thicknessTick, g.radiusTick];
      for (const path of paths) {
        for (const [x, y] of pointCoords(path)) {
          expect(Number.isFinite(x) && Number.isFinite(y), `β=${beta} finite`).toBe(true);
          expect(x, `β=${beta} x in [0,${VIEW.width}]`).toBeGreaterThanOrEqual(-0.5);
          expect(x).toBeLessThanOrEqual(VIEW.width + 0.5);
          expect(y, `β=${beta} y in [0,${VIEW.height}]`).toBeGreaterThanOrEqual(-0.5);
          expect(y).toBeLessThanOrEqual(VIEW.height + 0.5);
        }
      }
    }
  });

  it('extreme ratios (thin 0.5 mm / 20 mm, thick 5 mm / 1 mm) keep the ratio and stay finite', () => {
    for (const [t, ri] of [[0.5, 20], [5, 1]] as const) {
      const g = bendSectionGeometry({ thicknessMm: t, insideRadiusMm: ri, bendAngleDeg: 90, kFactor: 0.4 }, VIEW);
      expect(g.thicknessPx / g.insideRadiusPx).toBeCloseTo(t / ri, 6);
      for (const [x, y] of pointCoords(g.materialPath)) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      }
    }
  });

  it('degenerate input (t = 0, ri = 0) does not throw, so a host may still choose to omit the diagram', () => {
    expect(() => bendSectionGeometry({ thicknessMm: 0, insideRadiusMm: 0, bendAngleDeg: 90, kFactor: 0.4 }, VIEW)).not.toThrow();
  });

  it('angles outside the domain are clamped to [0, 180]', () => {
    const over = bendSectionGeometry({ thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: 250, kFactor: 0.4 }, VIEW);
    const at180 = bendSectionGeometry({ thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: 180, kFactor: 0.4 }, VIEW);
    expect(over.materialPath).toBe(at180.materialPath);
  });

  it('without kFactor the geometry has no neutral axis — nothing stands in for the value', () => {
    const g = bendSectionGeometry({ thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: 90 }, VIEW);
    expect([g.neutralPath, g.neutralLabel, g.neutralRadiusPx]).toEqual([null, null, null]);
    const withK = bendSectionGeometry({ thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: 90, kFactor: 0.4 }, VIEW);
    // The neutral axis lies inside the material, so its presence does not move the fit.
    expect(g.materialPath).toBe(withK.materialPath);
  });

  describe('neutral-axis band (kFactorMin / kFactorMax)', () => {
    it('without kFactorMin/kFactorMax, neutralBandPath is an empty string (no band)', () => {
      const g = bendSectionGeometry({ thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: 90, kFactor: 0.4 }, VIEW);
      expect(g.neutralBandPath).toBe('');
    });

    it('with only kFactorMin (partial input) no band is drawn', () => {
      const g = bendSectionGeometry(
        { thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: 90, kFactor: 0.4, kFactorMin: 0.35 },
        VIEW,
      );
      expect(g.neutralBandPath).toBe('');
    });

    it('with both bounds the band path is filled and is a closed shape (ends in Z)', () => {
      const g = bendSectionGeometry(
        { thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: 90, kFactor: 0.4, kFactorMin: 0.35, kFactorMax: 0.45 },
        VIEW,
      );
      expect(g.neutralBandPath.length).toBeGreaterThan(0);
      expect(g.neutralBandPath.trim().endsWith('Z')).toBe(true);
    });

    it('band coordinates are all finite and inside the viewport (same invariant as the angle sweep)', () => {
      for (const beta of [0, 45, 90, 135, 180]) {
        const g = bendSectionGeometry(
          { thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: beta, kFactor: 0.4, kFactorMin: 0.3, kFactorMax: 0.5 },
          VIEW,
        );
        for (const [x, y] of pointCoords(g.neutralBandPath)) {
          expect(Number.isFinite(x) && Number.isFinite(y), `β=${beta} finite`).toBe(true);
          expect(x, `β=${beta} x in [0,${VIEW.width}]`).toBeGreaterThanOrEqual(-0.5);
          expect(x).toBeLessThanOrEqual(VIEW.width + 0.5);
          expect(y, `β=${beta} y in [0,${VIEW.height}]`).toBeGreaterThanOrEqual(-0.5);
          expect(y).toBeLessThanOrEqual(VIEW.height + 0.5);
        }
      }
    });

    it('with kFactor = kFactorMin = kFactorMax (zero width) the shape is still closed', () => {
      const g = bendSectionGeometry(
        { thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: 90, kFactor: 0.4, kFactorMin: 0.4, kFactorMax: 0.4 },
        VIEW,
      );
      // A zero-width band is a degenerate shape but still valid SVG, and never throws.
      expect(() => g.neutralBandPath).not.toThrow();
      expect(g.neutralBandPath.trim().endsWith('Z')).toBe(true);
    });
  });
});
