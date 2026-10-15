/**
 * Gear mesh: one gear, or a driver and a driven gear meshing at the pitch point. Drawn as
 * circles on one scale — pitch circle, and the tip and root circles when given — with the two
 * gears tangent on their pitch circles, so the centre distance is the sum of the pitch radii.
 * No tooth profiles: the circles carry the sizes a reader compares, and an involute drawn from
 * a module would be a second calculation of what the result already states.
 */
import { arcPath } from '../core/geometry.js';
import type { LabelPlacement } from '../core/geometry.js';

export interface GearMeshCircles {
  /** Pitch circle diameter (> 0). Any unit, the same for every circle — mm, or the tooth count
   *  when only the ratio is known (equal module makes the pitch diameter proportional to it). */
  pitchDiameter: number;
  /** Tip (addendum) circle diameter, > pitchDiameter. */
  tipDiameter?: number;
  /** Root (dedendum) circle diameter, 0 < root < pitchDiameter. */
  rootDiameter?: number;
}

export interface GearMeshInput {
  driver: GearMeshCircles;
  driven?: GearMeshCircles;
}

export interface GearMeshView { width: number; height: number; padding: number; }

export interface GearMeshGearGeometry {
  cx: number;
  cy: number;
  pitchRadiusPx: number;
  tipRadiusPx?: number;
  rootRadiusPx?: number;
  /** Centre mark (two short crossing lines). */
  centerMarkPath: string;
  /** Rotation arc above the gear, ending in the arrowhead — only for a meshing pair. */
  rotationPath?: string;
}

export interface GearMeshGeometry {
  driver: GearMeshGearGeometry;
  driven?: GearMeshGearGeometry;
  /** Where the pitch circles touch — only for a meshing pair. */
  pitchPoint?: { x: number; y: number };
  /** Centre-distance dimension line between the two centres, below the gears — only for a pair. */
  centerDimPath?: string;
  centerDimLabel: LabelPlacement;
  /** Gear label rows under the drawing: driver first, then driven. */
  gearLabels: [LabelPlacement, LabelPlacement];
  /** A gear whose pitch circle would be smaller than the minimum visible radius was drawn larger. */
  clamped: boolean;
  notToScaleLabel: LabelPlacement;
  scale: number;
  viewHeight: number;
}

/** A pitch circle smaller than this reads as a dot next to its partner (px). */
export const GEAR_MESH_MIN_RADIUS_PX = 10;
const TOP_RESERVE = 26;
const BOTTOM_RESERVE = 70;
const DIM_OFFSET = 16;
const TICK = 4;
const MARK = 5;
const ARROW_GAP = 8;

const f = (n: number): string => n.toFixed(2);

function extentOf(g: GearMeshCircles): number {
  return Math.max(g.pitchDiameter, g.tipDiameter ?? 0) / 2;
}

function centerMark(cx: number, cy: number): string {
  return `M ${f(cx - MARK)} ${f(cy)} L ${f(cx + MARK)} ${f(cy)} M ${f(cx)} ${f(cy - MARK)} L ${f(cx)} ${f(cy + MARK)}`;
}

/**
 * Gear mesh geometry — pure. Both gears share one scale; the pair sits on a horizontal line,
 * tangent at the pitch point. A pitch circle below the minimum visible radius is enlarged on its
 * own (its tip and root circles with it, keeping their ratio) and the drawing is marked not to
 * scale — the labels carry the real values.
 */
export function gearMeshGeometry(input: GearMeshInput, view: GearMeshView): GearMeshGeometry {
  const { driver, driven } = input;
  const pad = view.padding;
  const availW = Math.max(1, view.width - 2 * pad);
  const availH = Math.max(1, view.height - 2 * pad - TOP_RESERVE - BOTTOM_RESERVE);

  const e1 = extentOf(driver);
  const e2 = driven ? extentOf(driven) : 0;
  const centerUnits = driven ? (driver.pitchDiameter + driven.pitchDiameter) / 2 : 0;
  const widthUnits = driven ? e1 + centerUnits + e2 : 2 * e1;
  const heightUnits = 2 * Math.max(e1, e2);
  const scale = Math.min(availW / widthUnits, availH / heightUnits);

  // Per-gear enlargement when a pitch circle would be too small to read.
  let clamped = false;
  const factorFor = (g: GearMeshCircles): number => {
    const r = (g.pitchDiameter / 2) * scale;
    if (r >= GEAR_MESH_MIN_RADIUS_PX) return 1;
    clamped = true;
    return GEAR_MESH_MIN_RADIUS_PX / r;
  };
  const k1 = factorFor(driver);
  const k2 = driven ? factorFor(driven) : 1;
  const px = (d: number | undefined, k: number): number | undefined => (d != null ? (d / 2) * scale * k : undefined);

  const r1 = (driver.pitchDiameter / 2) * scale * k1;
  const ext1 = e1 * scale * k1;
  const r2 = driven ? (driven.pitchDiameter / 2) * scale * k2 : 0;
  const ext2 = driven ? e2 * scale * k2 : 0;
  const maxExt = Math.max(ext1, ext2);

  const drawnWidth = driven ? ext1 + r1 + r2 + ext2 : 2 * ext1;
  const left = pad + Math.max(0, (availW - drawnWidth) / 2);
  const cy = pad + TOP_RESERVE + maxExt;
  const cx1 = left + ext1;
  const cx2 = cx1 + r1 + r2;

  const rotation = (cx: number, ext: number, clockwise: boolean): string => {
    const rr = ext + ARROW_GAP;
    return clockwise ? arcPath(cx, cy, rr, 125, 55) : arcPath(cx, cy, rr, 55, 125);
  };

  const driverGeom: GearMeshGearGeometry = {
    cx: cx1, cy, pitchRadiusPx: r1,
    tipRadiusPx: px(driver.tipDiameter, k1), rootRadiusPx: px(driver.rootDiameter, k1),
    centerMarkPath: centerMark(cx1, cy),
    ...(driven ? { rotationPath: rotation(cx1, ext1, true) } : {}),
  };
  const drivenGeom: GearMeshGearGeometry | undefined = driven
    ? {
      cx: cx2, cy, pitchRadiusPx: r2,
      tipRadiusPx: px(driven.tipDiameter, k2), rootRadiusPx: px(driven.rootDiameter, k2),
      centerMarkPath: centerMark(cx2, cy),
      rotationPath: rotation(cx2, ext2, false),
    }
    : undefined;

  const dimY = cy + maxExt + DIM_OFFSET;
  const centerDimPath = driven
    ? `M ${f(cx1)} ${f(dimY)} L ${f(cx2)} ${f(dimY)} M ${f(cx1)} ${f(dimY - TICK)} L ${f(cx1)} ${f(dimY + TICK)} M ${f(cx2)} ${f(dimY - TICK)} L ${f(cx2)} ${f(dimY + TICK)}`
    : undefined;
  const centerDimLabel: LabelPlacement = { x: driven ? (cx1 + cx2) / 2 : cx1, y: dimY + 14, anchor: 'middle' };
  const rowY = dimY + (driven ? 34 : 4);
  const gearLabels: [LabelPlacement, LabelPlacement] = [
    { x: pad, y: rowY, anchor: 'start' },
    { x: pad, y: rowY + 16, anchor: 'start' },
  ];
  const notToScaleLabel: LabelPlacement = { x: view.width - pad, y: pad + 10, anchor: 'end' };
  const viewHeight = Math.min(view.height, rowY + (driven ? 16 : 0) + pad / 2 + 4);

  return {
    driver: driverGeom,
    driven: drivenGeom,
    pitchPoint: driven ? { x: cx1 + r1, y: cy } : undefined,
    centerDimPath, centerDimLabel, gearLabels,
    clamped, notToScaleLabel, scale, viewHeight,
  };
}
