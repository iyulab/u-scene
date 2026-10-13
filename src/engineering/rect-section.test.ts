import { describe, it, expect } from 'vitest';
import { rectSectionDiagram } from './rect-section.js';
import { renderToSvgString } from '../core/render.js';
import type { TextNode } from '../core/types.js';

describe('rectSectionDiagram', () => {
  it('carries width, thickness and the optional ratio label', () => {
    const scene = rectSectionDiagram({ kind: 'opening', widthMm: 0.25, thicknessMm: 0.12, labels: { width: '0.25 mm', thickness: '0.12 mm', ratio: 'W/T = 2.08' } });
    expect(scene.nodes.filter((n): n is TextNode => n.kind === 'text').map((n) => n.text).sort()).toEqual(['0.12 mm', '0.25 mm', 'W/T = 2.08']);
    expect(scene.maxWidth).toBe('28rem');
    expect(() => renderToSvgString(scene)).not.toThrow();
  });

  it('draws a substrate under a strip when asked', () => {
    const scene = rectSectionDiagram({ kind: 'strip', widthMm: 0.254, thicknessMm: 0.035, substrate: 'below', labels: { width: 'w', thickness: 't' } });
    expect(scene.nodes.some((n) => n.kind === 'rect' && n.fill?.paint === '#16a34a')).toBe(true);
  });
});

describe('rectSectionDiagram input checks', () => {
  it('rejects non-positive or non-finite sizes with a TypeError', () => {
    const labels = { width: 'w', thickness: 't' };
    expect(() => rectSectionDiagram({ kind: 'strip', widthMm: 1, thicknessMm: NaN, labels })).toThrow(TypeError);
    expect(() => rectSectionDiagram({ kind: 'strip', widthMm: 0, thicknessMm: 1, labels })).toThrow(TypeError);
  });
});
