import type { Scene, SceneNode } from '../core/types.js';
import type { Handle } from '../core/handles.js';
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
  /** Uncertainty band on the same scale; drawn only when both are present. Without `kFactor` the
   *  band is drawn alone, with no centre line. */
  kFactorMin?: number;
  kFactorMax?: number;
  labels: { thickness: string; insideRadius: string; bendAngle: string; neutralAxis?: string };
  title?: string;
  /**
   * Handles for the two inputs the figure shows directly. Each gives the input's range, its
   * accessible label and the current value as the host formats it; the preset places the handle
   * on the figure (inside apex / outside tangent point) and builds its track.
   */
  handles?: { insideRadius?: BendHandleSpec; bendAngle?: BendHandleSpec };
}

export interface BendHandleSpec {
  /** Range of the input, min < max. */
  min: number;
  max: number;
  /** One arrow-key step in input units (default a hundredth of the range). */
  step?: number;
  label: string;
  valueText: string;
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
  const g = bendSectionGeometry({
    thicknessMm: m.thicknessMm,
    insideRadiusMm: m.insideRadiusMm,
    bendAngleDeg: m.bendAngleDeg,
    kFactor: m.kFactor,
    kFactorMin: m.kFactorMin,
    kFactorMax: m.kFactorMax,
    handleRanges: {
      ...(m.handles?.insideRadius ? { insideRadius: [m.handles.insideRadius.min, m.handles.insideRadius.max] as const } : {}),
      ...(m.handles?.bendAngle ? { bendAngle: [m.handles.bendAngle.min, m.handles.bendAngle.max] as const } : {}),
    },
  }, VIEW);

  const nodes: SceneNode[] = [
    { kind: 'path', d: g.materialPath, fill: { paint: 'primary', opacity: 0.14 }, stroke: { paint: 'ink', width: 1.5, linejoin: 'round' } },
    { kind: 'path', d: g.angleRadii[0], stroke: { paint: 'faint', width: 1, dash: [3, 3] } },
    { kind: 'path', d: g.angleRadii[1], stroke: { paint: 'faint', width: 1, dash: [3, 3] } },
    { kind: 'path', d: g.angleArcPath, stroke: { paint: 'muted', width: 1.25 } },
  ];
  if (g.neutralBandPath) nodes.push({ kind: 'path', d: g.neutralBandPath, fill: { paint: 'accent', opacity: 0.18 } });
  if (g.neutralPath && m.labels.neutralAxis != null) nodes.push({ kind: 'path', d: g.neutralPath, stroke: { paint: 'accent', width: 1.5, dash: [6, 4] } });
  nodes.push(
    { kind: 'path', d: g.thicknessTick, stroke: { paint: 'muted', width: 1.25 } },
    { kind: 'path', d: g.radiusTick, stroke: { paint: 'muted', width: 1.25 } },
    { kind: 'text', ...g.thicknessLabel, text: m.labels.thickness, paint: 'ink-strong' },
    { kind: 'text', ...g.radiusLabel, text: m.labels.insideRadius, paint: 'ink-strong' },
    { kind: 'text', ...g.angleLabel, text: m.labels.bendAngle, paint: 'ink-strong' },
  );
  if (g.neutralLabel && m.labels.neutralAxis != null) nodes.push({ kind: 'text', ...g.neutralLabel, text: m.labels.neutralAxis, paint: 'accent', weight: 700 });

  const handles: Handle[] = [];
  const add = (id: 'insideRadius' | 'bendAngle', value: number) => {
    const spec = m.handles?.[id];
    const track = g.handleTracks[id];
    if (!spec || !track) return;
    handles.push({ id, param: id, value, track, ...(spec.step !== undefined ? { step: spec.step } : {}), label: spec.label, valueText: spec.valueText });
  };
  add('insideRadius', m.insideRadiusMm);
  add('bendAngle', m.bendAngleDeg);

  return { width: VIEW.width, height: VIEW.height, ...(m.title ? { title: m.title } : {}), nodes, ...(handles.length ? { handles } : {}) };
}
