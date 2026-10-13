import { describe, it, expect } from 'vitest';
import { floorPlanDiagram } from './floor-plan.js';
import { renderToSvgString } from '../core/render.js';

const labels = { length: 'L = 10 m', width: 'W = 8 m' };

describe('floorPlanDiagram', () => {
  it('returns null when fixtureCount is 0', () => {
    expect(floorPlanDiagram({ roomLengthM: 10, roomWidthM: 8, fixtureCount: 0, labels })).toBeNull();
  });

  it('places one circle per fixture and both dimension labels', () => {
    const scene = floorPlanDiagram({ roomLengthM: 12, roomWidthM: 6, fixtureCount: 6, labels })!;
    expect(scene.nodes.filter((n) => n.kind === 'circle')).toHaveLength(6);
    expect(scene.nodes.filter((n) => n.kind === 'text').map((n) => (n as { text: string }).text).sort()).toEqual(['L = 10 m', 'W = 8 m']);
    expect(() => renderToSvgString(scene)).not.toThrow();
  });
});
