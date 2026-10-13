import { TONES } from './types.js';
import type { HexColor, Paint, Tone } from './types.js';

/** Defaults used when the host sets no `--u-scene-*` property. The four status tones match
 *  a conventional status palette, so a host's verdict colors and its diagrams agree. */
export const TONE_DEFAULTS: Readonly<Record<Tone, HexColor>> = {
  ink: '#334155',
  'ink-strong': '#0f172a',
  muted: '#64748b',
  faint: '#94a3b8',
  line: '#cbd5e1',
  paper: '#ffffff',
  primary: '#f97316',
  accent: '#0ea5e9',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#6366f1',
};

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function isTone(value: string): value is Tone {
  return (TONES as readonly string[]).includes(value);
}

/** The CSS color a paint renders as. Throws on anything that is not a tone or a hex color,
 *  because the result is written into markup. */
export function resolvePaint(paint: Paint): string {
  if (isTone(paint)) return `var(--u-scene-${paint}, ${TONE_DEFAULTS[paint]})`;
  if (HEX.test(paint)) return paint;
  throw new TypeError(`u-scene: invalid paint "${String(paint)}" - use a tone name or a hex color`);
}
