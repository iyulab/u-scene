import type { Handle } from './handles.js';

/** Semantic color names. Each resolves to `var(--u-scene-<tone>, <default>)`, so a host
 *  can theme every scene (including dark mode) by setting those custom properties. */
export const TONES = [
  'ink', 'ink-strong', 'muted', 'faint', 'line', 'paper',
  'primary', 'accent',
  'ok', 'warn', 'alarm', 'info',
] as const;

export type Tone = (typeof TONES)[number];
export type HexColor = `#${string}`;
/** A tone name, or a fixed hex color when the color must not follow the theme. */
export type Paint = Tone | HexColor;

export interface Stroke {
  paint: Paint;
  width: number;
  dash?: readonly number[];
  opacity?: number;
  linecap?: 'butt' | 'round' | 'square';
  linejoin?: 'miter' | 'round' | 'bevel';
}

export interface Fill {
  paint: Paint;
  opacity?: number;
  rule?: 'nonzero' | 'evenodd';
}

interface ShapeBase {
  /** Rendered as `data-id`; a plain identifier. */
  id?: string;
  /** Absent means no fill. */
  fill?: Fill;
  stroke?: Stroke;
}

export interface PathNode extends ShapeBase {
  kind: 'path';
  /** SVG path data in viewBox units. */
  d: string;
  markerEnd?: 'arrow';
}

export interface LineNode extends ShapeBase {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CircleNode extends ShapeBase {
  kind: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface RectNode extends ShapeBase {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextNode {
  kind: 'text';
  id?: string;
  x: number;
  y: number;
  /** Shown exactly as given: u-scene never formats or translates labels. */
  text: string;
  anchor: 'start' | 'middle' | 'end';
  paint: Paint;
  /** Font size in viewBox units. Default 11. */
  size?: number;
  /** Default 600. */
  weight?: 400 | 500 | 600 | 700;
  italic?: boolean;
}

export type SceneNode = PathNode | LineNode | CircleNode | RectNode | TextNode;

/** A drawing in viewBox units: `0 0 width height`. */
export interface Scene {
  width: number;
  height: number;
  /** Accessible name, rendered as `<title>`. */
  title?: string;
  /** Longer accessible description, rendered as `<desc>`. Shown exactly as given, escaped. */
  description?: string;
  /** CSS max-width of the rendered SVG, a rem length. Default `26rem`. */
  maxWidth?: string;
  nodes: readonly SceneNode[];
  /**
   * Controls of host inputs drawn over the scene by `<u-scene>` (see `handles.ts`). Never part of
   * `renderToSvgString` — a static drawing has nothing to drag.
   */
  handles?: readonly Handle[];
}
