import { describe, it, expect } from 'vitest';
import { handlePosition, valueAtPoint, steppedValue, trackRange } from './handles.js';
import type { HandleStop } from './handles.js';
import { assertScene } from './validate.js';
import { renderToSvgString } from './render.js';
import type { Scene } from './types.js';

const line: HandleStop[] = [{ value: 0, x: 10, y: 50 }, { value: 10, x: 110, y: 50 }];
// A bent track (two segments, unequal value per pixel) — what a normalised figure or an arc produces.
const bent: HandleStop[] = [{ value: 0, x: 0, y: 0 }, { value: 1, x: 100, y: 0 }, { value: 4, x: 100, y: 100 }];

describe('handle track maths', () => {
  it('places a value by interpolating between its two stops, and clamps beyond the ends', () => {
    expect(handlePosition(line, 2.5)).toEqual({ x: 35, y: 50 });
    expect(handlePosition(bent, 2.5)).toEqual({ x: 100, y: 50 });
    expect(handlePosition(line, -3)).toEqual({ x: 10, y: 50 });
    expect(handlePosition(line, 99)).toEqual({ x: 110, y: 50 });
  });

  it('reads the value under a point by projecting it onto the nearest segment', () => {
    expect(valueAtPoint(line, { x: 60, y: 80 })).toBeCloseTo(5, 10);
    expect(valueAtPoint(line, { x: -50, y: 50 })).toBe(0);
    expect(valueAtPoint(bent, { x: 130, y: 75 })).toBeCloseTo(3.25, 10);
  });

  it('round-trips: the value under a value\'s own point is that value', () => {
    for (const track of [line, bent]) {
      const { min, max } = trackRange(track);
      for (let i = 0; i <= 20; i++) {
        const v = min + ((max - min) * i) / 20;
        expect(valueAtPoint(track, handlePosition(track, v))).toBeCloseTo(v, 9);
      }
    }
  });

  it('steps by the given step or a hundredth of the range, inside the range, never rounding', () => {
    expect(steppedValue({ value: 5, track: line, step: 0.3 }, 1)).toBeCloseTo(5.3, 12);
    expect(steppedValue({ value: 5, track: line }, -10)).toBeCloseTo(4, 12);
    expect(steppedValue({ value: 9.9, track: line, step: 1 }, 10)).toBe(10);
    expect(steppedValue({ value: 0.1, track: line, step: 1 }, -1)).toBe(0);
  });
});

describe('scene handles', () => {
  const scene = (handles: Scene['handles']): Scene => ({ width: 120, height: 100, nodes: [], handles });
  const ok = { id: 'r', param: 'insideRadius', value: 2, track: line, valueText: '2 mm', label: 'Inside radius' };

  it('validate: a well-formed handle passes', () => {
    expect(() => assertScene(scene([ok]))).not.toThrow();
  });

  it('validate: rejects a short or non-increasing track, a duplicate id, a non-finite value, a bad step', () => {
    expect(() => assertScene(scene([{ ...ok, track: [line[0]] }]))).toThrow(TypeError);
    expect(() => assertScene(scene([{ ...ok, track: [line[1], line[0]] }]))).toThrow(TypeError);
    expect(() => assertScene(scene([ok, ok]))).toThrow(TypeError);
    expect(() => assertScene(scene([{ ...ok, value: NaN }]))).toThrow(TypeError);
    expect(() => assertScene(scene([{ ...ok, step: 0 }]))).toThrow(TypeError);
  });

  it('the static render carries no handles', () => {
    expect(renderToSvgString(scene([ok]))).not.toContain('slider');
  });
});
