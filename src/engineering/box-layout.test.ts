import { describe, it, expect } from 'vitest';
import { boxLayoutDiagram, BOX_LAYOUT_MAX_BOXES, BOX_LAYOUT_MAX_LAYERS } from './box-layout.js';
import { boxLayoutGeometry, boxLayoutLimits, BOX_LAYOUT_LEFT, BOX_LAYOUT_RIGHT, BOX_LAYOUT_MIN_PX } from './box-layout-geometry.js';
import type { BoxLayoutBox, BoxLayoutInput } from './box-layout-geometry.js';
import { renderToSvgString } from '../core/render.js';
import type { RectNode } from '../core/types.js';

/** A grid of identical boxes from the floor's corner, as a caller's calculation would place them. */
function grid(columns: number, rows: number, length: number, width: number): BoxLayoutBox[] {
  const out: BoxLayoutBox[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) out.push({ x: c * length, y: r * width, length, width });
  return out;
}

const labels = { length: '1200 mm', width: '800 mm', height: '1650 mm', limit: 'limit 1800 mm' };
const pallet = { floorLength: 1200, floorWidth: 800, boxes: grid(4, 4, 300, 200), layers: 5, boxHeight: 300, deckHeight: 150, limitHeight: 1800, labels };
const VIEW = { width: 440, maxHeight: 400 };
const geometryInput = (m: typeof pallet): BoxLayoutInput => ({ ...m });

describe('boxLayoutGeometry', () => {
  it('draws plan and elevation on one scale: a unit is the same number of px in both views and both axes', () => {
    const g = boxLayoutGeometry(geometryInput(pallet), VIEW);
    expect(g.floorRect.width / 1200).toBeCloseTo(g.scale, 9);
    expect(g.floorRect.height / 800).toBeCloseTo(g.scale, 9);
    expect(g.planBoxes[0].width / 300).toBeCloseTo(g.scale, 9);
    expect(g.stackBoxes[0].height / 300).toBeCloseTo(g.scale, 9);
    expect(g.deckRect!.height / 150).toBeCloseTo(g.scale, 9);
  });

  it('the elevation columns line up under the plan columns', () => {
    const g = boxLayoutGeometry(geometryInput(pallet), VIEW);
    const columnsInPlan = [...new Set(g.planBoxes.map((r) => r.x.toFixed(6)))];
    const columnsInStack = [...new Set(g.stackBoxes.map((r) => r.x.toFixed(6)))];
    expect(columnsInStack).toEqual(columnsInPlan);
    expect(g.stackBoxes).toHaveLength(4 * 5); // 4 columns x 5 layers
  });

  it('stacks the layers on the deck, each on top of the one below, up to the stack height', () => {
    const g = boxLayoutGeometry(geometryInput(pallet), VIEW);
    const firstColumn = g.stackBoxes.filter((r) => r.x === g.stackBoxes[0].x).sort((a, b) => b.y - a.y);
    expect(firstColumn).toHaveLength(5);
    expect(firstColumn[0].y + firstColumn[0].height).toBeCloseTo(g.groundY - g.deckRect!.height, 9); // bottom layer sits on the deck
    for (let i = 1; i < 5; i++) expect(firstColumn[i].y + firstColumn[i].height).toBeCloseTo(firstColumn[i - 1].y, 9);
    expect(g.heightSpan.from.y).toBeCloseTo(firstColumn[4].y, 9); // the height dimension reaches the top of the stack
    expect(g.heightSpan.to.y).toBe(g.groundY);
  });

  it('the limit line sits at the limit on the same scale', () => {
    const g = boxLayoutGeometry(geometryInput(pallet), VIEW);
    expect((g.groundY - g.limitY!) / 1800).toBeCloseTo(g.scale, 9);
  });

  it('stays inside the view in both directions, wide floors and tall stacks alike', () => {
    const wide = boxLayoutGeometry({ floorLength: 12032, floorWidth: 2352, boxes: grid(20, 5, 600, 400), layers: 5, boxHeight: 450, deckHeight: 0 }, VIEW);
    expect(wide.floorRect.x + wide.floorRect.width).toBeLessThanOrEqual(VIEW.width - BOX_LAYOUT_RIGHT + 1e-9);
    expect(wide.viewHeight).toBeLessThanOrEqual(VIEW.maxHeight + 1e-9);
    const tall = boxLayoutGeometry({ floorLength: 1000, floorWidth: 1000, boxes: grid(2, 2, 500, 500), layers: 30, boxHeight: 500, deckHeight: 0 }, VIEW);
    expect(tall.viewHeight).toBeLessThanOrEqual(VIEW.maxHeight + 1e-9);
    expect(tall.floorRect.x).toBe(BOX_LAYOUT_LEFT);
  });

  it('limits come from the view', () => {
    expect(boxLayoutLimits(VIEW)).toEqual({ maxBoxes: 23146, maxLayers: 163 });
  });
});

describe('boxLayoutDiagram', () => {
  it('draws the floor, one rect per box in plan, one per box per layer in elevation, the deck and the ground', () => {
    const scene = boxLayoutDiagram(pallet)!;
    const rects = scene.nodes.filter((n) => n.kind === 'rect');
    // floor 1 + plan boxes 16 + deck 1 + stack 4 columns x 5 layers
    expect(rects).toHaveLength(1 + 16 + 1 + 20);
    expect(scene.nodes.filter((n) => n.kind === 'text').map((n) => (n as { text: string }).text).sort())
      .toEqual(['1200 mm', '1650 mm', '800 mm', 'limit 1800 mm']);
    expect(() => renderToSvgString(scene)).not.toThrow();
  });

  it('keeps every rect inside the drawing', () => {
    const scene = boxLayoutDiagram(pallet)!;
    for (const n of scene.nodes) {
      if (n.kind !== 'rect') continue;
      const r = n as RectNode;
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(scene.width);
      expect(r.y + r.height).toBeLessThanOrEqual(scene.height);
    }
  });

  it('a deck-less load without a limit draws no deck band and no limit line', () => {
    const scene = boxLayoutDiagram({ ...pallet, deckHeight: undefined, limitHeight: undefined, labels: { length: 'a', width: 'b', height: 'c' } })!;
    expect(scene.nodes.filter((n) => n.kind === 'rect')).toHaveLength(1 + 16 + 20);
    expect(scene.nodes.some((n) => n.kind === 'line' && n.stroke?.dash)).toBe(false);
  });

  it('a limit above the stack widens the elevation to reach it; a stack above the limit still draws whole', () => {
    // the view height is capped, so a taller elevation is bought with a smaller scale
    const above = boxLayoutGeometry(geometryInput({ ...pallet, limitHeight: 2400 }), VIEW);
    const at = boxLayoutGeometry(geometryInput({ ...pallet, limitHeight: 1800 }), VIEW);
    expect(above.scale).toBeLessThan(at.scale);
    expect((above.groundY - above.limitY!) / 2400).toBeCloseTo(above.scale, 9);
    const below = boxLayoutDiagram({ ...pallet, limitHeight: 1000 })!;
    expect(below.nodes.filter((n) => n.kind === 'rect')).toHaveLength(1 + 16 + 1 + 20);
  });

  it('a whole-number part of layers is drawn', () => {
    const scene = boxLayoutDiagram({ ...pallet, layers: 3.9 })!;
    expect(scene.nodes.filter((n) => n.kind === 'rect')).toHaveLength(1 + 16 + 1 + 12);
  });

  it('returns null when there is nothing to draw', () => {
    expect(boxLayoutDiagram({ ...pallet, boxes: [] })).toBeNull();
    expect(boxLayoutDiagram({ ...pallet, layers: 0 })).toBeNull();
  });

  it('returns null, not a throw, when boxes or layers could not be told apart', () => {
    // 20 mm boxes on a 12 m container floor: under 2 px each
    expect(boxLayoutDiagram({ floorLength: 12032, floorWidth: 2352, boxes: grid(30, 20, 20, 20), layers: 3, boxHeight: 400, deckHeight: 0, labels })).toBeNull();
    // a layer drawn under 2 px
    expect(boxLayoutDiagram({ ...pallet, boxHeight: 1, layers: 2, deckHeight: 0, limitHeight: undefined })).toBeNull();
    expect(boxLayoutDiagram({ ...pallet, layers: BOX_LAYOUT_MAX_LAYERS + 1 })).toBeNull();
    expect(boxLayoutDiagram({ ...pallet, boxes: new Array(BOX_LAYOUT_MAX_BOXES + 1).fill({ x: 0, y: 0, length: 1, width: 1 }) })).toBeNull();
    expect(boxLayoutDiagram({ ...pallet, layers: 1e12 })).toBeNull();
  });

  it('never lets a box edge shrink under the minimum when it draws', () => {
    const g = boxLayoutGeometry(geometryInput(pallet), VIEW);
    expect(g.minEdgePx).toBeGreaterThanOrEqual(BOX_LAYOUT_MIN_PX);
  });
});

describe('boxLayoutDiagram label room', () => {
  const textNodes = (labelsOverride: Partial<typeof labels>) =>
    (boxLayoutDiagram({ ...pallet, labels: { ...labels, ...labelsOverride } })!.nodes.filter((n) => n.kind === 'text') as { x: number; text: string; anchor: string }[]);

  it('a longer vertical label gets the room it needs: its text starts inside the view', () => {
    for (const width of ['800 mm', 'Breite 800 mm', String.fromCharCode(0xd3ed) + ' 800 mm', '幅 800 mm']) {
      const t = textNodes({ width }).find((n) => n.text === width)!;
      expect(t.anchor).toBe('end');
      const estimated = [...width].reduce((w, ch) => w + ((ch.codePointAt(0) ?? 0) > 0x2e80 ? 12 : 7), 0);
      expect(t.x - estimated, width).toBeGreaterThanOrEqual(0);
    }
  });

  it('the same for the height label on the right', () => {
    const height = 'Ladehöhe 1.644 mm';
    const scene = boxLayoutDiagram({ ...pallet, labels: { ...labels, height } })!;
    const t = (scene.nodes.filter((n) => n.kind === 'text') as { x: number; text: string }[]).find((n) => n.text === height)!;
    const estimated = [...height].reduce((w, ch) => w + ((ch.codePointAt(0) ?? 0) > 0x2e80 ? 12 : 7), 0);
    expect(t.x + estimated).toBeLessThanOrEqual(scene.width);
  });

  it('short labels leave the floor where it was; long ones shrink the drawing, they do not clip it', () => {
    // a wide floor, so the width (not the height) sets the scale
    const wide = { floorLength: 12032, floorWidth: 2352, boxes: grid(20, 5, 600, 400), layers: 5, boxHeight: 450, deckHeight: 0, labels };
    const short = boxLayoutGeometry(geometryInput(wide as unknown as typeof pallet), { ...VIEW, leftGutter: 0, rightGutter: 0 });
    const long = boxLayoutGeometry(geometryInput(wide as unknown as typeof pallet), { ...VIEW, leftGutter: 120, rightGutter: 120 });
    expect(long.floorRect.x).toBeGreaterThan(short.floorRect.x);
    expect(long.scale).toBeLessThan(short.scale);
  });
});

describe('boxLayoutDiagram input checks', () => {
  it('rejects bad numbers with a TypeError naming the field', () => {
    expect(() => boxLayoutDiagram({ ...pallet, floorLength: 0 })).toThrow(/floorLength/);
    expect(() => boxLayoutDiagram({ ...pallet, floorWidth: NaN })).toThrow(TypeError);
    expect(() => boxLayoutDiagram({ ...pallet, boxHeight: -1 })).toThrow(/boxHeight/);
    expect(() => boxLayoutDiagram({ ...pallet, layers: Infinity })).toThrow(/layers/);
    expect(() => boxLayoutDiagram({ ...pallet, deckHeight: -5 })).toThrow(/deckHeight/);
    expect(() => boxLayoutDiagram({ ...pallet, limitHeight: 0 })).toThrow(/limitHeight/);
    expect(() => boxLayoutDiagram({ ...pallet, boxes: [{ x: 0, y: 0, length: 0, width: 200 }] })).toThrow(/boxes\[0\]\.length/);
    expect(() => boxLayoutDiagram({ ...pallet, boxes: [{ x: -1, y: 0, length: 100, width: 200 }] })).toThrow(/boxes\[0\]\.x/);
  });

  it('rejects a box outside the floor instead of drawing it where the calculation did not put it', () => {
    expect(() => boxLayoutDiagram({ ...pallet, boxes: [{ x: 1000, y: 0, length: 300, width: 200 }] })).toThrow(/outside the floor/);
    expect(() => boxLayoutDiagram({ ...pallet, boxes: [{ x: 0, y: 700, length: 300, width: 200 }] })).toThrow(/outside the floor/);
  });

  it('a box that ends exactly at the floor edge is inside', () => {
    expect(boxLayoutDiagram({ ...pallet, boxes: [{ x: 900, y: 600, length: 300, width: 200 }] })).not.toBeNull();
  });
});
