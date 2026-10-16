import { LitElement, css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { renderToSvgString } from '../core/render.js';
import { resolvePaint } from '../core/paint.js';
import { handlePosition, steppedValue, trackRange, valueAtPoint } from '../core/handles.js';
import type { Handle } from '../core/handles.js';
import type { Scene } from '../core/types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Handle radius in viewBox units — a comfortable pointer target at the default scene size. */
const HANDLE_R = 7;

/** Detail of the `u-scene-param` event: the host input a handle sets and the value it was moved to. */
export interface USceneParamDetail {
  param: string;
  value: number;
}

/**
 * Renders a scene. The markup comes from `renderToSvgString`, the same function a host
 * uses at build time, so the static and the live drawing cannot differ. Every label in
 * that markup is escaped by the renderer.
 *
 * A scene with `handles` gets them drawn over the static markup: each is a focusable
 * `role="slider"` a pointer can drag along its track and the keyboard can step (arrows, PageUp /
 * PageDown for ten steps, Home / End for the bounds). Moving one dispatches `u-scene-param`
 * (`{ param, value }`, bubbling and composed); the host sets its input from it and passes a new
 * scene. The element never changes the value it shows on its own.
 */
export class USceneElement extends LitElement {
  static properties = { scene: { attribute: false } };
  static styles = css`
    :host { display: block; }
    .u-scene-handle { cursor: grab; touch-action: none; }
    .u-scene-handle:focus { outline: none; }
    .u-scene-handle:focus-visible { stroke-width: 3; }
  `;

  declare scene: Scene | null;
  private dragging: { handle: Handle; pointerId: number } | null = null;

  constructor() {
    super();
    this.scene = null;
    // Drags are tracked on the host, which outlives the markup a new scene replaces mid-gesture.
    this.addEventListener('pointermove', (e) => {
      if (!this.dragging || this.dragging.pointerId !== e.pointerId) return;
      const svg = this.renderRoot.querySelector('svg');
      const p = svg ? toViewBox(svg, e.clientX, e.clientY) : null;
      if (p) this.emit(this.dragging.handle, valueAtPoint(this.dragging.handle.track, p));
    });
    const end = (e: PointerEvent) => {
      if (this.dragging?.pointerId === e.pointerId) this.dragging = null;
    };
    this.addEventListener('pointerup', end);
    this.addEventListener('pointercancel', end);
  }

  render() {
    return this.scene ? html`${unsafeHTML(renderToSvgString(this.scene))}` : nothing;
  }

  /** The handle that had focus before a new scene replaced the markup — keyboard stepping goes on. */
  private focusedHandleId: string | null = null;

  protected willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    const active = (this.renderRoot as ShadowRoot | undefined)?.activeElement;
    this.focusedHandleId = active?.classList.contains('u-scene-handle') ? active.getAttribute('data-id') : null;
  }

  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    const svg = this.renderRoot.querySelector('svg');
    if (!svg) return;
    svg.querySelector('.u-scene-handles')?.remove();
    if (!this.scene?.handles?.length) return;
    const layer = document.createElementNS(SVG_NS, 'g');
    layer.setAttribute('class', 'u-scene-handles');
    for (const h of this.scene.handles) layer.append(this.handleNode(h));
    svg.append(layer);
    if (this.focusedHandleId) {
      layer.querySelector<SVGElement>(`[data-id="${this.focusedHandleId}"]`)?.focus();
      // A drag in progress follows the new scene's handle (its track is the new figure's).
      if (this.dragging) {
        const next = this.scene.handles.find((h) => h.id === this.dragging!.handle.id);
        if (next) this.dragging = { handle: next, pointerId: this.dragging.pointerId };
      }
    }
  }

  private handleNode(h: Handle): SVGCircleElement {
    const { min, max } = trackRange(h.track);
    const at = handlePosition(h.track, h.value);
    const c = document.createElementNS(SVG_NS, 'circle');
    const attrs: Record<string, string> = {
      class: 'u-scene-handle',
      cx: String(at.x), cy: String(at.y), r: String(HANDLE_R),
      fill: resolvePaint('paper'), stroke: resolvePaint('accent'), 'stroke-width': '2',
      tabindex: '0', role: 'slider',
      'aria-label': h.label, 'aria-valuetext': h.valueText,
      'aria-valuemin': String(min), 'aria-valuemax': String(max), 'aria-valuenow': String(h.value),
      'data-param': h.param, 'data-id': h.id,
    };
    for (const [k, v] of Object.entries(attrs)) c.setAttribute(k, v);

    c.addEventListener('keydown', (e) => {
      const steps: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
      let value: number | undefined;
      if (e.key in steps) value = steppedValue(h, steps[e.key]);
      else if (e.key === 'Home') value = min;
      else if (e.key === 'End') value = max;
      if (value === undefined) return;
      e.preventDefault();
      this.emit(h, value);
    });
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      c.focus();
      this.setPointerCapture?.(e.pointerId);
      this.dragging = { handle: h, pointerId: e.pointerId };
    });
    return c;
  }

  private emit(h: Handle, value: number): void {
    if (value === h.value) return;
    this.dispatchEvent(new CustomEvent<USceneParamDetail>('u-scene-param', {
      detail: { param: h.param, value }, bubbles: true, composed: true,
    }));
  }
}

/** A client point in the svg's viewBox units, or null where the browser gives no transform. */
function toViewBox(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM?.();
  if (!ctm) return null;
  const inv = ctm.inverse();
  return { x: inv.a * clientX + inv.c * clientY + inv.e, y: inv.b * clientX + inv.d * clientY + inv.f };
}

if (!customElements.get('u-scene')) customElements.define('u-scene', USceneElement);

declare global {
  interface HTMLElementTagNameMap {
    'u-scene': USceneElement;
  }
  interface HTMLElementEventMap {
    'u-scene-param': CustomEvent<USceneParamDetail>;
  }
}
