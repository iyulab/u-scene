import type { Scene, SceneNode } from '../core/types.js';
import { positive } from './model-checks.js';
import { threadProfileGeometry } from './thread-profile-geometry.js';
import type { ThreadProfileView } from './thread-profile-geometry.js';

export interface ThreadProfileDiagramModel {
  pitchMm: number;
  threadAngleDeg: number;
  majorDiameterMm: number;
  /** Optional layers: each is drawn only when the host computed it. */
  minorDiameterMm?: number;
  pitchDiameterMm?: number;
  wireDiameterMm?: number;
  labels: { pitch: string; angle: string; major: string; minor?: string; pitchDia?: string; overWires?: string };
  title?: string;
}

const VIEW: ThreadProfileView = { width: 360, height: 220, padding: 34 };

/** About three thread periods drawn large, with the major, minor and pitch diameters as
 *  labelled reference lines. A detail view, not a full-diameter section. */
export function threadProfileDiagram(m: ThreadProfileDiagramModel): Scene {
  positive(m.pitchMm, 'threadProfileDiagram pitchMm');
  positive(m.threadAngleDeg, 'threadProfileDiagram threadAngleDeg');
  positive(m.majorDiameterMm, 'threadProfileDiagram majorDiameterMm');
  if (m.minorDiameterMm != null) positive(m.minorDiameterMm, 'threadProfileDiagram minorDiameterMm');
  if (m.pitchDiameterMm != null) positive(m.pitchDiameterMm, 'threadProfileDiagram pitchDiameterMm');
  if (m.wireDiameterMm != null) positive(m.wireDiameterMm, 'threadProfileDiagram wireDiameterMm');
  const g = threadProfileGeometry({
    pitchMm: m.pitchMm,
    threadAngleDeg: m.threadAngleDeg,
    majorDiameterMm: m.majorDiameterMm,
    minorDiameterMm: m.minorDiameterMm,
    pitchDiameterMm: m.pitchDiameterMm,
    wireDiameterMm: m.wireDiameterMm,
  }, VIEW);
  const L = m.labels;
  const nodes: SceneNode[] = [
    { kind: 'path', d: g.profilePath, fill: { paint: 'primary', opacity: 0.14 }, stroke: { paint: 'ink', width: 1.5, linejoin: 'round' } },
    { kind: 'path', d: g.crestLine, stroke: { paint: 'muted', width: 1, dash: [2, 3] } },
  ];
  if (g.rootLine) nodes.push({ kind: 'path', d: g.rootLine, stroke: { paint: 'faint', width: 1, dash: [2, 3] } });
  if (g.pitchLine) nodes.push({ kind: 'path', d: g.pitchLine, stroke: { paint: 'accent', width: 1, dash: [4, 3] } });
  for (const w of g.wires ?? []) nodes.push({ kind: 'circle', cx: w.cx, cy: w.cy, r: w.r, fill: { paint: 'accent', opacity: 0.25 }, stroke: { paint: 'accent', width: 1.25 } });
  if (g.overWiresLine) nodes.push({ kind: 'path', d: g.overWiresLine, stroke: { paint: 'accent', width: 1.25 } });
  nodes.push(
    { kind: 'path', d: g.pitchDimPath, stroke: { paint: 'muted', width: 1.25 } },
    { kind: 'path', d: g.angleArcPath, stroke: { paint: 'muted', width: 1.25 } },
    { kind: 'text', ...g.majorLabel, text: L.major, paint: 'ink-strong' },
  );
  if (g.minorLabel && L.minor) nodes.push({ kind: 'text', ...g.minorLabel, text: L.minor, paint: 'ink-strong' });
  if (g.pitchDiaLabel && L.pitchDia) nodes.push({ kind: 'text', ...g.pitchDiaLabel, text: L.pitchDia, paint: 'accent', weight: 700 });
  if (g.overWiresLabel && L.overWires) nodes.push({ kind: 'text', ...g.overWiresLabel, text: L.overWires, paint: 'accent', weight: 700 });
  nodes.push(
    { kind: 'text', ...g.pitchLabel, text: L.pitch, paint: 'ink-strong' },
    { kind: 'text', ...g.angleLabel, text: L.angle, paint: 'ink-strong' },
  );
  return { width: VIEW.width, height: VIEW.height, ...(m.title ? { title: m.title } : {}), nodes };
}
