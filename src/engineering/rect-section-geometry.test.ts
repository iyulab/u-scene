import { describe, it, expect } from 'vitest';
import { rectSectionGeometry, RECT_SECTION_MIN_PX } from './rect-section-geometry.js';
import type { RectSectionView } from './rect-section-geometry.js';

describe('rectSectionGeometry', () => {
  const VIEW: RectSectionView = { width: 360, height: 230, padding: 24 };
  const ratio = (g: { widthPx: number; thicknessPx: number }) => g.widthPx / g.thicknessPx;

  it('draws to scale when both sides fit - the drawn width:thickness equals the real one', () => {
    const g = rectSectionGeometry({ kind: 'opening', widthMm: 0.25, thicknessMm: 0.12 }, VIEW);
    expect(g.clamped).toBe('none');
    expect(ratio(g)).toBeCloseTo(0.25 / 0.12, 6);
    expect(g.breakPath).toBeUndefined();
  });

  it('an opening is the gap between two walls: the gap is exactly the drawn width', () => {
    const g = rectSectionGeometry({ kind: 'opening', widthMm: 0.3, thicknessMm: 0.15 }, VIEW);
    expect(g.materialRects).toHaveLength(2);
    const [left, right] = g.materialRects;
    expect(right.x - (left.x + left.width)).toBeCloseTo(g.widthPx, 6);
    expect(left.height).toBeCloseTo(g.thicknessPx, 6);
  });

  it('a strip is one block of the drawn width and thickness', () => {
    const g = rectSectionGeometry({ kind: 'strip', widthMm: 0.254, thicknessMm: 0.035, substrate: 'below' }, VIEW);
    expect(g.materialRects).toHaveLength(1);
    expect(g.materialRects[0].width).toBeCloseTo(g.widthPx, 6);
    expect(g.materialRects[0].height).toBeCloseTo(g.thicknessPx, 6);
    expect(g.substrateRect).toBeDefined();
    // the conductor sits on the substrate
    expect(g.substrateRect!.y).toBeCloseTo(g.materialRects[0].y + g.materialRects[0].height, 6);
  });

  it('a very wide thin section cannot be drawn to scale: thickness is held visible and the width dimension is broken', () => {
    const g = rectSectionGeometry({ kind: 'strip', widthMm: 10, thicknessMm: 0.035 }, VIEW);
    expect(g.clamped).toBe('width');
    expect(g.thicknessPx).toBeGreaterThanOrEqual(RECT_SECTION_MIN_PX);
    expect(ratio(g)).toBeLessThan(10 / 0.035);
    expect(g.breakPath).toBeDefined();
  });

  it('a very narrow tall section is held visible and the thickness dimension is broken', () => {
    const g = rectSectionGeometry({ kind: 'opening', widthMm: 0.004, thicknessMm: 0.3 }, VIEW);
    expect(g.clamped).toBe('thickness');
    expect(g.widthPx).toBeGreaterThanOrEqual(RECT_SECTION_MIN_PX);
    expect(g.breakPath).toBeDefined();
  });

  it('embedded strips have dielectric above and below the conductor', () => {
    const g = rectSectionGeometry({ kind: 'strip', widthMm: 0.5, thicknessMm: 0.035, substrate: 'embedded' }, VIEW);
    const s = g.substrateRect!;
    const c = g.materialRects[0];
    expect(s.y).toBeLessThan(c.y);
    expect(s.y + s.height).toBeGreaterThan(c.y + c.height);
  });

  it('keeps every shape and label inside the viewBox', () => {
    for (const input of [
      { kind: 'opening' as const, widthMm: 0.25, thicknessMm: 0.12, substrate: 'below' as const },
      { kind: 'opening' as const, widthMm: 5, thicknessMm: 0.05, substrate: 'below' as const },
      { kind: 'strip' as const, widthMm: 10, thicknessMm: 0.035, substrate: 'embedded' as const },
      { kind: 'strip' as const, widthMm: 0.1, thicknessMm: 0.07, substrate: 'below' as const },
    ]) {
      const g = rectSectionGeometry(input, VIEW);
      const rects = [...g.materialRects, ...(g.substrateRect ? [g.substrateRect] : [])];
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.width).toBeLessThanOrEqual(VIEW.width);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.y + r.height).toBeLessThanOrEqual(VIEW.height);
      }
      for (const l of [g.widthLabel, g.thicknessLabel, g.ratioLabel]) {
        expect(l.x).toBeGreaterThanOrEqual(0);
        expect(l.x).toBeLessThanOrEqual(VIEW.width);
        expect(l.y).toBeGreaterThan(0);
        expect(l.y).toBeLessThanOrEqual(VIEW.height);
      }
    }
  });
});

describe('rectSectionGeometry view height', () => {
  const VIEW: RectSectionView = { width: 360, height: 230, padding: 24 };
  it('crops the viewBox to the drawing so a thin section does not leave an empty band', () => {
    const thin = rectSectionGeometry({ kind: 'opening', widthMm: 5, thicknessMm: 0.05, substrate: 'below' }, VIEW);
    const thick = rectSectionGeometry({ kind: 'opening', widthMm: 0.25, thicknessMm: 0.12, substrate: 'below' }, VIEW);
    expect(thin.viewHeight).toBeLessThan(thick.viewHeight);
    for (const g of [thin, thick]) {
      expect(g.viewHeight).toBeLessThanOrEqual(VIEW.height);
      expect(g.ratioLabel.y).toBeLessThan(g.viewHeight);
    }
  });
});
