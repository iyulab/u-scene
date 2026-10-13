import { describe, it, expect } from 'vitest';
import { ringSectionDiagram } from './ring-section.js';
import type { RingSectionDiagramModel } from './ring-section.js';
import { renderToSvgString } from '../core/render.js';
import type { TextNode } from '../core/types.js';

const labels = { outer: 'OD = 21.3 mm', inner: 'ID = 15.76 mm', wall: 't = 2.77 mm', notToScale: 'wall not to scale' };
const texts = (m: RingSectionDiagramModel) =>
  ringSectionDiagram(m).nodes.filter((n): n is TextNode => n.kind === 'text').map((n) => n.text);

describe('ringSectionDiagram', () => {
  it('carries outer, inner and wall labels for a tube', () => {
    expect(texts({ outerDiameterMm: 21.3, innerDiameterMm: 15.76, labels }).sort()).toEqual(['ID = 15.76 mm', 'OD = 21.3 mm', 't = 2.77 mm']);
  });

  it('marks a wall drawn thicker than scale', () => {
    expect(texts({ outerDiameterMm: 323.9, innerDiameterMm: 315.98, labels })).toContain('wall not to scale');
  });

  it('draws a flange face with its bolt holes and gutter labels', () => {
    const m: RingSectionDiagramModel = {
      outerDiameterMm: 228.6, innerDiameterMm: 0, referenceDiameterMm: 122.2, boltCircleDiameterMm: 190.5, boltCount: 8,
      extraLabels: ['PCD = 190.5 mm', '8 x M16'], labels: { ...labels, note: 'A = 1 cm2' },
    };
    const scene = ringSectionDiagram(m);
    expect(scene.nodes.filter((n) => n.kind === 'circle')).toHaveLength(8);
    expect(texts(m)).toEqual(expect.arrayContaining(['PCD = 190.5 mm', '8 x M16', 'A = 1 cm2']));
    expect(texts(m)).not.toContain('ID = 15.76 mm');
    expect(() => renderToSvgString(scene)).not.toThrow();
  });
});
