import type { Scene, SceneNode } from '../core/types.js';
import { finite, positive } from './model-checks.js';
import { FLOOR_PLAN_FIXTURE_RADIUS, floorPlanGeometry } from './floor-plan-geometry.js';
import type { FloorPlanView } from './floor-plan-geometry.js';

export interface FloorPlanDiagramModel {
  roomLengthM: number;
  roomWidthM: number;
  /** Fixtures to place on an even grid. Zero or less draws nothing. */
  fixtureCount: number;
  labels: { length: string; width: string };
  title?: string;
}

/** Upper bound on fixtures: the grid search is linear in the count. */
const MAX_FIXTURES = 10000;

const VIEW: FloorPlanView = { width: 340, height: 280, padding: 20 };

/** A rectangular plan with fixtures on an even grid - lights, sprinklers, racks. */
export function floorPlanDiagram(m: FloorPlanDiagramModel): Scene | null {
  positive(m.roomLengthM, 'floorPlanDiagram roomLengthM');
  positive(m.roomWidthM, 'floorPlanDiagram roomWidthM');
  finite(m.fixtureCount, 'floorPlanDiagram fixtureCount');
  if (m.fixtureCount > MAX_FIXTURES) throw new TypeError(`u-scene: floorPlanDiagram fixtureCount must be at most ${MAX_FIXTURES}`);
  if (m.fixtureCount <= 0) return null;
  const g = floorPlanGeometry({ roomLengthM: m.roomLengthM, roomWidthM: m.roomWidthM, fixtureCount: m.fixtureCount }, VIEW);
  const nodes: SceneNode[] = [
    { kind: 'path', d: g.roomPath, fill: { paint: 'primary', opacity: 0.06 }, stroke: { paint: 'ink', width: 1.5 } },
    { kind: 'path', d: g.lengthDimPath, stroke: { paint: 'muted', width: 1, dash: [3, 3] } },
    { kind: 'path', d: g.widthDimPath, stroke: { paint: 'muted', width: 1, dash: [3, 3] } },
    ...g.fixtures.map((p): SceneNode => ({ kind: 'circle', cx: p.x, cy: p.y, r: FLOOR_PLAN_FIXTURE_RADIUS, fill: { paint: '#f59e0b' }, stroke: { paint: 'paper', width: 1 } })),
    { kind: 'text', ...g.lengthLabel, text: m.labels.length, paint: 'ink-strong' },
    { kind: 'text', ...g.widthLabel, text: m.labels.width, paint: 'ink-strong' },
  ];
  return { width: VIEW.width, height: VIEW.height, ...(m.title ? { title: m.title } : {}), nodes };
}
