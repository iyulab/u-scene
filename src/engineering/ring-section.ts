import type { Scene, SceneNode } from '../core/types.js';
import { nonNegative, positive } from './model-checks.js';
import { ringSectionGeometry } from './ring-section-geometry.js';
import type { RingSectionView } from './ring-section-geometry.js';

export interface RingSectionDiagramModel {
  outerDiameterMm: number;
  /** 0 draws a solid disc. */
  innerDiameterMm: number;
  /** Optional concentric reference circle. */
  referenceDiameterMm?: number;
  /** Optional bolt pattern for a face view. */
  boltCircleDiameterMm?: number;
  boltCount?: number;
  /** Up to four labels stacked in the right-hand gutter. */
  extraLabels?: string[];
  labels: { outer: string; inner: string; wall: string; note?: string; notToScale: string };
  title?: string;
}

const VIEW: RingSectionView = { width: 360, height: 280, padding: 24 };

/** Concentric outer and inner circles. A wall thinner than the minimum visible width is
 *  drawn thicker and marked as not to scale; the dimension labels carry the real values. */
export function ringSectionDiagram(m: RingSectionDiagramModel): Scene {
  positive(m.outerDiameterMm, 'ringSectionDiagram outerDiameterMm');
  nonNegative(m.innerDiameterMm, 'ringSectionDiagram innerDiameterMm');
  if (m.referenceDiameterMm != null) positive(m.referenceDiameterMm, 'ringSectionDiagram referenceDiameterMm');
  if (m.boltCircleDiameterMm != null) positive(m.boltCircleDiameterMm, 'ringSectionDiagram boltCircleDiameterMm');
  if (m.boltCount != null) nonNegative(m.boltCount, 'ringSectionDiagram boltCount');
  const g = ringSectionGeometry({
    outerDiameterMm: m.outerDiameterMm,
    innerDiameterMm: m.innerDiameterMm,
    referenceDiameterMm: m.referenceDiameterMm,
    boltCircleDiameterMm: m.boltCircleDiameterMm,
    boltCount: m.boltCount,
  }, VIEW);
  const hasHole = g.innerDimPath != null;
  const nodes: SceneNode[] = [
    { kind: 'path', d: g.ringPath, fill: { paint: '#d97706', opacity: 0.8, rule: 'evenodd' }, stroke: { paint: 'ink', width: 1.25 } },
  ];
  if (g.referencePath) nodes.push({ kind: 'path', d: g.referencePath, stroke: { paint: 'ink-strong', width: 1.25 } });
  if (g.boltCirclePath) nodes.push({ kind: 'path', d: g.boltCirclePath, stroke: { paint: 'muted', width: 1, dash: [5, 4] } });
  for (const h of g.boltHoles ?? []) nodes.push({ kind: 'circle', cx: h.cx, cy: h.cy, r: h.r, fill: { paint: 'paper' }, stroke: { paint: 'ink-strong', width: 1.25 } });
  nodes.push({ kind: 'path', d: g.outerDimPath, stroke: { paint: 'muted', width: 1 } });
  if (hasHole) {
    nodes.push(
      { kind: 'path', d: g.innerDimPath!, stroke: { paint: 'muted', width: 1 } },
      { kind: 'path', d: g.wallDimPath!, stroke: { paint: 'muted', width: 1 } },
    );
  }
  nodes.push({ kind: 'text', ...g.outerLabel, text: m.labels.outer, paint: 'ink-strong' });
  if (hasHole) {
    nodes.push(
      { kind: 'text', ...g.innerLabel, text: m.labels.inner, paint: 'ink-strong' },
      { kind: 'text', ...g.wallLabel, text: m.labels.wall, paint: 'ink-strong' },
    );
  }
  if (g.clamped) nodes.push({ kind: 'text', x: g.wallLabel.x, y: g.wallLabel.y - 16, anchor: 'start', text: m.labels.notToScale, paint: 'muted', weight: 500, italic: true });
  (m.extraLabels ?? []).slice(0, g.gutterLabels.length).forEach((text, i) => nodes.push({ kind: 'text', ...g.gutterLabels[i], text, paint: 'ink-strong' }));
  if (m.labels.note) nodes.push({ kind: 'text', ...g.noteLabel, text: m.labels.note, paint: 'ink-strong', weight: 700 });
  return { width: VIEW.width, height: g.viewHeight, ...(m.title ? { title: m.title } : {}), nodes };
}
