import { describe, it, expect } from 'vitest';
import { bendSectionDiagram } from './bend-section.js';
import type { BendSectionDiagramModel } from './bend-section.js';
import { renderToSvgString } from '../core/render.js';
import type { TextNode } from '../core/types.js';

const model: BendSectionDiagramModel = {
  thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: 90, kFactor: 0.4,
  labels: { thickness: 't = 2 mm', insideRadius: 'Ri = 6 mm', bendAngle: '90°', neutralAxis: 'K = 0.400' },
  title: 'Bend section',
};
const texts = (m: BendSectionDiagramModel) =>
  bendSectionDiagram(m).nodes.filter((n): n is TextNode => n.kind === 'text').map((n) => n.text);

describe('bendSectionDiagram', () => {
  it('carries every label exactly once', () => {
    expect(texts(model).sort()).toEqual(['90°', 'K = 0.400', 'Ri = 6 mm', 't = 2 mm'].sort());
  });

  it('draws no neutral axis when the model has no K-factor', () => {
    const scene = bendSectionDiagram({
      thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: 90,
      labels: { thickness: 't = 2 mm', insideRadius: 'Ri = 6 mm', bendAngle: '90°' },
    });
    expect(scene.nodes.filter((n): n is TextNode => n.kind === 'text').map((n) => n.text)).not.toContain('K = 0.400');
    expect(scene.nodes.some((n) => n.kind === 'path' && n.stroke?.dash?.join(' ') === '6 4')).toBe(false);
  });

  it('shades the uncertainty band only when both bounds are given', () => {
    const banded = bendSectionDiagram({ ...model, kFactorMin: 0.35, kFactorMax: 0.45 });
    const plain = bendSectionDiagram(model);
    expect(banded.nodes.length).toBe(plain.nodes.length + 1);
  });

  it('draws exactly what the model gives: K only · band only · both · neither', () => {
    const base = { thicknessMm: 2, insideRadiusMm: 6, bendAngleDeg: 90, labels: model.labels };
    const isCentre = (n: { kind: string; stroke?: { dash?: readonly number[] } }) => n.kind === 'path' && n.stroke?.dash?.join(' ') === '6 4';
    const isBand = (n: { kind: string; fill?: { paint: string; opacity?: number } }) => n.kind === 'path' && n.fill?.paint === 'accent';
    const shape = (m: BendSectionDiagramModel) => {
      const nodes = bendSectionDiagram(m).nodes;
      return { centre: nodes.some(isCentre), band: nodes.some(isBand), kLabel: texts(m).includes('K = 0.400') };
    };
    expect(shape({ ...base, kFactor: 0.4 })).toEqual({ centre: true, band: false, kLabel: true });
    expect(shape({ ...base, kFactorMin: 0.35, kFactorMax: 0.45 })).toEqual({ centre: false, band: true, kLabel: false });
    expect(shape({ ...base, kFactor: 0.4, kFactorMin: 0.35, kFactorMax: 0.45 })).toEqual({ centre: true, band: true, kLabel: true });
    expect(shape({ ...base })).toEqual({ centre: false, band: false, kLabel: false });
  });

  it('is a valid 340 x 260 scene', () => {
    const scene = bendSectionDiagram(model);
    expect([scene.width, scene.height]).toEqual([340, 260]);
    expect(() => renderToSvgString(scene)).not.toThrow();
  });
});

describe('bendSectionDiagram input checks', () => {
  it('rejects bad numbers with a TypeError but allows a sharp bend (radius 0)', () => {
    expect(() => bendSectionDiagram({ ...model, thicknessMm: NaN })).toThrow(TypeError);
    expect(() => bendSectionDiagram({ ...model, insideRadiusMm: -1 })).toThrow(TypeError);
    expect(() => bendSectionDiagram({ ...model, bendAngleDeg: Infinity })).toThrow(TypeError);
    expect(() => bendSectionDiagram({ ...model, kFactor: NaN })).toThrow(TypeError);
    expect(() => bendSectionDiagram({ ...model, insideRadiusMm: 0 })).not.toThrow();
  });
});
