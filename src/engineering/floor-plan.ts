import type { Scene, SceneNode } from '../core/types.js';
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

const VIEW: FloorPlanView = { width: 340, height: 280, padding: 20 };

/** A rectangular plan with fixtures on an even grid - lights, sprinklers, racks. */
export function floorPlanDiagram(m: FloorPlanDiagramModel): Scene | null {
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
