import { LitElement, css, html, nothing } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { renderToSvgString } from '../core/render.js';
import type { Scene } from '../core/types.js';

/**
 * Renders a scene. The markup comes from `renderToSvgString`, the same function a host
 * uses at build time, so the static and the live drawing cannot differ. Every label in
 * that markup is escaped by the renderer.
 */
export class USceneElement extends LitElement {
  static properties = { scene: { attribute: false } };
  static styles = css`:host { display: block; }`;

  declare scene: Scene | null;

  constructor() {
    super();
    this.scene = null;
  }

  render() {
    return this.scene ? html`${unsafeHTML(renderToSvgString(this.scene))}` : nothing;
  }
}

if (!customElements.get('u-scene')) customElements.define('u-scene', USceneElement);

declare global {
  interface HTMLElementTagNameMap {
    'u-scene': USceneElement;
  }
}
