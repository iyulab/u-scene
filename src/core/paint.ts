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
  ok: '#22c55e',
  warn: '#f59e0b',
  alarm: '#ef4444',
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

/** The neutral tones are text colors; every other paint is a mark color. */
const TEXT_TONES: ReadonlySet<Tone> = new Set<Tone>(['ink', 'ink-strong', 'muted', 'faint', 'line', 'paper']);

/** Share of the mark color in a text label; the rest is `ink-strong`. */
export const TEXT_TONE_SHARE = 60;

/**
 * The CSS color a text label renders as. A mark color - a status tone, or a preset's structural hex
 * such as the angle rays' orange - is chosen to read as a stroke or a fill, and at that brightness
 * it is 2.2-4.5:1 on white paper, under the 4.5:1 that small text needs (WCAG 1.4.3). Text therefore
 * mixes it with `ink-strong` - the darkest text on a light paper and the lightest on a dark one, as
 * each host already sets it - so a label keeps the hue of the mark it names and gains contrast in
 * both themes without a token of its own: 60/40 gives 5.1:1 or more on white and 7.5:1 or more on
 * slate-900 for the default tones. The neutral tones are text colors already and pass through.
 */
export function resolveTextPaint(paint: Paint): string {
  if (isTone(paint) && TEXT_TONES.has(paint)) return resolvePaint(paint);
  return `color-mix(in oklab, ${resolvePaint(paint)} ${TEXT_TONE_SHARE}%, ${resolvePaint('ink-strong')})`;
}
