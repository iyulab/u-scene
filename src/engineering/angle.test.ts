import { describe, it, expect } from 'vitest';
import { angleDiagram, rayPaint, ANGLE_TONE_HEX } from './angle.js';
import type { AngleDiagramModel } from './angle.js';
import { TONE_DEFAULTS } from '../core/paint.js';
import { renderToSvgString } from '../core/render.js';
import type { TextNode } from '../core/types.js';

const texts = (m: AngleDiagramModel): string[] =>
  (angleDiagram(m)?.nodes.filter((n): n is TextNode => n.kind === 'text') ?? []).map((n) => n.text);

const full: AngleDiagramModel = {
  rays: [
    { angleDeg: 102.2, label: 'Overbend 102.2°', tone: 'accent', style: 'dashed' },
    { angleDeg: 90, label: 'Target 90°' },
  ],
  band: { fromDeg: 70, toDeg: 80, label: 'Safe range', severity: 'success' },
  delta: { fromDeg: 90, toDeg: 102.2, label: '12.2°' },
  baselineLabel: 'Base',
  title: 'Bend angles',
};

describe('rayPaint', () => {
  it('a severity wins over the tone', () => {
    expect(rayPaint({ tone: 'primary', severity: 'danger' })).toBe('danger');
  });
  it('without a severity the tone hex is used, primary by default', () => {
    expect(rayPaint({ tone: 'accent' })).toBe('#0ea5e9');
    expect(rayPaint({})).toBe('#f97316');
  });
  it('no structural tone collides with a status color', () => {
    const status = [TONE_DEFAULTS.success, TONE_DEFAULTS.warning, TONE_DEFAULTS.danger, TONE_DEFAULTS.info];
    for (const hex of Object.values(ANGLE_TONE_HEX)) expect(status).not.toContain(hex);
  });
});

describe('angleDiagram', () => {
  it('returns null when there are no rays', () => {
    expect(angleDiagram({ rays: [] })).toBeNull();
  });

  it('carries every label exactly once, as given', () => {
    expect(texts(full).sort()).toEqual(['12.2°', 'Base', 'Overbend 102.2°', 'Safe range', 'Target 90°'].sort());
  });

  it('omits optional parts that the model does not have', () => {
    expect(texts({ rays: [{ angleDeg: 45, label: '45°' }] })).toEqual(['45°']);
  });

  it('uses the shared ray view and a valid scene', () => {
    const scene = angleDiagram(full)!;
    expect([scene.width, scene.height]).toEqual([340, 300]);
    expect(scene.title).toBe('Bend angles');
    expect(() => renderToSvgString(scene)).not.toThrow();
  });

  it('draws the delta arc with an arrow', () => {
    expect(renderToSvgString(angleDiagram(full)!)).toContain('marker-end="url(#u-scene-arrow-94a3b8)"');
  });

  it('throws for a ray beyond the supported domain', () => {
    expect(() => angleDiagram({ rays: [{ angleDeg: 230, label: 'x' }] })).toThrow(RangeError);
  });
});

describe('angleDiagram input checks', () => {
  it('rejects non-finite angles with a TypeError', () => {
    expect(() => angleDiagram({ rays: [{ angleDeg: NaN, label: 'x' }] })).toThrow(TypeError);
    expect(() => angleDiagram({ rays: [{ angleDeg: 10, label: 'x' }], band: { fromDeg: 0, toDeg: Infinity } })).toThrow(TypeError);
    expect(() => angleDiagram({ rays: [{ angleDeg: 10, label: 'x' }], delta: { fromDeg: NaN, toDeg: 5, label: 'd' } })).toThrow(TypeError);
  });
});
