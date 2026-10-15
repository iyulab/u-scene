import type { Paint, Scene, SceneNode } from '../core/types.js';
import { positive } from './model-checks.js';
import { gearMeshGeometry } from './gear-mesh-geometry.js';
import type { GearMeshCircles, GearMeshGearGeometry, GearMeshView } from './gear-mesh-geometry.js';

export interface GearMeshDiagramModel {
  driver: GearMeshCircles;
  /** Absent draws the driver alone. */
  driven?: GearMeshCircles;
  labels: {
    /** One row under the drawing, e.g. «z₁ = 20 · d₁ = 40 mm». */
    driver: string;
    driven?: string;
    /** Under the centre-distance dimension (pairs only). */
    centerDistance?: string;
    notToScale: string;
  };
  title?: string;
}

const VIEW: GearMeshView = { width: 360, height: 300, padding: 20 };
const TONE: { driver: Paint; driven: Paint } = { driver: 'primary', driven: 'accent' };
/** Centre-line convention for a pitch circle: long dash, gap, dot, gap. */
const PITCH_DASH = [9, 3, 2, 3] as const;

function check(g: GearMeshCircles, at: string): void {
  positive(g.pitchDiameter, `${at}.pitchDiameter`);
  if (g.tipDiameter != null) {
    positive(g.tipDiameter, `${at}.tipDiameter`);
    if (!(g.tipDiameter > g.pitchDiameter)) throw new TypeError(`u-scene: ${at}.tipDiameter must exceed pitchDiameter`);
  }
  if (g.rootDiameter != null) {
    positive(g.rootDiameter, `${at}.rootDiameter`);
    if (!(g.rootDiameter < g.pitchDiameter)) throw new TypeError(`u-scene: ${at}.rootDiameter must be below pitchDiameter`);
  }
}

function gearNodes(g: GearMeshGearGeometry, tone: Paint): SceneNode[] {
  const nodes: SceneNode[] = [];
  if (g.tipRadiusPx != null) {
    nodes.push({ kind: 'circle', cx: g.cx, cy: g.cy, r: g.tipRadiusPx, fill: { paint: tone, opacity: 0.14 }, stroke: { paint: tone, width: 1.5 } });
    if (g.rootRadiusPx != null) nodes.push({ kind: 'circle', cx: g.cx, cy: g.cy, r: g.rootRadiusPx, stroke: { paint: 'muted', width: 1 } });
    nodes.push({ kind: 'circle', cx: g.cx, cy: g.cy, r: g.pitchRadiusPx, stroke: { paint: tone, width: 1.25, dash: PITCH_DASH } });
  } else {
    // Only the pitch circle is known: it is the gear's outline.
    nodes.push({ kind: 'circle', cx: g.cx, cy: g.cy, r: g.pitchRadiusPx, fill: { paint: tone, opacity: 0.14 }, stroke: { paint: tone, width: 1.5 } });
    if (g.rootRadiusPx != null) nodes.push({ kind: 'circle', cx: g.cx, cy: g.cy, r: g.rootRadiusPx, stroke: { paint: 'muted', width: 1 } });
  }
  nodes.push({ kind: 'path', d: g.centerMarkPath, stroke: { paint: 'ink', width: 1 } });
  if (g.rotationPath) nodes.push({ kind: 'path', d: g.rotationPath, stroke: { paint: tone, width: 1.5 }, markerEnd: 'arrow' });
  return nodes;
}

/** A gear, or a driver and a driven gear meshing at the pitch point (opposite rotation arrows,
 *  centre-distance dimension). Circles only, on one scale; labels carry the values. */
export function gearMeshDiagram(m: GearMeshDiagramModel): Scene {
  check(m.driver, 'gearMeshDiagram driver');
  if (m.driven) check(m.driven, 'gearMeshDiagram driven');
  const g = gearMeshGeometry({ driver: m.driver, driven: m.driven }, VIEW);

  const nodes: SceneNode[] = [...gearNodes(g.driver, TONE.driver)];
  if (g.driven) nodes.push(...gearNodes(g.driven, TONE.driven));
  if (g.pitchPoint) nodes.push({ kind: 'circle', cx: g.pitchPoint.x, cy: g.pitchPoint.y, r: 2.5, fill: { paint: 'ink-strong' } });
  if (g.centerDimPath) nodes.push({ kind: 'path', d: g.centerDimPath, stroke: { paint: 'muted', width: 1 } });
  if (g.driven && m.labels.centerDistance) nodes.push({ kind: 'text', ...g.centerDimLabel, text: m.labels.centerDistance, paint: 'ink-strong' });
  nodes.push({ kind: 'text', ...g.gearLabels[0], text: m.labels.driver, paint: TONE.driver });
  if (g.driven && m.labels.driven) nodes.push({ kind: 'text', ...g.gearLabels[1], text: m.labels.driven, paint: TONE.driven });
  if (g.clamped) nodes.push({ kind: 'text', ...g.notToScaleLabel, text: m.labels.notToScale, paint: 'muted', weight: 500, italic: true });
  return { width: VIEW.width, height: g.viewHeight, ...(m.title ? { title: m.title } : {}), nodes };
}
