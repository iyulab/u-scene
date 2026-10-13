// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import './index.js';
import type { USceneElement } from './index.js';

async function mount(scene: USceneElement['scene']): Promise<USceneElement> {
  const el = document.createElement('u-scene') as USceneElement;
  el.scene = scene;
  document.body.append(el);
  await el.updateComplete;
  return el;
}

describe('<u-scene>', () => {
  it('renders the scene svg into its shadow root', async () => {
    const el = await mount({ width: 10, height: 20, title: 'T', nodes: [{ kind: 'text', x: 1, y: 1, text: 'x < y', anchor: 'start', paint: 'ink' }] });
    const svg = el.shadowRoot!.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 10 20');
    expect(svg.querySelector('title')!.textContent).toBe('T');
    expect(svg.querySelector('text')!.textContent).toBe('x < y');
  });

  it('renders nothing when scene is null', async () => {
    const el = await mount(null);
    expect(el.shadowRoot!.querySelector('svg')).toBeNull();
  });

  it('re-renders when the scene changes', async () => {
    const el = await mount({ width: 10, height: 10, nodes: [] });
    el.scene = { width: 30, height: 10, nodes: [] };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 30 10');
  });
});
