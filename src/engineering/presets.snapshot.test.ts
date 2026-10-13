import { describe, it, expect } from 'vitest';
import { renderToSvgString } from '../core/render.js';
import type { Scene } from '../core/types.js';
import { angleDiagram } from './angle.js';
import { bendSectionDiagram } from './bend-section.js';
import { threadProfileDiagram } from './thread-profile.js';
import { rectSectionDiagram } from './rect-section.js';
import { ringSectionDiagram } from './ring-section.js';
import { floorPlanDiagram } from './floor-plan.js';

/** One element per line, so a snapshot diff points at the node whose paint, dash or order changed. */
function svgOf(scene: Scene | null): string {
  if (!scene) throw new Error('expected a scene');
  return renderToSvgString(scene).replace(/></g, '>\n<') + '\n';
}

// Each preset is pinned with every optional layer switched on, so the snapshot covers the
// full paint, dash and drawing order the preset can emit.
describe('preset SVG snapshots', () => {
  it('angleDiagram', async () => {
    const svg = svgOf(angleDiagram({
      rays: [
        { angleDeg: 90, label: 'target 90°', style: 'dashed', tone: 'muted' },
        { angleDeg: 102.5, label: 'actual 102.5°', severity: 'warning' },
        { angleDeg: 30, label: 'reference 30°', tone: 'accent' },
      ],
      band: { fromDeg: 85, toDeg: 95, label: 'tolerance', severity: 'success' },
      delta: { fromDeg: 90, toDeg: 102.5, label: '+12.5°' },
      baselineLabel: '0°',
      title: 'Angle',
    }));
    await expect(svg).toMatchFileSnapshot('./__snapshots__/angle.svg');
  });

  it('bendSectionDiagram', async () => {
    const svg = svgOf(bendSectionDiagram({
      thicknessMm: 2,
      insideRadiusMm: 3,
      bendAngleDeg: 90,
      kFactor: 0.42,
      kFactorMin: 0.38,
      kFactorMax: 0.46,
      labels: { thickness: 't = 2 mm', insideRadius: 'Ri = 3 mm', bendAngle: '90°', neutralAxis: 'k = 0.42' },
      title: 'Bend section',
    }));
    await expect(svg).toMatchFileSnapshot('./__snapshots__/bend-section.svg');
  });

  it('threadProfileDiagram', async () => {
    const svg = svgOf(threadProfileDiagram({
      pitchMm: 1.5,
      threadAngleDeg: 60,
      majorDiameterMm: 10,
      minorDiameterMm: 8.376,
      pitchDiameterMm: 9.026,
      wireDiameterMm: 0.866,
      labels: { pitch: 'P = 1.5', angle: '60°', major: 'd = 10', minor: 'd1 = 8.376', pitchDia: 'd2 = 9.026', overWires: 'M = 10.3' },
      title: 'Thread profile',
    }));
    await expect(svg).toMatchFileSnapshot('./__snapshots__/thread-profile.svg');
  });

  it('rectSectionDiagram', async () => {
    const svg = svgOf(rectSectionDiagram({
      kind: 'strip',
      widthMm: 0.3,
      thicknessMm: 0.035,
      substrate: 'below',
      labels: { width: 'W = 0.3 mm', thickness: 'T = 0.035 mm', ratio: 'W/T = 8.6' },
      title: 'Rectangular section',
    }));
    await expect(svg).toMatchFileSnapshot('./__snapshots__/rect-section.svg');
  });

  it('ringSectionDiagram', async () => {
    const svg = svgOf(ringSectionDiagram({
      outerDiameterMm: 200,
      innerDiameterMm: 110,
      referenceDiameterMm: 150,
      boltCircleDiameterMm: 170,
      boltCount: 8,
      extraLabels: ['PCD 170', '8 x M16'],
      labels: { outer: 'OD 200', inner: 'ID 110', wall: 'wall 45', note: 'face view', notToScale: 'not to scale' },
      title: 'Ring section',
    }));
    await expect(svg).toMatchFileSnapshot('./__snapshots__/ring-section.svg');
  });

  it('floorPlanDiagram', async () => {
    const svg = svgOf(floorPlanDiagram({
      roomLengthM: 12,
      roomWidthM: 8,
      fixtureCount: 11,
      labels: { length: 'L = 12 m', width: 'W = 8 m' },
      title: 'Floor plan',
    }));
    await expect(svg).toMatchFileSnapshot('./__snapshots__/floor-plan.svg');
  });
});
