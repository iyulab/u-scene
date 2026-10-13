import { describe, it, expect } from 'vitest';
import { threadProfileDiagram } from './thread-profile.js';
import type { ThreadProfileDiagramModel } from './thread-profile.js';
import { renderToSvgString } from '../core/render.js';
import type { TextNode } from '../core/types.js';

const texts = (m: ThreadProfileDiagramModel) =>
  threadProfileDiagram(m).nodes.filter((n): n is TextNode => n.kind === 'text').map((n) => n.text).sort();

const minimal: ThreadProfileDiagramModel = {
  pitchMm: 2, threadAngleDeg: 60, majorDiameterMm: 10,
  labels: { pitch: 'P = 2 mm', angle: '60°', major: 'd = 10 mm' },
};

describe('threadProfileDiagram', () => {
  it('draws only the required labels for a minimal model', () => {
    expect(texts(minimal)).toEqual(['60°', 'P = 2 mm', 'd = 10 mm'].sort());
  });

  it('adds minor, pitch-diameter and over-wires labels when given', () => {
    const full: ThreadProfileDiagramModel = {
      ...minimal, minorDiameterMm: 7, pitchDiameterMm: 8.7, wireDiameterMm: 1.155,
      labels: { ...minimal.labels, minor: 'd1 = 7 mm', pitchDia: 'd2 = 8.7 mm', overWires: 'M = 11.2 mm' },
    };
    expect(texts(full)).toEqual(['60°', 'M = 11.2 mm', 'P = 2 mm', 'd = 10 mm', 'd1 = 7 mm', 'd2 = 8.7 mm'].sort());
  });

  it('is a valid 360 x 220 scene', () => {
    const scene = threadProfileDiagram(minimal);
    expect([scene.width, scene.height]).toEqual([360, 220]);
    expect(() => renderToSvgString(scene)).not.toThrow();
  });
});

describe('threadProfileDiagram input checks', () => {
  it('rejects bad numbers with a TypeError', () => {
    expect(() => threadProfileDiagram({ ...minimal, pitchMm: NaN })).toThrow(TypeError);
    expect(() => threadProfileDiagram({ ...minimal, majorDiameterMm: 0 })).toThrow(TypeError);
    expect(() => threadProfileDiagram({ ...minimal, threadAngleDeg: Infinity })).toThrow(TypeError);
    expect(() => threadProfileDiagram({ ...minimal, wireDiameterMm: -1 })).toThrow(TypeError);
  });
});
