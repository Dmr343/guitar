# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A collection of interactive guitar-practice web tools (Spanish-first, ES/EN i18n) under `tools/`, deployed as a static site to Cloudflare Pages (`harmonic.dadiabatic.com`). The rest of the repo holds personal study material and dev docs that are **not** part of the deployed site.

Each tool is a standalone HTML page in `tools/` (`diapason.html`, `escalas.html`, `acordes.html`, `intervallic.html`, `improvisar.html`, plus the `backing-track/` module). `tools/index.html` is the portal linking them.

Non-deployed top-level folders:
- `docs/prompts/` — PRDs/specs used to build the tools (`INTERVAL_ATLAS_SPEC.md`, `PRD-backing-track.md`).
- `prompts/` — `PLAN-DE-ACCION-harmonic.md`, the active improvement roadmap for the suite (phases A–F: shareable URL state, pitch detection, WAV export, SEO/PWA, etc.).
- `study/` — personal learning material: `guides/` (markdown guides, tracked), `lessons/transcripts/` + `lessons/pdfs/` (lesson material, git-ignored), `media/`.
- `gear/` — guitar hardware notes (comparativas, calibration guide).
- `archive/` — old exports/backups.

## The one hard constraint: must run from `file://`

Daniel opens these tools by double-clicking the HTML — no server. This forbids ES modules and any build step. **Every JS file is a plain script** using the IIFE + global-namespace pattern, loaded via `<script src>` tags in dependency order.

- No `<script type="module">`, no top-level `import`/`export`.
- Shared code attaches to `window.GuitarShared` (e.g. `window.GuitarShared.theory`), consumed via `const { ... } = window.GuitarShared.theory;`.
- Regression guard: `bash tools/shared/check-no-modules.sh` (exits non-zero if a module pattern slips in). Run it after touching shared JS or HTML script tags.
- See memory `file_protocol.md`.

## Architecture

**Shared layer** (`tools/shared/`) — framework-free primitives every tool builds on:
- `theory.js` → `GuitarShared.theory` (chromatic, pitch classes, scale/chord building; handles flat spellings like Eb/Ab).
- `fretboard.js`, `positions.js`, `theory-modes.js`, `metronome.js`, `storage.js` — fretboard math, CAGED positions, modes, a Web-Audio metronome, localStorage helpers.
- `test-runner.js` → `GuitarShared.testRunner` — tiny browser test harness (`describe`/`it`/`assertEq`).

**Per-tool pages** inline their own UI logic in a `<script>` block and pull in the shared scripts they need (see the `<script src>` list at the bottom of each HTML).

**Intervallic Atlas** (`tools/intervallic/`) — the most layered tool: `progression-model.js` (data) → `transport-controller.js` (playback) → `fretboard-renderer.js` (view) → `atlas.js` (orchestration), plus `audio.js`, `presets.js`, `persistence.js`.

**Backing Track module** (`tools/backing-track/`) — the largest subsystem; a Tone.js-based looping accompaniment generator. See its `LEEME.md`. Key split:
- `index.html` — all UI markup. `styles.css` — all styling. `app.js` — UI glue that builds dynamic DOM (tracks, editors, indicators). **Keep element `id`s stable — `app.js`/`engine.js` reference them.**
- `engine.js` — Tone.js audio engine; `scheduler.js`, `grooves.js`, `patterns.js`, `humanize.js`, `step-grid.js` — sequencing/timing. `presets.js`, `progressions.js`, `instruments.js`, `voicing.js`, `transpose.js` — sound/data catalogs. `storage.js`, `user-library.js` — saved user sounds.
- `vendor/` — Tone.js, WebAudioFont (committed, not fetched).
- `integration.js` — optional hand-off from the Atlas: the Atlas writes a progression JSON to the `backing_track_handoff` localStorage key and opens this page; the module reads and clears it. Loose coupling — works fine standalone.

**i18n** (`tools/i18n.js` → `window.I18N`) — ES (default) / EN. Markup uses `data-i18n="key"` / `data-i18n-attr="placeholder:key"`; dynamic JS uses `I18N.t('key')` and re-renders on the `i18n:changed` event. Each page calls `I18N.register({ es:{...}, en:{...} })` with its own dictionary.

## Tests

Tests are **browser-based**, not Node. Each area has a runner HTML that loads modules + their `*.test.js` in order and calls `GuitarShared.testRunner.run(...)`:
- `tools/shared/test.html`
- `tools/intervallic/test.html`
- `tools/backing-track/tests.html`

Run by opening the relevant `test.html` in a browser (green = pass). To run a single suite, comment out the other `<script src>` test lines in that HTML, or run a focused page. Test files have no `module.exports`, so `node file.test.js` will not work.

## Deploy

Static deploy to Cloudflare Pages, **only `tools/` is served** (root study material is git-ignored). `tools/_redirects` holds route rules (e.g. `/oido` → `/`, since the ear-trainer is disabled). See memory `deploy-harmonic.md`.

## Conventions

- Comments and UI copy are in Spanish; address the user as "usted".
- Icons are inline custom SVG (no emoji in shipped UI — recent commits converted them).
- Keyboard shortcuts per tool are documented in `tools/atajos.md`.
- The backing-track module is under active planning: PRD/issues tracked on GitHub (memory `backing-track-module.md`).
