# u-scene

Declarative engineering scenes for the web: parametric diagrams, interactive handles, and
simulation playback, with static SVG output.

A scene is plain data. The same scene renders to a static SVG string (no DOM, safe at build
time) and to an interactive `<u-scene>` element.

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

## Theming

Tones resolve to CSS custom properties with defaults, so a host themes every scene by
setting them on `u-scene` (and `svg.u-scene` for static markup):

    u-scene, svg.u-scene {
      --u-scene-ink: var(--my-text);
      --u-scene-paper: var(--my-surface);
    }

Tones: `ink`, `ink-strong`, `muted`, `faint`, `line`, `paper`, `primary`, `accent`,
`success`, `warning`, `danger`, `info`.

## Engineering presets

`angleDiagram`, `bendSectionDiagram`, `threadProfileDiagram`, `rectSectionDiagram`,
`ringSectionDiagram`, `floorPlanDiagram` - each takes a model of values and pre-formatted
labels and returns a scene. `angleDiagram` returns `null` when there are no rays to draw, and
`floorPlanDiagram` returns `null` when `fixtureCount` is zero or less.

## Rules

- A scene that does not validate throws a `TypeError`; nothing is drawn from bad numbers.
- Labels are shown exactly as given and are always escaped.
- Presets reject non-finite or out-of-range model values with a `TypeError`.
