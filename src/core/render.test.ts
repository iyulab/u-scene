import { describe, it, expect } from 'vitest';
import { renderToSvgString } from './render.js';
import type { Scene } from './types.js';

const base: Scene = { width: 340, height: 260, nodes: [] };

describe('renderToSvgString', () => {
  it('renders the root with viewBox, role and default max-width', () => {
    expect(renderToSvgString(base)).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" class="u-scene" viewBox="0 0 340 260" role="img" ' +
        'style="width:100%;height:auto;max-width:26rem;margin:0 auto;display:block"></svg>',
    );
  });

  it('escapes text and title', () => {
    const out = renderToSvgString({
      ...base,
      title: 'A & "B"',
      nodes: [{ kind: 'text', x: 1, y: 2, text: 'W/T < 2', anchor: 'middle', paint: 'ink-strong' }],
    });
    expect(out).toContain('<title>A &amp; &quot;B&quot;</title>');
    expect(out).toContain('>W/T &lt; 2</text>');
  });

  it('renders the description as an escaped <desc> right after <title>', () => {
    const out = renderToSvgString({ ...base, title: 'T', description: 'Rays at 30 & <45> degrees' });
    expect(out).toContain('<title>T</title><desc>Rays at 30 &amp; &lt;45&gt; degrees</desc>');
    expect(renderToSvgString(base)).not.toContain('<desc>');
  });

  it('renders text with defaults and overrides', () => {
    const out = renderToSvgString({
      ...base,
      nodes: [
        { kind: 'text', x: 10.126, y: 20, text: 'a', anchor: 'end', paint: 'muted' },
        { kind: 'text', x: 0, y: 0, text: 'b', anchor: 'start', paint: '#0ea5e9', size: 12, weight: 500, italic: true },
      ],
    });
    expect(out).toContain('<text x="10.13" y="20" text-anchor="end" fill="var(--u-scene-muted, #64748b)" font-size="11" font-weight="600">a</text>');
    expect(out).toContain('<text x="0" y="0" text-anchor="start" fill="#0ea5e9" font-size="12" font-weight="500" font-style="italic">b</text>');
  });

  it('renders shapes with fill, stroke and dash', () => {
    const out = renderToSvgString({
      ...base,
      nodes: [
        { kind: 'rect', x: 1, y: 2, width: 3, height: 4, fill: { paint: 'primary', opacity: 0.22 }, stroke: { paint: 'ink', width: 1.25 } },
        { kind: 'circle', id: 'hole-1', cx: 5, cy: 6, r: 2, fill: { paint: 'paper' } },
        { kind: 'line', x1: 0, y1: 0, x2: 9, y2: 9, stroke: { paint: 'ink', width: 2.5, dash: [6, 4], linecap: 'round' } },
        { kind: 'path', d: 'M 0 0 L 1 1', fill: { paint: '#d97706', opacity: 0.8, rule: 'evenodd' }, stroke: { paint: 'ink', width: 1.5, linejoin: 'round', opacity: 0.35 } },
      ],
    });
    expect(out).toContain('<rect x="1" y="2" width="3" height="4" fill="var(--u-scene-primary, #f97316)" fill-opacity="0.22" stroke="var(--u-scene-ink, #334155)" stroke-width="1.25"/>');
    expect(out).toContain('<circle cx="5" cy="6" r="2" fill="var(--u-scene-paper, #ffffff)" data-id="hole-1"/>');
    expect(out).toContain('<line x1="0" y1="0" x2="9" y2="9" fill="none" stroke="var(--u-scene-ink, #334155)" stroke-width="2.5" stroke-dasharray="6 4" stroke-linecap="round"/>');
    expect(out).toContain('<path d="M 0 0 L 1 1" fill="#d97706" fill-opacity="0.8" fill-rule="evenodd" stroke="var(--u-scene-ink, #334155)" stroke-width="1.5" stroke-opacity="0.35" stroke-linejoin="round"/>');
  });

  it('arrow marker id is deterministic per paint and defined once', () => {
    const arc = { kind: 'path' as const, d: 'M 0 0 L 5 5', stroke: { paint: '#94a3b8' as const, width: 1.5 }, markerEnd: 'arrow' as const };
    const out = renderToSvgString({ ...base, nodes: [arc, arc] });
    expect(out.match(/<marker /g)).toHaveLength(1);
    expect(out).toContain('<marker id="u-scene-arrow-94a3b8" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#94a3b8"/></marker>');
    expect(out).toContain('marker-end="url(#u-scene-arrow-94a3b8)"');
  });

  it('honours maxWidth', () => {
    expect(renderToSvgString({ ...base, maxWidth: '28rem' })).toContain('max-width:28rem');
  });

  it('throws on an invalid scene instead of drawing it', () => {
    expect(() => renderToSvgString({ ...base, nodes: [{ kind: 'circle', cx: 0, cy: 0, r: Number.NaN }] })).toThrow(TypeError);
  });
});
