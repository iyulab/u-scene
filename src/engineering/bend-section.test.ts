import { describe, it, expect } from 'vitest';
import { bendSectionDiagram } from './bend-section.js';
import type { BendSectionDiagramModel } from './bend-section.js';
import { renderToSvgString } from '../core/render.js';
import { assertScene } from '../core/validate.js';
import { handlePosition } from '../core/handles.js';
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

  describe('handles', () => {
    const spec = { insideRadius: { min: 0, max: 30, step: 0.5, label: 'Inside radius', valueText: '6 mm' }, bendAngle: { min: 0, max: 180, label: 'Bend angle', valueText: '90°' } };
    const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

    it('places each handle on the figure it controls — the inside apex and the outside tangent point', () => {
      for (const [ri, beta] of [[6, 90], [0.5, 135], [25, 30]] as const) {
        const scene = bendSectionDiagram({ ...model, insideRadiusMm: ri, bendAngleDeg: beta, handles: spec });
        const [r, b] = scene.handles!;
        // The radius dimension runs from the centre to the apex: its last point is the apex.
        const ticks = scene.nodes.filter((n): n is Extract<typeof n, { kind: 'path' }> => n.kind === 'path' && n.stroke?.paint === 'muted' && n.stroke.width === 1.25 && !n.d.includes('A'));
        const apex = nums(ticks[1].d).slice(-2);
        const at = handlePosition(r.track, r.value);
        expect(at.x).toBeCloseTo(apex[0], 1);
        expect(at.y).toBeCloseTo(apex[1], 1);
        // The material outline's first arc ends at the right outside tangent point.
        const material = (scene.nodes[0] as Extract<(typeof scene.nodes)[0], { kind: 'path' }>).d;
        const arcEnd = nums(material.split('A')[1]).slice(5, 7);
        const bAt = handlePosition(b.track, b.value);
        expect(bAt.x).toBeCloseTo(arcEnd[0], 1);
        expect(bAt.y).toBeCloseTo(arcEnd[1], 1);
      }
    });

    it('carries the host\'s label, text, step and range, and passes scene validation', () => {
      const scene = bendSectionDiagram({ ...model, handles: spec });
      expect(() => assertScene(scene)).not.toThrow();
      const r = scene.handles!.find((h) => h.param === 'insideRadius')!;
      expect([r.label, r.valueText, r.step, r.value, r.track[0].value, r.track[r.track.length - 1].value]).toEqual(['Inside radius', '6 mm', 0.5, 6, 0, 30]);
    });

    it('has no handles unless asked, and none in the static markup', () => {
      expect(bendSectionDiagram(model).handles).toBeUndefined();
      expect(renderToSvgString(bendSectionDiagram({ ...model, handles: spec }))).not.toContain('slider');
    });
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
