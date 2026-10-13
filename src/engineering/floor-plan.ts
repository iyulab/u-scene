import type { Scene, SceneNode } from '../core/types.js';
import { finite, positive } from './model-checks.js';
import { FLOOR_PLAN_FIXTURE_RADIUS, FLOOR_PLAN_FIXTURE_STROKE_WIDTH, floorPlanGeometry, floorPlanMaxFixtures } from './floor-plan-geometry.js';
import type { FloorPlanView } from './floor-plan-geometry.js';

export interface FloorPlanDiagramModel {
  roomLengthM: number;
  roomWidthM: number;
  /** Fixtures to place on an even grid. Zero or less, or more than
   *  FLOOR_PLAN_MAX_FIXTURES, draws nothing. */
  fixtureCount: number;
  labels: { length: string; width: string };
  title?: string;
}

const VIEW: FloorPlanView = { width: 340, height: 280, padding: 20 };

/**
 * The most fixtures `floorPlanDiagram` draws (638 in its 340 x 280 view). Above it the 9 px
 * markers touch in every room shape, so the plan could no longer show the count - a large
 * count is valid but not drawable, and the preset returns `null` for it instead of a smear.
 * Derived from the view by `floorPlanMaxFixtures`, so it follows any change to the view.
 */
export const FLOOR_PLAN_MAX_FIXTURES = floorPlanMaxFixtures(VIEW);

/** A rectangular plan with fixtures on an even grid - lights, sprinklers, racks. Returns
 *  `null` when there is nothing to draw (no fixtures) or too many to tell apart. */
export function floorPlanDiagram(m: FloorPlanDiagramModel): Scene | null {
  positive(m.roomLengthM, 'floorPlanDiagram roomLengthM');
  positive(m.roomWidthM, 'floorPlanDiagram roomWidthM');
  finite(m.fixtureCount, 'floorPlanDiagram fixtureCount');
  if (m.fixtureCount <= 0 || m.fixtureCount > FLOOR_PLAN_MAX_FIXTURES) return null;
  const g = floorPlanGeometry({ roomLengthM: m.roomLengthM, roomWidthM: m.roomWidthM, fixtureCount: m.fixtureCount }, VIEW);
  const nodes: SceneNode[] = [
    { kind: 'path', d: g.roomPath, fill: { paint: 'primary', opacity: 0.06 }, stroke: { paint: 'ink', width: 1.5 } },
    { kind: 'path', d: g.lengthDimPath, stroke: { paint: 'muted', width: 1, dash: [3, 3] } },
    { kind: 'path', d: g.widthDimPath, stroke: { paint: 'muted', width: 1, dash: [3, 3] } },
    ...g.fixtures.map((p): SceneNode => ({ kind: 'circle', cx: p.x, cy: p.y, r: FLOOR_PLAN_FIXTURE_RADIUS, fill: { paint: '#f59e0b' }, stroke: { paint: 'paper', width: FLOOR_PLAN_FIXTURE_STROKE_WIDTH } })),
    { kind: 'text', ...g.lengthLabel, text: m.labels.length, paint: 'ink-strong' },
    { kind: 'text', ...g.widthLabel, text: m.labels.width, paint: 'ink-strong' },
  ];
  return { width: VIEW.width, height: VIEW.height, ...(m.title ? { title: m.title } : {}), nodes };
}
