import { resolvePaint } from './paint.js';
import type { Fill, Scene, SceneNode, Stroke } from './types.js';

const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]*$/;
const REM = /^\d+(?:\.\d+)?rem$/;
const ID = /^[A-Za-z][\w-]*$/;

function fail(at: string, why: string): never {
  throw new TypeError(`u-scene: ${at} ${why}`);
}

function finite(value: number, at: string): void {
  if (!Number.isFinite(value)) fail(at, `must be a finite number (got ${value})`);
}

function unit(value: number | undefined, at: string): void {
  if (value === undefined) return;
  finite(value, at);
  if (value < 0 || value > 1) fail(at, `must be within [0, 1] (got ${value})`);
}

function stroke(s: Stroke | undefined, at: string): void {
  if (!s) return;
  resolvePaint(s.paint);
  finite(s.width, `${at}.stroke.width`);
  unit(s.opacity, `${at}.stroke.opacity`);
  s.dash?.forEach((d, i) => finite(d, `${at}.stroke.dash[${i}]`));
}

function fill(f: Fill | undefined, at: string): void {
  if (!f) return;
  resolvePaint(f.paint);
  unit(f.opacity, `${at}.fill.opacity`);
}

function node(n: SceneNode, at: string): void {
  if (n.id !== undefined && !ID.test(n.id)) fail(`${at}.id`, `must be a plain identifier (got "${n.id}")`);
  switch (n.kind) {
    case 'path':
      if (!PATH_DATA.test(n.d)) fail(`${at}.d`, `is not valid path data: "${n.d.slice(0, 40)}"`);
      break;
    case 'line':
      finite(n.x1, `${at}.x1`); finite(n.y1, `${at}.y1`); finite(n.x2, `${at}.x2`); finite(n.y2, `${at}.y2`);
      break;
    case 'circle':
      finite(n.cx, `${at}.cx`); finite(n.cy, `${at}.cy`); finite(n.r, `${at}.r`);
      break;
    case 'rect':
      finite(n.x, `${at}.x`); finite(n.y, `${at}.y`); finite(n.width, `${at}.width`); finite(n.height, `${at}.height`);
      break;
    case 'text':
      finite(n.x, `${at}.x`); finite(n.y, `${at}.y`);
      if (n.size !== undefined) finite(n.size, `${at}.size`);
      resolvePaint(n.paint);
      return;
  }
  stroke(n.stroke, at);
  fill(n.fill, at);
}

/** Throws a TypeError naming the first malformed field. A scene that fails here would
 *  otherwise draw something wrong, which is worse than drawing nothing. */
export function assertScene(scene: Scene): void {
  if (!Number.isFinite(scene.width) || scene.width <= 0) fail('width', `must be a positive finite number (got ${scene.width})`);
  if (!Number.isFinite(scene.height) || scene.height <= 0) fail('height', `must be a positive finite number (got ${scene.height})`);
  if (scene.maxWidth !== undefined && !REM.test(scene.maxWidth)) fail('maxWidth', `must be a rem length (got "${scene.maxWidth}")`);
  scene.nodes.forEach((n, i) => node(n, `nodes[${i}]`));
}
