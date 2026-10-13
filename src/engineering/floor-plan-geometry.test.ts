import { describe, it, expect } from 'vitest';
import { floorPlanGeometry } from './floor-plan-geometry.js';
import type { FloorPlanView } from './floor-plan-geometry.js';

describe('floorPlanGeometry', () => {
  const VIEW: FloorPlanView = { width: 340, height: 280, padding: 20 };

  it('places exactly fixtureCount fixtures', () => {
    for (const count of [1, 2, 7, 12, 25]) {
      const g = floorPlanGeometry({ roomLengthM: 10, roomWidthM: 8, fixtureCount: count }, VIEW);
      expect(g.fixtures).toHaveLength(count);
    }
  });

  it('keeps every fixture inside the room outline bounding box', () => {
    const g = floorPlanGeometry({ roomLengthM: 12, roomWidthM: 5, fixtureCount: 15 }, VIEW);
    const nums = g.roomPath.match(/-?\d+\.?\d*/g)!.map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
    const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
    for (const p of g.fixtures) {
      expect(p.x).toBeGreaterThanOrEqual(minX);
      expect(p.x).toBeLessThanOrEqual(maxX);
      expect(p.y).toBeGreaterThanOrEqual(minY);
      expect(p.y).toBeLessThanOrEqual(maxY);
    }
  });

  it('uses one uniform scale - the room aspect ratio equals the real one', () => {
    const g = floorPlanGeometry({ roomLengthM: 12, roomWidthM: 6, fixtureCount: 6 }, VIEW);
    const nums = g.roomPath.match(/-?\d+\.?\d*/g)!.map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const bboxW = Math.max(...xs) - Math.min(...xs);
    const bboxH = Math.max(...ys) - Math.min(...ys);
    expect(bboxW / bboxH).toBeCloseTo(12 / 6, 6);
  });

  it('never places two fixtures on the same spot (a grid layout is structurally unique)', () => {
    const g = floorPlanGeometry({ roomLengthM: 20, roomWidthM: 15, fixtureCount: 30 }, VIEW);
    const keys = g.fixtures.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('with count 1 the single fixture sits at the room centre', () => {
    const g = floorPlanGeometry({ roomLengthM: 10, roomWidthM: 8, fixtureCount: 1 }, VIEW);
    expect(g.fixtures).toHaveLength(1);
    const nums = g.roomPath.match(/-?\d+\.?\d*/g)!.map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    expect(g.fixtures[0].x).toBeCloseTo(cx, 6);
    expect(g.fixtures[0].y).toBeCloseTo(cy, 6);
  });

  it('does not throw on degenerate input (room dimensions 0)', () => {
    expect(() => floorPlanGeometry({ roomLengthM: 0, roomWidthM: 0, fixtureCount: 4 }, VIEW)).not.toThrow();
  });

  it('keeps the fixture coordinates inside the viewBox', () => {
    const g = floorPlanGeometry({ roomLengthM: 30, roomWidthM: 4, fixtureCount: 40 }, VIEW);
    const allX = [...g.fixtures.map(p => p.x)];
    const allY = [...g.fixtures.map(p => p.y)];
    for (const x of allX) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(VIEW.width); }
    for (const y of allY) { expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(VIEW.height); }
  });
});
