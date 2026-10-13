# u-scene

Declarative engineering scenes for the web: parametric diagrams, interactive handles, and
simulation playback, with static SVG output.

A scene is plain data. The same scene renders to a static SVG string (no DOM, safe at build
time) and to an interactive `<u-scene>` element.

u-scene never computes domain values and never formats numbers: the host computes, formats
its labels, and hands over a scene. u-scene only maps it to the screen.

Status: 0.x - the API changes between minor versions.
