# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Signed angles.** `angleDiagram({ signed: true })` draws angles below the baseline too, over
  [`RAY_ANGLE_SIGNED_MIN_DEG`, `RAY_ANGLE_MAX_DEG`] = [-90, 210] degrees, on `RAY_VIEW_SIGNED`
  (340 x 390). The view height is derived from the label constants like `RAY_VIEW`'s, and the label
  sweeps cover the signed domain. Without `signed` nothing changes.
- **`isDrawableAngle(deg, { signed? })`** says whether `angleDiagram` can draw an angle, so a host
  states the bound once instead of comparing against the constants itself. `ANGLE_DOMAIN`,
  `ANGLE_DOMAIN_SIGNED`, `AngleDomain` and `assertInAngleDomain` are exported with it;
  `rayLabelPlacements` and `deltaLabelPosition` take the domain as an optional last argument.

### Changed

- **Breaking: a band edge outside the domain throws a `RangeError`**, as rays and deltas already do.
  A band below the baseline or past 210 degrees used to be drawn anyway.
- **Breaking: `bendSectionGeometry` takes `kFactor` as optional** and, without it, returns
  `neutralPath`, `neutralLabel` and `neutralRadiusPx` as `null` - it used to compute them from a
  stand-in factor of 0.5. `bendSectionDiagram` draws the same scene as before; a model with only
  `kFactorMin`/`kFactorMax` draws the band with no centre line.

## [0.2.0] - 2026-10-15

### Added

- **`gearMeshDiagram`** (engineering): one gear, or a driver and a driven gear meshing at the pitch
  point - pitch circle (dash-dot), tip and root circles when given, centre marks, the pitch point,
  opposite rotation arrows and the centre-distance dimension, all on one scale. A pitch circle smaller
  than `GEAR_MESH_MIN_RADIUS_PX` is enlarged on its own and the drawing is marked not to scale. Tooth
  counts can stand in for pitch diameters when only the ratio is known. Geometry:
  `gearMeshGeometry(input, view)`.

## [0.1.2] - 2026-10-14

### Fixed

- **Text labels reach text contrast.** A label drawn in a mark color - a status tone, or a preset's
  structural hex such as the angle rays' orange - used that color as is, which is 2.2-4.5:1 on white
  paper (WCAG 1.4.3 asks 4.5:1 for small text). Text now mixes a mark color with `ink-strong`
  (`color-mix(in oklab, <mark> 60%, <ink-strong>)`), so a label keeps the hue of the mark it names and
  gains contrast in both themes: `ink-strong` is the darkest text on a light paper and the lightest on a
  dark one, as a host already sets it, so no new custom property is needed. Measured in a host page:
  5.1-5.8:1 on a light paper (was 2.2-2.7:1), 9.6-10.7:1 on a dark one. The neutral tones (`ink`,
  `ink-strong`, `muted`, `faint`, `line`, `paper`) are text colors and are unchanged.
- **Labels stay legible across lines.** Every text node carries a paper-colored halo
  (`stroke` = `paper`, width 3, `paint-order: stroke`), so a label that crosses a ray or a dashed line
  no longer loses its glyphs to it.

### Added

- `resolveTextPaint(paint)` and `TEXT_TONE_SHARE` (the 60 % share of the mark color).

## [0.1.1] - 2026-10-13

Released outside the regular release gate: a downstream consumer was blocked - its pages
could freeze on stale results when a large fixture count made `floorPlanDiagram` throw
during rendering.

### Added

- `Scene.description`, rendered as an escaped `<desc>` after `<title>`; `title` and
  `description` must be strings.
- `FLOOR_PLAN_MAX_FIXTURES` and `floorPlanMaxFixtures(view)`: the most fixtures a floor
  plan can show as separate markers (638 in the preset's view).
- One SVG snapshot per engineering preset, pinning paint, dash and drawing order.

### Changed

- `floorPlanDiagram` returns `null` above `FLOOR_PLAN_MAX_FIXTURES` instead of throwing a
  `TypeError` above 10000: a large count is valid but not drawable. Non-finite counts still
  throw, and zero or less still returns `null`.
- The `angleDiagram` out-of-range `RangeError` message now points at the exported
  `RAY_ANGLE_MIN_DEG` / `RAY_ANGLE_MAX_DEG` constants; the README documents that domain.
- The package description and README say what 0.1 does; interactive handles and
  simulation playback are listed as planned.
- Source maps embed their sources, and declaration maps are no longer emitted, so no map
  points at files the package does not ship.

### Fixed

- CI concurrency: the push CI and the CI run by the publish workflow no longer share a
  group, so one cannot cancel the other and silently skip a release.
- The publish workflow skips publishing when the version in `package.json` is already on
  npm, instead of failing on an unrelated `package.json` edit.

## [0.1.0] - 2026-10-13

### Added

- Scene model (`path`, `line`, `circle`, `rect`, `text`, arrow markers) with themable tones.
- `renderToSvgString`: a static, self-contained SVG string with no DOM; invalid scenes throw.
- `<u-scene>` element (`@iyulab/u-scene/element`), rendering through the same function.
- Screen geometry: `polarPoint`, `arcPath`, `boxesOverlap`, `clampAnchoredX`.
- Engineering presets (`@iyulab/u-scene/engineering`): angle, bend section, thread profile,
  rectangular section, ring section and floor plan grid.
- Presets reject non-finite or out-of-range model values with a `TypeError`.
