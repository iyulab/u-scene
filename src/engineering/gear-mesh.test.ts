import { describe, it, expect } from 'vitest';
import { gearMeshDiagram } from './gear-mesh.js';
import type { GearMeshDiagramModel } from './gear-mesh.js';
import { gearMeshGeometry, GEAR_MESH_MIN_RADIUS_PX } from './gear-mesh-geometry.js';
import { renderToSvgString } from '../core/render.js';
import type { CircleNode, PathNode, TextNode } from '../core/types.js';

const VIEW = { width: 360, height: 300, padding: 20 };
const labels = { driver: 'z1 = 20 · d1 = 40 mm', driven: 'z2 = 40 · d2 = 80 mm', centerDistance: 'a = 60 mm', notToScale: 'not to scale' };
const pair: GearMeshDiagramModel = {
  driver: { pitchDiameter: 40, tipDiameter: 44, rootDiameter: 35 },
  driven: { pitchDiameter: 80, tipDiameter: 84, rootDiameter: 75 },
  labels,
};
const texts = (m: GearMeshDiagramModel) => gearMeshDiagram(m).nodes.filter((n): n is TextNode => n.kind === 'text').map((n) => n.text);

describe('gearMeshGeometry', () => {
  it('puts the two pitch circles tangent: centre distance = sum of pitch radii, on one scale', () => {
    const g = gearMeshGeometry({ driver: pair.driver, driven: pair.driven }, VIEW);
    expect(g.driven).toBeDefined();
    expect(g.driven!.cx - g.driver.cx).toBeCloseTo(g.driver.pitchRadiusPx + g.driven!.pitchRadiusPx, 6);
    expect(g.driven!.pitchRadiusPx / g.driver.pitchRadiusPx).toBeCloseTo(2, 6);
    expect(g.driver.tipRadiusPx! / g.driver.pitchRadiusPx).toBeCloseTo(44 / 40, 6);
    expect(g.pitchPoint!.x).toBeCloseTo(g.driver.cx + g.driver.pitchRadiusPx, 6);
    expect(g.clamped).toBe(false);
  });

  it('fits the drawing inside the view width', () => {
    const g = gearMeshGeometry({ driver: pair.driver, driven: pair.driven }, VIEW);
    expect(g.driver.cx - g.driver.tipRadiusPx!).toBeGreaterThanOrEqual(VIEW.padding - 1e-9);
    expect(g.driven!.cx + g.driven!.tipRadiusPx!).toBeLessThanOrEqual(VIEW.width - VIEW.padding + 1e-9);
  });

  it('enlarges a pitch circle too small to read and marks the drawing not to scale', () => {
    const g = gearMeshGeometry({ driver: { pitchDiameter: 1 }, driven: { pitchDiameter: 200 } }, VIEW);
    expect(g.clamped).toBe(true);
    expect(g.driver.pitchRadiusPx).toBeCloseTo(GEAR_MESH_MIN_RADIUS_PX, 6);
    expect(g.driven!.cx - g.driver.cx).toBeCloseTo(g.driver.pitchRadiusPx + g.driven!.pitchRadiusPx, 6);
  });

  it('draws a single gear centred, with no pair-only parts', () => {
    const g = gearMeshGeometry({ driver: { pitchDiameter: 40 } }, VIEW);
    expect(g.driven).toBeUndefined();
    expect(g.pitchPoint).toBeUndefined();
    expect(g.centerDimPath).toBeUndefined();
    expect(g.driver.rotationPath).toBeUndefined();
    expect(g.driver.cx).toBeCloseTo(VIEW.width / 2, 6);
  });
});

describe('gearMeshDiagram', () => {
  it('carries both gear labels and the centre distance, and opposite rotation arrows', () => {
    const scene = gearMeshDiagram(pair);
    expect(texts(pair)).toEqual(expect.arrayContaining([labels.driver, labels.driven, labels.centerDistance]));
    expect(texts(pair)).not.toContain(labels.notToScale);
    const arrows = scene.nodes.filter((n): n is PathNode => n.kind === 'path' && n.markerEnd === 'arrow');
    expect(arrows).toHaveLength(2);
    // Driver clockwise (sweep-flag 1 in screen space), driven counter-clockwise (0).
    expect(arrows[0].d).toMatch(/A [\d.]+ [\d.]+ 0 0 1 /);
    expect(arrows[1].d).toMatch(/A [\d.]+ [\d.]+ 0 0 0 /);
    expect(() => renderToSvgString(scene)).not.toThrow();
  });

  it('draws the pitch circle as the outline when tip and root are unknown (ratio only)', () => {
    const m: GearMeshDiagramModel = { driver: { pitchDiameter: 12 }, driven: { pitchDiameter: 36 }, labels };
    const circles = gearMeshDiagram(m).nodes.filter((n): n is CircleNode => n.kind === 'circle');
    // two outlines + pitch point
    expect(circles).toHaveLength(3);
    expect(circles.filter((c) => c.fill?.opacity === 0.14)).toHaveLength(2);
  });

  it('omits the driven label and centre distance for a single gear', () => {
    const m: GearMeshDiagramModel = { driver: pair.driver, labels };
    expect(texts(m)).toEqual([labels.driver]);
  });

  it('rejects circles that cannot be drawn honestly', () => {
    expect(() => gearMeshDiagram({ ...pair, driver: { pitchDiameter: NaN } })).toThrow(TypeError);
    expect(() => gearMeshDiagram({ ...pair, driver: { pitchDiameter: 40, tipDiameter: 38 } })).toThrow(/tipDiameter must exceed/);
    expect(() => gearMeshDiagram({ ...pair, driver: { pitchDiameter: 40, rootDiameter: 41 } })).toThrow(/rootDiameter must be below/);
    expect(() => gearMeshDiagram({ ...pair, driven: { pitchDiameter: 0 } })).toThrow(TypeError);
  });
});
