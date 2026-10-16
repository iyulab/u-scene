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
    const el = await mount({ width: 10, height: 20, title: 'T', description: 'D & more', nodes: [{ kind: 'text', x: 1, y: 1, text: 'x < y', anchor: 'start', paint: 'ink' }] });
    const svg = el.shadowRoot!.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 10 20');
    expect(svg.querySelector('title')!.textContent).toBe('T');
    expect(svg.querySelector('desc')!.textContent).toBe('D & more');
    expect(svg.querySelector('text')!.textContent).toBe('x < y');
  });

  it('renders nothing when scene is null', async () => {
    const el = await mount(null);
    expect(el.shadowRoot!.querySelector('svg')).toBeNull();
  });

  describe('handles', () => {
    const track = [{ value: 0, x: 10, y: 10 }, { value: 10, x: 110, y: 10 }];
    const withHandle = (value: number) => ({
      width: 120, height: 40, nodes: [],
      handles: [{ id: 'r', param: 'insideRadius', value, track, step: 0.5, valueText: `${value} mm`, label: 'Inside radius' }],
    });

    it('draws each handle as a focusable slider with its value range and text', async () => {
      const el = await mount(withHandle(4));
      const h = el.shadowRoot!.querySelector('[role="slider"]')!;
      expect(h.getAttribute('aria-label')).toBe('Inside radius');
      expect(h.getAttribute('aria-valuetext')).toBe('4 mm');
      expect([h.getAttribute('aria-valuemin'), h.getAttribute('aria-valuemax'), h.getAttribute('aria-valuenow')]).toEqual(['0', '10', '4']);
      expect(h.getAttribute('tabindex')).toBe('0');
      expect([h.getAttribute('cx'), h.getAttribute('cy')]).toEqual(['50', '10']);
    });

    it('keys move the value: arrows a step, PageUp ten, End the bound — reported, not applied', async () => {
      const el = await mount(withHandle(4));
      const seen: Array<{ param: string; value: number }> = [];
      el.addEventListener('u-scene-param', (e) => seen.push(e.detail));
      const h = el.shadowRoot!.querySelector('[role="slider"]')!;
      for (const key of ['ArrowRight', 'ArrowLeft', 'PageUp', 'End', 'Home']) h.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      expect(seen).toEqual([
        { param: 'insideRadius', value: 4.5 }, { param: 'insideRadius', value: 3.5 },
        { param: 'insideRadius', value: 9 }, { param: 'insideRadius', value: 10 }, { param: 'insideRadius', value: 0 },
      ]);
      // The element shows what the host passed until the host passes a new scene.
      expect(h.getAttribute('aria-valuenow')).toBe('4');
    });

    it('a new scene redraws the handle once, at the new value', async () => {
      const el = await mount(withHandle(4));
      el.scene = withHandle(6);
      await el.updateComplete;
      const hs = el.shadowRoot!.querySelectorAll('[role="slider"]');
      expect(hs.length).toBe(1);
      expect(hs[0].getAttribute('aria-valuenow')).toBe('6');
    });
  });

  it('re-renders when the scene changes', async () => {
    const el = await mount({ width: 10, height: 10, nodes: [] });
    el.scene = { width: 30, height: 10, nodes: [] };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 30 10');
  });
});
