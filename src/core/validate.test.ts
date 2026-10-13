import { describe, it, expect } from 'vitest';
import { assertScene } from './validate.js';
import type { Scene } from './types.js';

const ok: Scene = {
  width: 100,
  height: 50,
  nodes: [
    { kind: 'path', d: 'M 0 0 L 10 10 A 5 5 0 0 1 20 20 Z', stroke: { paint: 'ink', width: 1 } },
    { kind: 'text', x: 1, y: 2, text: 'a < b', anchor: 'start', paint: 'muted' },
  ],
};

describe('assertScene', () => {
  it('accepts a well-formed scene', () => {
    expect(() => assertScene(ok)).not.toThrow();
  });

  it('rejects a non-positive or non-finite size', () => {
    expect(() => assertScene({ ...ok, width: 0 })).toThrow(TypeError);
    expect(() => assertScene({ ...ok, height: Number.NaN })).toThrow(TypeError);
  });

  it('rejects NaN inside path data', () => {
    expect(() => assertScene({ ...ok, nodes: [{ kind: 'path', d: 'M NaN 0 L 1 1' }] })).toThrow(/path data/);
  });

  it('rejects non-finite circle radius', () => {
    expect(() => assertScene({ ...ok, nodes: [{ kind: 'circle', cx: 1, cy: 1, r: Infinity }] })).toThrow(/nodes\[0\]\.r/);
  });

  it('rejects an opacity outside [0, 1]', () => {
    expect(() => assertScene({ ...ok, nodes: [{ kind: 'rect', x: 0, y: 0, width: 1, height: 1, fill: { paint: 'ink', opacity: 1.5 } }] })).toThrow(/opacity/);
  });

  it('rejects a maxWidth that is not a rem length', () => {
    expect(() => assertScene({ ...ok, maxWidth: '100px' })).toThrow(/maxWidth/);
    expect(() => assertScene({ ...ok, maxWidth: '28rem' })).not.toThrow();
  });

  it('rejects an id that is not a plain identifier', () => {
    expect(() => assertScene({ ...ok, nodes: [{ kind: 'line', id: 'a"b', x1: 0, y1: 0, x2: 1, y2: 1 }] })).toThrow(/id/);
  });
});
