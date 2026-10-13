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

  it('accepts string title and description and rejects anything else', () => {
    expect(() => assertScene({ ...ok, title: 'T', description: 'D' })).not.toThrow();
    expect(() => assertScene({ ...ok, description: 42 as unknown as string })).toThrow(/description must be a string/);
    expect(() => assertScene({ ...ok, title: {} as unknown as string })).toThrow(/title must be a string/);
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

  it('rejects enum fields outside their allowlist', () => {
    const bad = (n: unknown) => () => assertScene({ ...ok, nodes: [n as Scene['nodes'][number]] });
    const text = { kind: 'text', x: 0, y: 0, text: 'a', anchor: 'start', paint: 'ink' };
    const line = { kind: 'line', x1: 0, y1: 0, x2: 1, y2: 1 };
    expect(bad({ ...text, anchor: 'x" onload="y' })).toThrow(/anchor/);
    expect(bad({ ...text, weight: 900 })).toThrow(/weight/);
    expect(bad({ ...line, stroke: { paint: 'ink', width: 1, linecap: 'x"' } })).toThrow(/linecap/);
    expect(bad({ ...line, stroke: { paint: 'ink', width: 1, linejoin: 'x"' } })).toThrow(/linejoin/);
    expect(bad({ kind: 'path', d: 'M 0 0', fill: { paint: 'ink', rule: 'x"' } })).toThrow(/rule/);
    expect(bad({ kind: 'path', d: 'M 0 0', markerEnd: 'x"' })).toThrow(/markerEnd/);
    expect(bad({ ...text, anchor: 'end', weight: 700 })).not.toThrow();
  });

  it('rejects negative sizes', () => {
    const bad = (n: unknown) => () => assertScene({ ...ok, nodes: [n as Scene['nodes'][number]] });
    expect(bad({ kind: 'circle', cx: 0, cy: 0, r: -1 })).toThrow(/\.r/);
    expect(bad({ kind: 'rect', x: 0, y: 0, width: -1, height: 1 })).toThrow(/width/);
    expect(bad({ kind: 'rect', x: 0, y: 0, width: 1, height: -1 })).toThrow(/height/);
    expect(bad({ kind: 'line', x1: 0, y1: 0, x2: 1, y2: 1, stroke: { paint: 'ink', width: -1 } })).toThrow(/stroke\.width/);
    expect(bad({ kind: 'line', x1: 0, y1: 0, x2: 1, y2: 1, stroke: { paint: 'ink', width: 1, dash: [2, -1] } })).toThrow(/dash\[1\]/);
  });

  it('requires a positive text size', () => {
    const t = (size: number) => () => assertScene({ ...ok, nodes: [{ kind: 'text', x: 0, y: 0, text: 'a', anchor: 'start', paint: 'ink', size }] });
    expect(t(0)).toThrow(/size/);
    expect(t(-3)).toThrow(/size/);
    expect(t(0.5)).not.toThrow();
  });

  it('rejects an id that is not a plain identifier', () => {
    expect(() => assertScene({ ...ok, nodes: [{ kind: 'line', id: 'a"b', x1: 0, y1: 0, x2: 1, y2: 1 }] })).toThrow(/id/);
  });

  it('rejects an unknown node kind instead of rendering nothing', () => {
    expect(() => assertScene({ width: 1, height: 1, nodes: [{ kind: 'ellipse' } as never] })).toThrow(/unknown kind/);
  });
});
