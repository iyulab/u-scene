import { describe, it, expect } from 'vitest';
import type { LabelPlacement } from '../core/geometry.js';
import {
  rayLabelPlacements, deltaLabelPosition, isDrawableAngle,
  RAY_VIEW_SIGNED, RAY_ANGLE_SIGNED_MIN_DEG, RAY_ANGLE_MAX_DEG, ANGLE_DOMAIN_SIGNED,
} from './angle-geometry.js';
import { angleDiagram } from './angle.js';
import type { TextNode } from '../core/types.js';

// Box geometry restated independently of the implementation, as in angle-geometry.test.ts.
const W = 90;
const ASC = 12;
const DESC = 4;
const VIEW = RAY_VIEW_SIGNED;
const D = ANGLE_DOMAIN_SIGNED;

interface Box { left: number; right: number; top: number; bottom: number }
const box = (p: LabelPlacement, width = W): Box => {
  const left = p.anchor === 'start' ? p.x : p.anchor === 'end' ? p.x - width : p.x - width / 2;
  return { left, right: left + width, top: p.y - ASC, bottom: p.y + DESC };
};
const overlap = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
function valid(ps: LabelPlacement[], note: string) {
  const bs = ps.map((p) => box(p));
  bs.forEach((b, i) => {
    expect(b.left, `${note} #${i} left`).toBeGreaterThanOrEqual(0);
    expect(b.right, `${note} #${i} right`).toBeLessThanOrEqual(VIEW.width);
    expect(b.top, `${note} #${i} top`).toBeGreaterThanOrEqual(0);
    expect(b.bottom, `${note} #${i} bottom`).toBeLessThanOrEqual(VIEW.height);
    for (let j = i + 1; j < bs.length; j++) expect(overlap(b, bs[j]), `${note} (${i},${j})`).toBe(false);
  });
}

describe('signed angle domain', () => {
  it('isDrawableAngle: default [0, 210], signed [-90, 210], never a non-finite value', () => {
    expect(isDrawableAngle(-2.86)).toBe(false);
    expect(isDrawableAngle(-2.86, { signed: true })).toBe(true);
    expect(isDrawableAngle(0)).toBe(true);
    expect(isDrawableAngle(210)).toBe(true);
    expect(isDrawableAngle(210.5, { signed: true })).toBe(false);
    expect(isDrawableAngle(-90, { signed: true })).toBe(true);
    expect(isDrawableAngle(-91, { signed: true })).toBe(false);
    expect(isDrawableAngle(NaN, { signed: true })).toBe(false);
    expect(isDrawableAngle(Infinity)).toBe(false);
  });

  it('every single ray over [-90, 210]: inside the taller view', () => {
    for (let a = RAY_ANGLE_SIGNED_MIN_DEG; a <= RAY_ANGLE_MAX_DEG; a++) valid(rayLabelPlacements([a], VIEW, [], D), `single ${a}`);
  });

  it('a label straight down grows symmetrically (middle anchor), one just left of it grows inward', () => {
    expect(rayLabelPlacements([-90], VIEW, [], D)[0].anchor).toBe('middle');
    expect(rayLabelPlacements([-30], VIEW, [], D)[0].anchor).toBe('end');
    expect(rayLabelPlacements([200], VIEW, [], D)[0].anchor).toBe('start');
  });

  it('every pair over the signed domain (3 degree steps): no overlap, inside the view', () => {
    let n = 0;
    for (let a = -90; a <= 210; a += 3) for (let b = a + 1; b <= 210; b += 3) { n++; valid(rayLabelPlacements([a, b], VIEW, [], D), `[${a},${b}]`); }
    expect(n).toBeGreaterThan(4000);
  });

  it('every 3-ray cluster near -90 and across 0 (each in steps of 2): no overlap, inside the view', () => {
    for (const [lo, hi] of [[-90, -60], [-20, 20]] as const) {
      for (let a = lo; a <= hi; a += 2) for (let b = a; b <= hi; b += 2) for (let c = b; c <= hi; c += 2) {
        valid(rayLabelPlacements([a, b, c], VIEW, [], D), `[${a},${b},${c}]`);
      }
    }
  }, 60_000);

  it('three rays near -90 with the two fixed texts the diagram reserves still fit (the height proof)', () => {
    for (let a = -90; a <= -70; a += 2) for (let b = a; b <= -70; b += 2) for (let c = b; c <= -70; c += 2) {
      const m = { rays: [a, b, c].map((deg) => ({ angleDeg: deg, label: `${deg}°` })), signed: true, baselineLabel: 'Horizontal', band: { fromDeg: -80, toDeg: -60, label: 'Band' } };
      const scene = angleDiagram(m)!;
      for (const t of scene.nodes.filter((nd): nd is TextNode => nd.kind === 'text')) {
        expect(t.y - ASC, `top ${t.text}`).toBeGreaterThanOrEqual(0);
        expect(t.y + DESC, `bottom ${t.text}`).toBeLessThanOrEqual(VIEW.height);
      }
    }
  }, 60_000);

  it('a delta below the baseline is placed inside the view', () => {
    for (let from = -90; from <= 0; from += 5) {
      for (const width of [0.5, 5, 30]) {
        const p = deltaLabelPosition(from, from + width, 84, [], VIEW, D);
        expect(p.y + DESC).toBeLessThanOrEqual(VIEW.height);
        expect(p.y - ASC).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('the default mode still refuses a negative angle, the signed mode draws it', () => {
    expect(() => angleDiagram({ rays: [{ angleDeg: -2.86, label: '-2.86°' }] })).toThrow(RangeError);
    const scene = angleDiagram({ rays: [{ angleDeg: -2.86, label: '-2.86°' }], signed: true, baselineLabel: 'Level' })!;
    expect(scene.height).toBe(VIEW.height);
    expect(scene.nodes.some((nd) => nd.kind === 'text' && nd.text === '-2.86°')).toBe(true);
  });
});

describe('band domain', () => {
  const rays = [{ angleDeg: 75, label: '75°' }];
  it('refuses a band edge outside the domain, as rays and deltas are refused', () => {
    expect(() => angleDiagram({ rays, band: { fromDeg: -10, toDeg: 20 } })).toThrow(RangeError);
    expect(() => angleDiagram({ rays, band: { fromDeg: 200, toDeg: 260 } })).toThrow(RangeError);
    expect(() => angleDiagram({ rays, band: { fromDeg: -100, toDeg: 0 }, signed: true })).toThrow(RangeError);
  });
  it('draws a band at the bounds, and a negative band in signed mode', () => {
    expect(angleDiagram({ rays, band: { fromDeg: 0, toDeg: 210 } })).not.toBeNull();
    expect(angleDiagram({ rays, band: { fromDeg: -20, toDeg: 0 }, signed: true })).not.toBeNull();
  });
});
