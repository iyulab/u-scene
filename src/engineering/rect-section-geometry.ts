/**
 * Rectangular cross-section: width x thickness. Two forms:
 *   opening - a gap of width w through a plate of thickness t (the gap between two walls)
 *   strip   - a conductor of width w x thickness t, on a substrate (`below`) or inside a
 *             dielectric (`embedded`)
 * No trigonometry is needed; the screen-coordinate conversion simply lives in this file.
 */
import type { LabelPlacement } from '../core/geometry.js';

export type RectSectionKind = 'opening' | 'strip';
export type RectSectionSubstrate = 'none' | 'below' | 'embedded';

export interface RectSectionInput {
  kind: RectSectionKind;
  /** Opening width or strip width (mm). > 0. */
  widthMm: number;
  /** Plate or conductor thickness (mm). > 0. */
  thicknessMm: number;
  /** Plate or substrate drawn underneath (a display-only band - its thickness is not a domain value, so it is not to scale). Default 'none'. */
  substrate?: RectSectionSubstrate;
}

export interface RectSectionView { width: number; height: number; padding: number; }

export interface RectBox { x: number; y: number; width: number; height: number; }

/**
 * Which dimension was shrunk when the section cannot be drawn to scale.
 * - 'width'     : the width is far larger than the thickness (a thin, wide strip), so the thickness is held at the minimum visible px and the width is reduced.
 * - 'thickness' : the width is far smaller than the thickness, so the width is held at the minimum visible px and the thickness is reduced.
 * The shrunk dimension line carries a break mark (breakPath) - the drawing convention for "not to scale".
 */
export type RectSectionClamp = 'none' | 'width' | 'thickness';

export interface RectSectionGeometry {
  /** opening: [left wall, right wall] - strip: [conductor]. */
  materialRects: RectBox[];
  /** The substrate / dielectric band when substrate is not 'none'. */
  substrateRect?: RectBox;
  /** Width dimension line (above the opening or strip, with end ticks). */
  widthDimPath: string;
  /** Thickness dimension line (on the right, with end ticks). */
  thicknessDimPath: string;
  /** Break mark at the middle of the shrunk dimension line when clamped !== 'none'. */
  breakPath?: string;
  widthLabel: LabelPlacement;
  thicknessLabel: LabelPlacement;
  /** Anchor of the ratio label (centred below the drawing) - used only when the model supplies a ratio label. */
  ratioLabel: LabelPlacement;
  /** mm to px (shared by both axes when drawn to scale). */
  scale: number;
  widthPx: number;
  thicknessPx: number;
  clamped: RectSectionClamp;
  /** Height of the viewBox fitted to the content (<= view.height) - the preset writes it into the scene. */
  viewHeight: number;
}

/** Anything thinner or narrower than this cannot be told apart from a line (px). */
export const RECT_SECTION_MIN_PX = 3;
/** Displayed width of one wall of an opening (px) - the plate continues, so the wall width is not a domain value. */
const RECT_WALL_PX = 56;
/** Substrate margin on each side of a strip (px). */
const RECT_SUBSTRATE_MARGIN_PX = 28;
/** Substrate band thickness (px, display only). */
const RECT_SUBSTRATE_PX = 14;
/** Right-hand gutter for the thickness label (px). */
const RECT_LABEL_GUTTER = 84;
/** Top reserve for the width dimension line and its label (px). */
const RECT_TOP_RESERVE = 34;
/** Bottom reserve for the substrate band and the ratio label (px). */
const RECT_BOTTOM_RESERVE = 40;
const RECT_DIM_OFFSET = 12;
const RECT_TICK = 4;

/**
 * Rectangular section geometry - pure. Both axes share a **single scale** so the
 * width:thickness ratio looks honest; only when that ratio does not fit the viewport is the
 * shorter side raised to the minimum visible px and a break mark drawn on the longer
 * dimension line (clamped). The labels are the real values supplied by the caller, so even
 * a broken drawing does not lie about the dimensions.
 */
export function rectSectionGeometry(input: RectSectionInput, view: RectSectionView): RectSectionGeometry {
  const W = input.widthMm > 0 ? input.widthMm : 1;
  const T = input.thicknessMm > 0 ? input.thicknessMm : 1;
  const substrate = input.substrate ?? 'none';
  const opening = input.kind === 'opening';
  const pad = view.padding;

  const sideReserve = opening ? RECT_WALL_PX : (substrate === 'none' ? 0 : RECT_SUBSTRATE_MARGIN_PX);
  const embeddedExtra = substrate === 'embedded' ? RECT_SUBSTRATE_PX : 0;
  const availW = Math.max(1, view.width - 2 * pad - RECT_LABEL_GUTTER - 2 * sideReserve);
  const availH = Math.max(1, view.height - 2 * pad - RECT_TOP_RESERVE - RECT_BOTTOM_RESERVE - embeddedExtra);

  const scale = Math.min(availW / W, availH / T);
  let widthPx = W * scale;
  let thicknessPx = T * scale;
  let clamped: RectSectionClamp = 'none';
  if (thicknessPx < RECT_SECTION_MIN_PX) {
    thicknessPx = RECT_SECTION_MIN_PX;
    widthPx = availW;
    clamped = 'width';
  } else if (widthPx < RECT_SECTION_MIN_PX) {
    widthPx = RECT_SECTION_MIN_PX;
    thicknessPx = availH;
    clamped = 'thickness';
  }

  // Horizontal: centred in the area left of the label gutter. Vertical: centred in the usable height (embedded is pushed down by the dielectric above).
  const areaW = view.width - 2 * pad - RECT_LABEL_GUTTER;
  const cx = pad + areaW / 2;
  const xL = cx - widthPx / 2;
  const xR = cx + widthPx / 2;
  // Anchored to the top - a thin section must not float in the middle with empty bands above and below; the bottom is cropped by viewHeight.
  const yT = pad + RECT_TOP_RESERVE + embeddedExtra;
  const yB = yT + thicknessPx;

  const materialRects: RectBox[] = opening
    ? [
      { x: xL - RECT_WALL_PX, y: yT, width: RECT_WALL_PX, height: thicknessPx },
      { x: xR, y: yT, width: RECT_WALL_PX, height: thicknessPx },
    ]
    : [{ x: xL, y: yT, width: widthPx, height: thicknessPx }];

  let substrateRect: RectBox | undefined;
  if (substrate !== 'none') {
    const sx0 = xL - sideReserve;
    const sw = widthPx + 2 * sideReserve;
    substrateRect = substrate === 'embedded'
      ? { x: sx0, y: yT - RECT_SUBSTRATE_PX, width: sw, height: thicknessPx + 2 * RECT_SUBSTRATE_PX }
      : { x: sx0, y: yB, width: sw, height: RECT_SUBSTRATE_PX };
  }

  const f = (n: number): string => n.toFixed(2);
  const dimTop = (substrateRect && substrate === 'embedded' ? substrateRect.y : yT) - RECT_DIM_OFFSET;
  const widthDimPath =
    `M ${f(xL)} ${f(dimTop)} L ${f(xR)} ${f(dimTop)} ` +
    `M ${f(xL)} ${f(dimTop - RECT_TICK)} L ${f(xL)} ${f(dimTop + RECT_TICK)} ` +
    `M ${f(xR)} ${f(dimTop - RECT_TICK)} L ${f(xR)} ${f(dimTop + RECT_TICK)}`;
  const rightEdge = opening ? xR + RECT_WALL_PX : xR + (substrate === 'none' ? 0 : RECT_SUBSTRATE_MARGIN_PX);
  const dimX = rightEdge + RECT_DIM_OFFSET;
  const thicknessDimPath =
    `M ${f(dimX)} ${f(yT)} L ${f(dimX)} ${f(yB)} ` +
    `M ${f(dimX - RECT_TICK)} ${f(yT)} L ${f(dimX + RECT_TICK)} ${f(yT)} ` +
    `M ${f(dimX - RECT_TICK)} ${f(yB)} L ${f(dimX + RECT_TICK)} ${f(yB)}`;

  let breakPath: string | undefined;
  if (clamped === 'width') {
    breakPath = `M ${f(cx - 6)} ${f(dimTop + 5)} L ${f(cx - 2)} ${f(dimTop - 5)} M ${f(cx + 2)} ${f(dimTop + 5)} L ${f(cx + 6)} ${f(dimTop - 5)}`;
  } else if (clamped === 'thickness') {
    const my = (yT + yB) / 2;
    breakPath = `M ${f(dimX - 5)} ${f(my + 2)} L ${f(dimX + 5)} ${f(my - 2)} M ${f(dimX - 5)} ${f(my + 6)} L ${f(dimX + 5)} ${f(my + 2)}`;
  }

  // Lift the label above the break mark (dimension line +-5px) - at 7px the mark scrapes the underside of the glyphs.
  const widthLabel: LabelPlacement = { x: cx, y: dimTop - 10, anchor: 'middle' };
  const thicknessLabel: LabelPlacement = { x: dimX + 8, y: (yT + yB) / 2 + 4, anchor: 'start' };
  // The ratio label sits right under the drawing - pinned to the viewport bottom it would drift away from the drawing when there is a lot of vertical room.
  const drawingBottom = substrateRect ? substrateRect.y + substrateRect.height : yB;
  const ratioLabel: LabelPlacement = { x: cx, y: drawingBottom + 20, anchor: 'middle' };
  const viewHeight = Math.min(view.height, drawingBottom + 20 + pad);

  return { materialRects, substrateRect, widthDimPath, thicknessDimPath, breakPath, widthLabel, thicknessLabel, ratioLabel, scale, widthPx, thicknessPx, clamped, viewHeight };
}
