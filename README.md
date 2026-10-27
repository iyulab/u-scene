# u-scene

Declarative engineering scenes for the web: parametric diagrams from plain data, rendered to
a static SVG string or a `<u-scene>` element, which can also draw handles that let a reader set
an input from the drawing itself.

A scene is plain data. The same scene renders to a static SVG string (no DOM, safe at build
time) and to a `<u-scene>` element, which draws through that same function.

u-scene never computes domain values and never formats numbers: the host computes, formats
its labels, and hands over a scene. u-scene only maps it to the screen.

Status: 0.x - the API changes between minor versions.

## Install

    npm install @iyulab/u-scene
    # for the element:
    npm install lit

## Static SVG (no DOM)

    import { renderToSvgString } from '@iyulab/u-scene';
    import { angleDiagram } from '@iyulab/u-scene/engineering';

    const scene = angleDiagram({ rays: [{ angleDeg: 30, label: '30°' }], title: 'Angle' });
    const svg = scene ? renderToSvgString(scene) : '';

## Element

    import '@iyulab/u-scene/element';
    // <u-scene .scene=${scene}></u-scene>   (Lit)
    element.scene = scene;                 // plain DOM

## Handles

A scene may carry `handles`: each sets one host input from the drawing. A handle moves along a
track of `{ value, x, y }` stops that the preset builds from the same transform that drew the
figure, so it always sits on what it controls. `<u-scene>` draws each as a focusable
`role="slider"` (pointer drag; arrows, PageUp/PageDown, Home/End) and dispatches `u-scene-param`
with `{ param, value }`. The host owns the value: it sets its input from the event and passes a new
scene. Values are never rounded here, and the static SVG never contains handles.

    const scene = bendSectionDiagram({ ...model, handles: {
      insideRadius: { min: 0, max: 30, step: 0.5, label: 'Inside radius', valueText: '6 mm' },
    } });
    element.addEventListener('u-scene-param', (e) => setInput(e.detail.param, e.detail.value));

## Theming

Tones resolve to CSS custom properties with defaults, so a host themes every scene by
setting them on `u-scene` (and `svg.u-scene` for static markup):

    u-scene, svg.u-scene {
      --u-scene-ink: var(--my-text);
      --u-scene-paper: var(--my-surface);
    }

Tones: `ink`, `ink-strong`, `muted`, `faint`, `line`, `paper`, `primary`, `accent`,
`ok`, `warn`, `alarm`, `info` — the status words of `@iyulab/u-widgets`' tones, so a verdict and its
diagram share one value.

## Engineering presets

`angleDiagram`, `bendSectionDiagram`, `threadProfileDiagram`, `rectSectionDiagram`,
`ringSectionDiagram`, `floorPlanDiagram`, `gearMeshDiagram` - each takes a model of values and
pre-formatted labels and returns a scene. `angleDiagram` returns `null` when there are no rays to draw, and
`floorPlanDiagram` returns `null` when `fixtureCount` is zero or less, or above
`FLOOR_PLAN_MAX_FIXTURES` (638 - beyond it the markers touch in every room shape, so the
plan could no longer show the count).

`gearMeshDiagram` draws one gear, or a driver and a driven gear tangent at the pitch point, as
circles on one scale (pitch, and tip and root when given) with opposite rotation arrows and the
centre-distance dimension. When only the ratio is known, pass tooth counts as pitch diameters -
at equal module they are proportional.

## Rules

- A scene that does not validate throws a `TypeError`; nothing is drawn from bad numbers.
- Labels are shown exactly as given and are always escaped.
- Presets reject non-finite or out-of-range model values with a `TypeError`.
- `angleDiagram` draws angles from `RAY_ANGLE_MIN_DEG` to `RAY_ANGLE_MAX_DEG` (0 to 210
  degrees), or from `RAY_ANGLE_SIGNED_MIN_DEG` (-90) with `signed: true` - a downhill grade or a
  deviation under the reference drawn below the baseline on a taller view. It throws a `RangeError` for a
  ray, band edge or delta angle outside the chosen range - it never clamps an angle into a wrong
  drawing. Check values with `isDrawableAngle(deg, { signed })` and omit the diagram when one
  falls outside.
- `bendSectionDiagram` draws the neutral axis only from a `kFactor` the host gives; a band
  (`kFactorMin` + `kFactorMax`) without it is drawn alone, with no centre line.
- A scene's `title` renders as `<title>` and its `description` as `<desc>`, both escaped.
