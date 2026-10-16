/**
 * Handles: a scene's second control of a host input.
 *
 * A handle moves along a track — a polyline of stops, each pairing an input value with the screen
 * point that value is drawn at. The preset builds the track from the same transform that drew the
 * scene, so a handle always sits on the figure it controls, and a non-linear relation (a figure
 * normalised to its own size, an arc) is just more stops. The host owns the value: the element
 * reports where the pointer or a key puts it (`u-scene-param`), the host updates its input and
 * builds a new scene. u-scene never rounds a value — the host's input rules do.
 *
 * Pure functions here; the element only wires them to pointer and keyboard events.
 */
import type { Point } from './geometry.js';

export interface HandleStop {
  /** The input value at this stop. Values strictly increase along the track. */
  value: number;
  x: number;
  y: number;
}

export interface Handle {
  /** Unique within the scene; a plain identifier. */
  id: string;
  /** The host input this handle sets. */
  param: string;
  /** The input's current value — the handle is drawn at its point on the track. */
  value: number;
  /** At least two stops, values strictly increasing. Its first and last values bound the input. */
  track: readonly HandleStop[];
  /** One arrow-key step, in input units. Default: a hundredth of the track's range. PageUp/PageDown move ten. */
  step?: number;
  /** aria-valuetext — the value as the host formats it (u-scene never formats numbers). */
  valueText: string;
  /** Accessible name — the host's label for the input. */
  label: string;
}

export function trackRange(track: readonly HandleStop[]): { min: number; max: number } {
  return { min: track[0].value, max: track[track.length - 1].value };
}

/** The screen point of a value on the track; a value outside the track sits at its nearer end. */
export function handlePosition(track: readonly HandleStop[], value: number): Point {
  const first = track[0];
  const last = track[track.length - 1];
  if (value <= first.value) return { x: first.x, y: first.y };
  if (value >= last.value) return { x: last.x, y: last.y };
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1];
    const b = track[i];
    if (value <= b.value) {
      const f = (value - a.value) / (b.value - a.value);
      return { x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y) };
    }
  }
  return { x: last.x, y: last.y };
}

/**
 * The value under a screen point: the point is projected onto the nearest track segment and the
 * value interpolated there — so a pointer anywhere beside the track moves the handle along it.
 */
export function valueAtPoint(track: readonly HandleStop[], p: Point): number {
  let best = { d2: Infinity, value: track[0].value };
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1];
    const b = track[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const f = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const qx = a.x + f * dx;
    const qy = a.y + f * dy;
    const d2 = (p.x - qx) ** 2 + (p.y - qy) ** 2;
    if (d2 < best.d2) best = { d2, value: a.value + f * (b.value - a.value) };
  }
  return best.value;
}

/** The value after a key: `steps` arrow steps from the current value, kept inside the track's range. */
export function steppedValue(handle: Pick<Handle, 'value' | 'track' | 'step'>, steps: number): number {
  const { min, max } = trackRange(handle.track);
  const step = handle.step ?? (max - min) / 100;
  return Math.min(max, Math.max(min, handle.value + steps * step));
}
