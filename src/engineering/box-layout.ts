import type { Scene, SceneNode } from '../core/types.js';
import { finite, nonNegative, positive } from './model-checks.js';
import { linearDimensionNodes } from './linear-dimension.js';
import { BOX_LAYOUT_MIN_PX, boxLayoutGeometry, boxLayoutLimits } from './box-layout-geometry.js';
import type { BoxLayoutBox, BoxLayoutView } from './box-layout-geometry.js';

/**
 * One layer of identical boxes on a floor, seen from above, and the stack of layers beside it seen
 * from the side, on one scale - a pallet or a container load. The boxes come from the caller (the
 * calculation decides how many fit and where); the drawing never counts or places anything.
 */
export interface BoxLayoutDiagramModel {
  /** Floor length (the x of the plan) and width (the y), in the same unit as the boxes and heights. */
  floorLength: number;
  floorWidth: number;
  /** The boxes of one layer, from the floor's corner. Empty draws nothing. */
  boxes: readonly BoxLayoutBox[];
  /** Layers in the stack (a whole number, already computed). Less than 1 draws nothing. */
  layers: number;
  boxHeight: number;
  /** Deck under the load (a pallet's height). Default 0. */
  deckHeight?: number;
  /** A height the stack must stay under, drawn as a dashed line. */
  limitHeight?: number;
  /** Pre-formatted text; `limit` is shown when `limitHeight` is given. */
  labels: { length: string; width: string; height: string; limit?: string };
  title?: string;
}

const VIEW: BoxLayoutView & { width: number } = { width: 440, maxHeight: 400 };

/** The most boxes in a layer, and layers in a stack, that can be drawn apart in this view (23,146 boxes, 163 layers) - above them `boxLayoutDiagram` returns `null`. */
export const BOX_LAYOUT_MAX_BOXES = boxLayoutLimits(VIEW).maxBoxes;
export const BOX_LAYOUT_MAX_LAYERS = boxLayoutLimits(VIEW).maxLayers;
export { BOX_LAYOUT_MIN_PX };

/** `null` when there is nothing to draw (no boxes, no layers) or the boxes would be a smear:
 *  the smallest box edge, or one layer's height, would be drawn under `BOX_LAYOUT_MIN_PX`. */
export function boxLayoutDiagram(m: BoxLayoutDiagramModel): Scene | null {
  positive(m.floorLength, 'boxLayoutDiagram floorLength');
  positive(m.floorWidth, 'boxLayoutDiagram floorWidth');
  positive(m.boxHeight, 'boxLayoutDiagram boxHeight');
  finite(m.layers, 'boxLayoutDiagram layers');
  const deckHeight = m.deckHeight ?? 0;
  nonNegative(deckHeight, 'boxLayoutDiagram deckHeight');
  if (m.limitHeight !== undefined) positive(m.limitHeight, 'boxLayoutDiagram limitHeight');
  m.boxes.forEach((b, i) => {
    nonNegative(b.x, `boxLayoutDiagram boxes[${i}].x`);
    nonNegative(b.y, `boxLayoutDiagram boxes[${i}].y`);
    positive(b.length, `boxLayoutDiagram boxes[${i}].length`);
    positive(b.width, `boxLayoutDiagram boxes[${i}].width`);
    // a box outside the floor would be drawn where the calculation did not put it
    const eps = 1e-6 * Math.max(m.floorLength, m.floorWidth);
    if (b.x + b.length > m.floorLength + eps || b.y + b.width > m.floorWidth + eps) {
      throw new TypeError(`u-scene: boxLayoutDiagram boxes[${i}] lies outside the floor`);
    }
  });
  if (m.boxes.length === 0 || m.layers < 1) return null;
  if (m.boxes.length > BOX_LAYOUT_MAX_BOXES || Math.floor(m.layers) > BOX_LAYOUT_MAX_LAYERS) return null;
  const layers = Math.floor(m.layers);

  const g = boxLayoutGeometry({ ...m, layers, deckHeight }, VIEW);
  if (g.minEdgePx < BOX_LAYOUT_MIN_PX || g.layerPx < BOX_LAYOUT_MIN_PX) return null;

  const box = { fill: { paint: 'primary' as const, opacity: 0.22 }, stroke: { paint: 'ink' as const, width: 1 } };
  const nodes: SceneNode[] = [
    { kind: 'rect', ...g.floorRect, fill: { paint: 'primary', opacity: 0.06 }, stroke: { paint: 'ink', width: 1.5 } },
    ...g.planBoxes.map((r): SceneNode => ({ kind: 'rect', ...r, ...box })),
  ];
  if (g.deckRect) nodes.push({ kind: 'rect', ...g.deckRect, fill: { paint: 'muted', opacity: 0.35 }, stroke: { paint: 'muted', width: 1 } });
  nodes.push(...g.stackBoxes.map((r): SceneNode => ({ kind: 'rect', ...r, ...box })));
  const left = g.floorRect.x;
  const right = g.floorRect.x + g.floorRect.width;
  nodes.push({ kind: 'line', x1: left - 6, y1: g.groundY, x2: right + 6, y2: g.groundY, stroke: { paint: 'ink', width: 1.5 } });
  if (g.limitY !== undefined) {
    nodes.push({ kind: 'line', x1: left, y1: g.limitY, x2: right, y2: g.limitY, stroke: { paint: 'warn', width: 1.25, dash: [5, 3] } });
    if (m.labels.limit) nodes.push({ kind: 'text', x: left + 2, y: g.limitY - 4, text: m.labels.limit, anchor: 'start', paint: 'warn' });
  }

  // The two vertical spans carry their text beside the line (anchored away from the drawing), the
  // horizontal one above it, so a long label never runs off the side of the view.
  nodes.push(...linearDimensionNodes({ ...g.lengthSpan, offset: 16, label: m.labels.length }));
  const verticals: [typeof g.widthSpan, string, 'end' | 'start'][] = [
    [g.widthSpan, m.labels.width, 'end'],
    [g.heightSpan, m.labels.height, 'start'],
  ];
  for (const [span, label, anchor] of verticals) {
    nodes.push(...linearDimensionNodes({ ...span, offset: 12, label: '' }).filter((n) => !(n.kind === 'text' && n.text === '')));
    const x = span.from.x + (anchor === 'end' ? -22 : 22);
    nodes.push({ kind: 'text', x, y: (span.from.y + span.to.y) / 2 + 4, text: label, anchor, paint: 'ink-strong' });
  }

  return { width: VIEW.width, height: g.viewHeight, maxWidth: '32rem', ...(m.title ? { title: m.title } : {}), nodes };
}
