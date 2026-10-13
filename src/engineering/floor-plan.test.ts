import { describe, it, expect } from 'vitest';
import { floorPlanDiagram, FLOOR_PLAN_MAX_FIXTURES } from './floor-plan.js';
import { renderToSvgString } from '../core/render.js';

const labels = { length: 'L = 10 m', width: 'W = 8 m' };

describe('floorPlanDiagram', () => {
  it('returns null when fixtureCount is 0', () => {
    expect(floorPlanDiagram({ roomLengthM: 10, roomWidthM: 8, fixtureCount: 0, labels })).toBeNull();
  });

  it('places one circle per fixture and both dimension labels', () => {
    const scene = floorPlanDiagram({ roomLengthM: 12, roomWidthM: 6, fixtureCount: 6, labels })!;
    expect(scene.nodes.filter((n) => n.kind === 'circle')).toHaveLength(6);
    expect(scene.nodes.filter((n) => n.kind === 'text').map((n) => (n as { text: string }).text).sort()).toEqual(['L = 10 m', 'W = 8 m']);
    expect(() => renderToSvgString(scene)).not.toThrow();
  });
});

describe('floorPlanDiagram input checks', () => {
  it('rejects bad numbers with a TypeError', () => {
    expect(() => floorPlanDiagram({ roomLengthM: NaN, roomWidthM: 8, fixtureCount: 4, labels })).toThrow(TypeError);
    expect(() => floorPlanDiagram({ roomLengthM: 10, roomWidthM: 0, fixtureCount: 4, labels })).toThrow(TypeError);
    expect(() => floorPlanDiagram({ roomLengthM: 10, roomWidthM: 8, fixtureCount: Infinity, labels })).toThrow(TypeError);
    expect(() => floorPlanDiagram({ roomLengthM: 10, roomWidthM: 8, fixtureCount: NaN, labels })).toThrow(TypeError);
  });

  it('returns null for a negative count', () => {
    expect(floorPlanDiagram({ roomLengthM: 10, roomWidthM: 8, fixtureCount: -3, labels })).toBeNull();
  });
});

describe('floorPlanDiagram fixture cap', () => {
  it('is derived from the 340 x 280 view: 29 x 22 markers of 9 px', () => {
    expect(FLOOR_PLAN_MAX_FIXTURES).toBe(638);
  });

  it('draws exactly the cap and returns null (not a throw) above it', () => {
    const atCap = floorPlanDiagram({ roomLengthM: 10, roomWidthM: 8, fixtureCount: FLOOR_PLAN_MAX_FIXTURES, labels })!;
    expect(atCap.nodes.filter((n) => n.kind === 'circle')).toHaveLength(FLOOR_PLAN_MAX_FIXTURES);
    expect(floorPlanDiagram({ roomLengthM: 10, roomWidthM: 8, fixtureCount: FLOOR_PLAN_MAX_FIXTURES + 1, labels })).toBeNull();
    expect(floorPlanDiagram({ roomLengthM: 200, roomWidthM: 150, fixtureCount: 13787, labels })).toBeNull();
    expect(floorPlanDiagram({ roomLengthM: 10, roomWidthM: 8, fixtureCount: 1e12, labels })).toBeNull();
  });

  it('at the cap, a room shaped like the drawable area keeps every marker apart', () => {
    // The drawable area is 266 x 206 px; a room of the same shape is the best case the cap is derived from.
    const scene = floorPlanDiagram({ roomLengthM: 266, roomWidthM: 206, fixtureCount: FLOOR_PLAN_MAX_FIXTURES, labels })!;
    const circles = scene.nodes.filter((n) => n.kind === 'circle') as { cx: number; cy: number; r: number }[];
    const footprint = 2 * circles[0].r + 1;
    let minGap = Infinity;
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        minGap = Math.min(minGap, Math.hypot(circles[i].cx - circles[j].cx, circles[i].cy - circles[j].cy));
      }
    }
    expect(minGap).toBeGreaterThanOrEqual(footprint);
  });
});
