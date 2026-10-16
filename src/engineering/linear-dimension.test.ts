import { describe, it, expect } from 'vitest';
import { linearDimensionNodes } from './linear-dimension.js';
import { assertScene } from '../core/validate.js';
import { renderToSvgString } from '../core/render.js';
import type { LineNode, PathNode, TextNode } from '../core/types.js';

describe('linearDimensionNodes', () => {
  const span = { from: { x: 20, y: 100 }, to: { x: 120, y: 100 }, offset: 20, label: '10 mm' };

  it('draws two extension lines, two arrows from the middle and the label', () => {
    const nodes = linearDimensionNodes(span);
    expect(nodes.map((n) => n.kind)).toEqual(['line', 'line', 'path', 'path', 'text']);
    expect((nodes[4] as TextNode).text).toBe('10 mm');
    expect((nodes[2] as PathNode).markerEnd).toBe('arrow');
  });

  it('puts a positive offset above a left-to-right span, and the extension lines reach past the dimension line', () => {
    const [e1, , arrow] = linearDimensionNodes(span) as [LineNode, LineNode, PathNode];
    expect(arrow.d).toBe('M 70.00 80.00 L 20.00 80.00');
    expect(e1.y1).toBe(97);
    expect(e1.y2).toBe(76);
    expect(linearDimensionNodes({ ...span, offset: -20 })[2]).toMatchObject({ d: 'M 70.00 120.00 L 20.00 120.00' });
  });

  it('is a valid part of a scene, and a zero-length span draws nothing', () => {
    const scene = { width: 140, height: 140, nodes: linearDimensionNodes(span) };
    expect(() => assertScene(scene)).not.toThrow();
    expect(renderToSvgString(scene)).toContain('10 mm');
    expect(linearDimensionNodes({ ...span, to: span.from })).toEqual([]);
  });

  it('rejects non-finite points', () => {
    expect(() => linearDimensionNodes({ ...span, offset: NaN })).toThrow(TypeError);
  });
});
