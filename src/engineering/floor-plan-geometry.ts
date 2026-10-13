/**
 * Floor plan: a rectangular room with a number of fixtures (lights, sprinklers, racks) laid
 * out on an even grid. Pure functions that move already-computed values to screen
 * coordinates; they never derive domain values.
 */
import type { LabelPlacement, Point } from '../core/geometry.js';

export interface FloorPlanInput {
  /** Room length (m). > 0. */
  roomLengthM: number;
  /** Room width (m). > 0. */
  roomWidthM: number;
  /** Number of fixtures to place (an integer, already computed by the caller). >= 1. */
  fixtureCount: number;
}

export interface FloorPlanView {
  width: number;
  height: number;
  padding: number;
}

export interface FloorPlanGeometry {
  /** Room outline (a closed rectangle path). */
  roomPath: string;
  /** Fixture centres (px) - exactly fixtureCount of them. */
  fixtures: Point[];
  /** Grid column count (for the fullest row) and row count - exposed for verification. */
  cols: number;
  rows: number;
  /** Length dimension line (below the room, horizontal) and width dimension line (left of the room, vertical - anchored on the left, so no rotated text is needed). */
  lengthDimPath: string;
  widthDimPath: string;
  lengthLabel: LabelPlacement;
  widthLabel: LabelPlacement;
  /** Uniform m to px scale (exposed for verification) - the same on both axes, so the room proportions look honest. */
  scale: number;
}

/** Gap between a dimension line and the room edge (px). */
const FLOOR_PLAN_DIM_OFFSET = 16;
/** Extra gap between a dimension label and its dimension line (px). */
const FLOOR_PLAN_LABEL_GAP = 14;
/** Gutter always left at the viewport's left and bottom for the dimension lines and labels (px) - included in the availW/availH computation. */
const FLOOR_PLAN_GUTTER = 34;
/** Fixture marker radius (px, a render constant - the preset reuses it). */
export const FLOOR_PLAN_FIXTURE_RADIUS = 4;
/** Fixture marker outline width (px, a render constant - the preset reuses it). */
export const FLOOR_PLAN_FIXTURE_STROKE_WIDTH = 1;

/**
 * The most fixtures `view` can show as separate markers. A marker covers
 * 2 * FLOOR_PLAN_FIXTURE_RADIUS + FLOOR_PLAN_FIXTURE_STROKE_WIDTH px (outline included), so
 * the drawable area fits at most floor(availW / that) x floor(availH / that) of them - and
 * only for a room whose shape matches the area exactly. Above this count markers touch in
 * every room shape: the grid no longer shows how many fixtures there are, only a smear.
 */
export function floorPlanMaxFixtures(view: FloorPlanView): number {
  const pitch = 2 * FLOOR_PLAN_FIXTURE_RADIUS + FLOOR_PLAN_FIXTURE_STROKE_WIDTH;
  const { availW, availH } = drawableArea(view);
  return Math.floor(availW / pitch) * Math.floor(availH / pitch);
}

/** The area left for the room once padding and the dimension gutter are taken (px). */
function drawableArea(view: FloorPlanView): { availW: number; availH: number } {
  return {
    availW: Math.max(1, view.width - 2 * view.padding - FLOOR_PLAN_GUTTER),
    availH: Math.max(1, view.height - 2 * view.padding - FLOOR_PLAN_GUTTER),
  };
}

/**
 * Splits `count` into the rows x cols grid closest to the room aspect ratio
 * (roomLengthM:roomWidthM). Uses neither sqrt nor pow: it walks every integer column
 * candidate and keeps the combination with the smallest aspect error - linear time; the
 * preset caps the count (floorPlanMaxFixtures), so it stays cheap on the render path.
 */
function chooseFloorPlanGrid(count: number, aspect: number): { cols: number; rows: number } {
  const a = aspect > 0 ? aspect : 1;
  let best = { cols: count, rows: 1 };
  let bestErr = Infinity;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const gridAspect = cols / rows;
    const err = gridAspect > a ? gridAspect / a : a / gridAspect;
    if (err < bestErr) {
      bestErr = err;
      best = { cols, rows };
    }
  }
  return best;
}

/**
 * Floor plan geometry - pure. Fits the room to the viewport with a uniform scale (aspect
 * ratio preserved), spreads fixtureCount fixtures over `rows` rows as evenly as possible
 * (each row takes an equal share of what is left) and centres every row within the room
 * width - so the last row does not lean left and make the layout look lopsided. No
 * de-collision is needed: a grid layout cannot overlap by construction.
 */
export function floorPlanGeometry(input: FloorPlanInput, view: FloorPlanView): FloorPlanGeometry {
  const lengthM = Math.max(0, input.roomLengthM) || 1;
  const widthM = Math.max(0, input.roomWidthM) || 1;
  const count = Math.max(1, Math.round(input.fixtureCount));

  const { availW, availH } = drawableArea(view);
  // Uniform scale - length and width must share one value or the room proportions lie
  // (same principle as bendSectionGeometry).
  const scale = Math.min(availW / lengthM, availH / widthM);
  const roomWpx = lengthM * scale;
  const roomHpx = widthM * scale;

  const x0 = view.padding + FLOOR_PLAN_GUTTER + (availW - roomWpx) / 2;
  const y0 = view.padding + (availH - roomHpx) / 2;

  const roomPath = `M ${x0.toFixed(2)} ${y0.toFixed(2)} L ${(x0 + roomWpx).toFixed(2)} ${y0.toFixed(2)} ` +
    `L ${(x0 + roomWpx).toFixed(2)} ${(y0 + roomHpx).toFixed(2)} L ${x0.toFixed(2)} ${(y0 + roomHpx).toFixed(2)} Z`;

  const { cols, rows } = chooseFloorPlanGrid(count, lengthM / widthM);

  // Spread count over `rows` rows as evenly as possible (base or base+1) - the first rem rows take one extra.
  const base = Math.floor(count / rows);
  const rem = count % rows;
  const cellH = roomHpx / rows;
  const fixtures: Point[] = [];
  for (let r = 0; r < rows; r++) {
    const rowCount = base + (r < rem ? 1 : 0);
    if (rowCount <= 0) continue;
    const cy = y0 + cellH * (r + 0.5);
    const cellW = roomWpx / rowCount;
    for (let i = 0; i < rowCount; i++) {
      const cx = x0 + cellW * (i + 0.5);
      fixtures.push({ x: cx, y: cy });
    }
  }

  const dimY = y0 + roomHpx + FLOOR_PLAN_DIM_OFFSET;
  const lengthDimPath = `M ${x0.toFixed(2)} ${dimY.toFixed(2)} L ${(x0 + roomWpx).toFixed(2)} ${dimY.toFixed(2)}`;
  const dimX = x0 - FLOOR_PLAN_DIM_OFFSET;
  const widthDimPath = `M ${dimX.toFixed(2)} ${y0.toFixed(2)} L ${dimX.toFixed(2)} ${(y0 + roomHpx).toFixed(2)}`;

  const lengthLabel: LabelPlacement = { x: x0 + roomWpx / 2, y: dimY + FLOOR_PLAN_LABEL_GAP, anchor: 'middle' };
  const widthLabel: LabelPlacement = { x: dimX - FLOOR_PLAN_LABEL_GAP / 2, y: y0 + roomHpx / 2, anchor: 'end' };

  return { roomPath, fixtures, cols, rows, lengthDimPath, widthDimPath, lengthLabel, widthLabel, scale };
}
