# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
