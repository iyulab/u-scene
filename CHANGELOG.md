# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-13

### Added

- Scene model (`path`, `line`, `circle`, `rect`, `text`, arrow markers) with themable tones.
- `renderToSvgString`: a static, self-contained SVG string with no DOM; invalid scenes throw.
- `<u-scene>` element (`@iyulab/u-scene/element`), rendering through the same function.
- Screen geometry: `polarPoint`, `arcPath`, `boxesOverlap`, `clampAnchoredX`.
- Engineering presets (`@iyulab/u-scene/engineering`): angle, bend section, thread profile,
  rectangular section, ring section and floor plan grid.
- Presets reject non-finite or out-of-range model values with a `TypeError`.
