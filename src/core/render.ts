import { assertScene } from './validate.js';
import { resolvePaint } from './paint.js';
import type { Fill, Paint, Scene, SceneNode, Stroke } from './types.js';

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);
}

/** Two decimals, trailing zeros dropped: 340 -> "340", 10.126 -> "10.13". */
function num(n: number): string {
  return String(Number(n.toFixed(2)));
}

function markerId(paint: Paint): string {
  return `u-scene-arrow-${paint.replace('#', '')}`;
}

function paintAttrs(fill: Fill | undefined, stroke: Stroke | undefined): string {
  const out: string[] = [];
  if (fill) {
    out.push(`fill="${esc(resolvePaint(fill.paint))}"`);
    if (fill.opacity !== undefined) out.push(`fill-opacity="${num(fill.opacity)}"`);
    if (fill.rule) out.push(`fill-rule="${fill.rule}"`);
  } else {
    out.push('fill="none"');
  }
  if (stroke) {
    out.push(`stroke="${esc(resolvePaint(stroke.paint))}"`, `stroke-width="${num(stroke.width)}"`);
    if (stroke.dash) out.push(`stroke-dasharray="${stroke.dash.map(num).join(' ')}"`);
    if (stroke.opacity !== undefined) out.push(`stroke-opacity="${num(stroke.opacity)}"`);
    if (stroke.linecap) out.push(`stroke-linecap="${stroke.linecap}"`);
    if (stroke.linejoin) out.push(`stroke-linejoin="${stroke.linejoin}"`);
  }
  return out.join(' ');
}

function idAttr(id: string | undefined): string {
  return id ? ` data-id="${id}"` : '';
}

function renderNode(n: SceneNode, markers: Map<string, Paint>): string {
  switch (n.kind) {
    case 'text': {
      const italic = n.italic ? ' font-style="italic"' : '';
      return `<text x="${num(n.x)}" y="${num(n.y)}" text-anchor="${n.anchor}" fill="${esc(resolvePaint(n.paint))}" ` +
        `font-size="${num(n.size ?? 11)}" font-weight="${n.weight ?? 600}"${italic}${idAttr(n.id)}>${esc(n.text)}</text>`;
    }
    case 'path': {
      let marker = '';
      if (n.markerEnd === 'arrow') {
        const paint = n.stroke?.paint ?? 'ink';
        markers.set(markerId(paint), paint);
        marker = ` marker-end="url(#${markerId(paint)})"`;
      }
      return `<path d="${esc(n.d)}" ${paintAttrs(n.fill, n.stroke)}${marker}${idAttr(n.id)}/>`;
    }
    case 'line':
      return `<line x1="${num(n.x1)}" y1="${num(n.y1)}" x2="${num(n.x2)}" y2="${num(n.y2)}" ${paintAttrs(n.fill, n.stroke)}${idAttr(n.id)}/>`;
    case 'circle':
      return `<circle cx="${num(n.cx)}" cy="${num(n.cy)}" r="${num(n.r)}" ${paintAttrs(n.fill, n.stroke)}${idAttr(n.id)}/>`;
    case 'rect':
      return `<rect x="${num(n.x)}" y="${num(n.y)}" width="${num(n.width)}" height="${num(n.height)}" ${paintAttrs(n.fill, n.stroke)}${idAttr(n.id)}/>`;
  }
}

/**
 * Renders a scene to a self-contained SVG string. Needs no DOM, so it runs at build time
 * as well as in the browser; the `<u-scene>` element renders through this same function.
 * Arrow marker ids derive from their paint, so identical markers from several scenes on
 * one page define the same thing.
 */
export function renderToSvgString(scene: Scene): string {
  assertScene(scene);
  const markers = new Map<string, Paint>();
  const body = scene.nodes.map((n) => renderNode(n, markers)).join('');
  const defs = markers.size === 0 ? '' : `<defs>${[...markers].map(([id, paint]) =>
    `<marker id="${id}" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">` +
    `<path d="M 0 0 L 8 4 L 0 8 z" fill="${esc(resolvePaint(paint))}"/></marker>`).join('')}</defs>`;
  const title = scene.title ? `<title>${esc(scene.title)}</title>` : '';
  const style = `width:100%;height:auto;max-width:${scene.maxWidth ?? '26rem'};margin:0 auto;display:block`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="u-scene" viewBox="0 0 ${num(scene.width)} ${num(scene.height)}" ` +
    `role="img" style="${style}">${title}${defs}${body}</svg>`;
}
