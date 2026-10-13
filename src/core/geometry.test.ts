import { describe, it, expect } from 'vitest';
import { polarPoint, arcPath, boxesOverlap, clampAnchoredX } from './geometry.js';

describe('polarPoint', () => {
  it('0 degrees points along +x (right)', () => {
    expect(polarPoint(100, 100, 50, 0)).toEqual({ x: 150, y: 100 });
  });

  it('90 degrees points up on screen - the SVG y axis grows downward, so cy - r', () => {
    const p = polarPoint(100, 100, 50, 90);
    expect(p.x).toBeCloseTo(100, 9);
    expect(p.y).toBeCloseTo(50, 9);
  });

  it('180 degrees points along -x (left)', () => {
    const p = polarPoint(100, 100, 50, 180);
    expect(p.x).toBeCloseTo(50, 9);
    expect(p.y).toBeCloseTo(100, 9);
  });

  it('an obtuse angle past 90 degrees lands in the upper-left quadrant', () => {
    const p = polarPoint(100, 100, 50, 102.2);
    expect(p.x).toBeLessThan(100);
    expect(p.y).toBeLessThan(100);
  });
});

describe('arcPath', () => {
  it('a counter-clockwise arc uses sweep-flag 0 (SVG screen coordinates)', () => {
    expect(arcPath(100, 100, 40, 0, 90)).toMatch(/A 40 40 0 0 0 /);
  });

  it('a clockwise arc uses sweep-flag 1', () => {
    expect(arcPath(100, 100, 40, 90, 0)).toMatch(/A 40 40 0 0 1 /);
  });

  it('an arc wider than 180 degrees uses large-arc-flag 1', () => {
    expect(arcPath(100, 100, 40, 0, 200)).toMatch(/A 40 40 0 1 0 /);
  });

  it('starts with M at the start point', () => {
    expect(arcPath(100, 100, 40, 0, 90)).toMatch(/^M 140\.00 100\.00 A/);
  });
});

describe('boxesOverlap', () => {
  it('is true only when the boxes share area', () => {
    const a = { left: 0, right: 10, top: 0, bottom: 10 };
    expect(boxesOverlap(a, { left: 5, right: 15, top: 5, bottom: 15 })).toBe(true);
    expect(boxesOverlap(a, { left: 10, right: 20, top: 0, bottom: 10 })).toBe(false);
  });
});

describe('clampAnchoredX', () => {
  it('keeps a label of the given width inside the view for each anchor', () => {
    expect(clampAnchoredX(5, 'end', 40, 300)).toBe(40);
    expect(clampAnchoredX(290, 'start', 40, 300)).toBe(260);
    expect(clampAnchoredX(10, 'middle', 40, 300)).toBe(20);
    expect(clampAnchoredX(150, 'middle', 40, 300)).toBe(150);
  });
});
