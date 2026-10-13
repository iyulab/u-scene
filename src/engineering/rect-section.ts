import type { Scene, SceneNode } from '../core/types.js';
import { rectSectionGeometry } from './rect-section-geometry.js';
import type { RectSectionKind, RectSectionSubstrate, RectSectionView } from './rect-section-geometry.js';

/** `opening`: a gap of the given width through a plate. `strip`: a conductor of the given
 *  width and thickness on (`below`) or inside (`embedded`) a substrate. */
export interface RectSectionDiagramModel {
  kind: RectSectionKind;
  widthMm: number;
  thicknessMm: number;
  substrate?: RectSectionSubstrate;
  labels: { width: string; thickness: string; ratio?: string };
  title?: string;
}

const VIEW: RectSectionView = { width: 360, height: 230, padding: 24 };

/** Ratios that cannot be drawn to scale lift the short side to a minimum visible size and
 *  break the long dimension line; the labels carry the real values. */
export function rectSectionDiagram(m: RectSectionDiagramModel): Scene {
  const g = rectSectionGeometry({ kind: m.kind, widthMm: m.widthMm, thicknessMm: m.thicknessMm, substrate: m.substrate }, VIEW);
  const material = m.kind === 'strip'
    ? { paint: '#d97706' as const, opacity: 0.85 }
    : { paint: 'primary' as const, opacity: 0.22 };
  const nodes: SceneNode[] = [];
  if (g.substrateRect) nodes.push({ kind: 'rect', ...g.substrateRect, fill: { paint: '#16a34a', opacity: 0.16 }, stroke: { paint: 'muted', width: 1 } });
  for (const b of g.materialRects) nodes.push({ kind: 'rect', ...b, fill: material, stroke: { paint: 'ink', width: 1.25 } });
  nodes.push(
    { kind: 'path', d: g.widthDimPath, stroke: { paint: 'muted', width: 1 } },
    { kind: 'path', d: g.thicknessDimPath, stroke: { paint: 'muted', width: 1 } },
  );
  if (g.breakPath) nodes.push({ kind: 'path', d: g.breakPath, stroke: { paint: 'ink-strong', width: 1.5 } });
  nodes.push(
    { kind: 'text', ...g.widthLabel, text: m.labels.width, paint: 'ink-strong' },
    { kind: 'text', ...g.thicknessLabel, text: m.labels.thickness, paint: 'ink-strong' },
  );
  if (m.labels.ratio) nodes.push({ kind: 'text', ...g.ratioLabel, text: m.labels.ratio, paint: 'ink-strong', weight: 700 });
  return { width: VIEW.width, height: g.viewHeight, maxWidth: '28rem', ...(m.title ? { title: m.title } : {}), nodes };
}
