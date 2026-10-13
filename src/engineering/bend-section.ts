import type { Scene, SceneNode } from '../core/types.js';
import { finite, nonNegative, positive } from './model-checks.js';
import { bendSectionGeometry } from './bend-section-geometry.js';
import type { BendSectionView } from './bend-section-geometry.js';

export interface BendSectionDiagramModel {
  thicknessMm: number;
  insideRadiusMm: number;
  bendAngleDeg: number;
  /** Neutral-axis factor (0-1). Optional: without it no neutral axis is drawn - a value
   *  the host did not compute is never invented. */
  kFactor?: number;
  /** Uncertainty band on the same scale; drawn only when both are present. */
  kFactorMin?: number;
  kFactorMax?: number;
  labels: { thickness: string; insideRadius: string; bendAngle: string; neutralAxis?: string };
  title?: string;
}

const VIEW: BendSectionView = { width: 340, height: 260, padding: 36 };

/** A sheet bent over its inside radius, dimensioned for thickness, radius, angle and,
 *  when given, the neutral axis. */
export function bendSectionDiagram(m: BendSectionDiagramModel): Scene {
  positive(m.thicknessMm, 'bendSectionDiagram thicknessMm');
  nonNegative(m.insideRadiusMm, 'bendSectionDiagram insideRadiusMm');
  finite(m.bendAngleDeg, 'bendSectionDiagram bendAngleDeg');
  if (m.kFactor != null) finite(m.kFactor, 'bendSectionDiagram kFactor');
  if (m.kFactorMin != null) finite(m.kFactorMin, 'bendSectionDiagram kFactorMin');
  if (m.kFactorMax != null) finite(m.kFactorMax, 'bendSectionDiagram kFactorMax');
  const showNeutral = m.kFactor != null && m.labels.neutralAxis != null;
  const g = bendSectionGeometry({
    thicknessMm: m.thicknessMm,
    insideRadiusMm: m.insideRadiusMm,
    bendAngleDeg: m.bendAngleDeg,
    // The arc radius needs some factor; mid-thickness is used but not drawn when absent.
    kFactor: m.kFactor ?? 0.5,
    kFactorMin: m.kFactorMin,
    kFactorMax: m.kFactorMax,
  }, VIEW);

  const nodes: SceneNode[] = [
    { kind: 'path', d: g.materialPath, fill: { paint: 'primary', opacity: 0.14 }, stroke: { paint: 'ink', width: 1.5, linejoin: 'round' } },
    { kind: 'path', d: g.angleRadii[0], stroke: { paint: 'faint', width: 1, dash: [3, 3] } },
    { kind: 'path', d: g.angleRadii[1], stroke: { paint: 'faint', width: 1, dash: [3, 3] } },
    { kind: 'path', d: g.angleArcPath, stroke: { paint: 'muted', width: 1.25 } },
  ];
  if (g.neutralBandPath) nodes.push({ kind: 'path', d: g.neutralBandPath, fill: { paint: 'accent', opacity: 0.18 } });
  if (showNeutral) nodes.push({ kind: 'path', d: g.neutralPath, stroke: { paint: 'accent', width: 1.5, dash: [6, 4] } });
  nodes.push(
    { kind: 'path', d: g.thicknessTick, stroke: { paint: 'muted', width: 1.25 } },
    { kind: 'path', d: g.radiusTick, stroke: { paint: 'muted', width: 1.25 } },
    { kind: 'text', ...g.thicknessLabel, text: m.labels.thickness, paint: 'ink-strong' },
    { kind: 'text', ...g.radiusLabel, text: m.labels.insideRadius, paint: 'ink-strong' },
    { kind: 'text', ...g.angleLabel, text: m.labels.bendAngle, paint: 'ink-strong' },
  );
  if (showNeutral) nodes.push({ kind: 'text', ...g.neutralLabel, text: m.labels.neutralAxis!, paint: 'accent', weight: 700 });

  return { width: VIEW.width, height: VIEW.height, ...(m.title ? { title: m.title } : {}), nodes };
}
