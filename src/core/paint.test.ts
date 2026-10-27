import { describe, it, expect } from 'vitest';
import { resolvePaint, isTone, TONE_DEFAULTS } from './paint.js';
import { TONES } from './types.js';

describe('resolvePaint', () => {
  it('maps a tone to a themable custom property with its default', () => {
    expect(resolvePaint('ink')).toBe('var(--u-scene-ink, #334155)');
    expect(resolvePaint('ok')).toBe('var(--u-scene-ok, #22c55e)');
  });

  it('passes a hex color through unchanged', () => {
    expect(resolvePaint('#d97706')).toBe('#d97706');
    expect(resolvePaint('#fff')).toBe('#fff');
  });

  it('rejects anything that is neither a tone nor a hex color', () => {
    expect(() => resolvePaint('red' as never)).toThrow(TypeError);
    expect(() => resolvePaint('#12' as never)).toThrow(TypeError);
    expect(() => resolvePaint('#fff" onload="x' as never)).toThrow(TypeError);
  });
});

describe('tones', () => {
  it('every tone has a default', () => {
    for (const t of TONES) expect(TONE_DEFAULTS[t]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('isTone narrows only known names', () => {
    expect(isTone('accent')).toBe(true);
    expect(isTone('#0ea5e9')).toBe(false);
  });
});
