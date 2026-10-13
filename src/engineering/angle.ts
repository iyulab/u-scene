import { arcPath, polarPoint } from '../core/geometry.js';
import type { LabelBox, LabelPlacement } from '../core/geometry.js';
import type { HexColor, Paint, Scene, SceneNode } from '../core/types.js';
import {
  RAY_LABEL_ASSUMED_WIDTH, RAY_LABEL_WORST_CASE_WIDTH, RAY_VIEW,
  deltaLabelPosition, rayLabelBox, rayLabelPlacements,
} from './angle-geometry.js';

export type AngleTone = 'primary' | 'accent' | 'muted';
export type Severity = 'success' | 'warning' | 'danger' | 'info';

export interface AngleRay {
  /** Degrees, counter-clockwise from +x. */
  angleDeg: number;
  /** Shown as given. */
  label: string;
  style?: 'solid' | 'dashed';
  /** Structural role color; ignored when `severity` is set. */
  tone?: AngleTone;
  /** Verdict color; wins over `tone`. */
  severity?: Severity;
}

export interface AngleBand {
  fromDeg: number;
  toDeg: number;
  label?: string;
  severity?: Severity;
}

export interface AngleDelta {
  fromDeg: number;
  toDeg: number;
  label: string;
}

export interface AngleDiagramModel {
  rays: AngleRay[];
  band?: AngleBand;
  delta?: AngleDelta;
  baselineLabel?: string;
  title?: string;
}

/** Structural colors, fixed so they never read as a verdict: each hue sits at least 40°
 *  away from every status color. */
export const ANGLE_TONE_HEX = {
  primary: '#f97316',
  accent: '#0ea5e9',
  muted: '#94a3b8',
} as const satisfies Record<AngleTone, HexColor>;

export function rayPaint(ray: Pick<AngleRay, 'tone' | 'severity'>): Paint {
  return ray.severity ?? ANGLE_TONE_HEX[ray.tone ?? 'primary'];
}

const { cx: CX, cy: CY, r: R, width: W, height: H } = RAY_VIEW;
const DELTA_R = 62;
/** Band label radius as a share of R - close to the vertex, clear of the delta label. */
const BAND_LABEL_R_FACTOR = 0.45;
const DELTA_LABEL_R_OFFSET = 22;

function bandNodes(band: AngleBand): SceneNode[] {
  const paint = band.severity ?? 'info';
  const a = polarPoint(CX, CY, R, band.fromDeg);
  const b = polarPoint(CX, CY, R, band.toDeg);
  const large = Math.abs(band.toDeg - band.fromDeg) > 180 ? 1 : 0;
  const wedge = `M ${CX} ${CY} L ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${large} 0 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
  const nodes: SceneNode[] = [{ kind: 'path', d: wedge, fill: { paint, opacity: 0.14 }, stroke: { paint, width: 1, opacity: 0.35 } }];
  if (band.label) {
    const mid = polarPoint(CX, CY, R * BAND_LABEL_R_FACTOR, (band.fromDeg + band.toDeg) / 2);
    nodes.push({ kind: 'text', x: mid.x, y: mid.y, text: band.label, anchor: 'middle', paint });
  }
  return nodes;
}

function rayNodes(ray: AngleRay, placement: LabelPlacement): SceneNode[] {
  const paint = rayPaint(ray);
  const tip = polarPoint(CX, CY, R, ray.angleDeg);
  return [
    { kind: 'line', x1: CX, y1: CY, x2: tip.x, y2: tip.y, stroke: { paint, width: 2.5, linecap: 'round', ...(ray.style === 'dashed' ? { dash: [6, 4] } : {}) } },
    { kind: 'text', x: placement.x, y: placement.y, text: ray.label, anchor: placement.anchor, paint },
  ];
}

function deltaNodes(delta: AngleDelta, avoid: LabelBox[]): SceneNode[] {
  const mid = deltaLabelPosition(delta.fromDeg, delta.toDeg, DELTA_R + DELTA_LABEL_R_OFFSET, avoid, { cx: CX, cy: CY, width: W, height: H });
  return [
    { kind: 'path', d: arcPath(CX, CY, DELTA_R, delta.fromDeg, delta.toDeg), stroke: { paint: ANGLE_TONE_HEX.muted, width: 1.5 }, markerEnd: 'arrow' },
    { kind: 'text', x: mid.x, y: mid.y, text: delta.label, anchor: 'middle', paint: 'ink-strong', weight: 700 },
  ];
}

/**
 * One or more angles on a protractor, with an optional compliance band and an optional
 * delta arc between two angles. Returns null when there is nothing to draw.
 */
export function angleDiagram(m: AngleDiagramModel): Scene | null {
  if (m.rays.length === 0) return null;

  // Fixed texts the ray labels must avoid, sized at worst-case width.
  const reserved: LabelBox[] = m.baselineLabel
    ? [rayLabelBox({ x: CX + R, y: CY + 14, anchor: 'end' }, RAY_LABEL_WORST_CASE_WIDTH)]
    : [];
  const bandAvoid: LabelBox[] = m.band?.label
    ? [rayLabelBox({ ...polarPoint(CX, CY, R * BAND_LABEL_R_FACTOR, (m.band.fromDeg + m.band.toDeg) / 2), anchor: 'middle' }, RAY_LABEL_WORST_CASE_WIDTH)]
    : [];
  const fixed = [...reserved, ...bandAvoid];
  const placements = rayLabelPlacements(m.rays.map((r) => r.angleDeg), RAY_VIEW, fixed);
  const deltaAvoid = [...fixed, ...placements.map((p) => rayLabelBox(p, RAY_LABEL_ASSUMED_WIDTH))];

  const nodes: SceneNode[] = [];
  if (m.band) nodes.push(...bandNodes(m.band));
  nodes.push({ kind: 'line', x1: CX - R, y1: CY, x2: CX + R, y2: CY, stroke: { paint: 'line', width: 1.5 } });
  if (m.baselineLabel) nodes.push({ kind: 'text', x: CX + R, y: CY + 14, text: m.baselineLabel, anchor: 'end', paint: 'muted', weight: 500 });
  m.rays.forEach((ray, i) => nodes.push(...rayNodes(ray, placements[i])));
  if (m.delta) nodes.push(...deltaNodes(m.delta, deltaAvoid));
  nodes.push({ kind: 'circle', cx: CX, cy: CY, r: 3, fill: { paint: 'muted' } });

  return { width: W, height: H, ...(m.title ? { title: m.title } : {}), nodes };
}
