# CLAUDE.md

## Working agreement

- Be terse. No preamble, no recap, no verbosity. Conserve tokens.
- Ask clarifying questions **one at a time**, not batched.
- Always merge work to `main` and push.
- Always update this file when conventions or architecture change.

## Project

Solo Session Runner — installable PWA implementing the OPEN / RUN / LAND solo RPG
session protocol. React 18 + Vite 6 + Tailwind 4 + vite-plugin-pwa.
System-agnostic: the user's own resolution mechanics live inside the PLAY step.

## Layout

```
src/SoloSessionRunner.jsx   entire app — protocol UI + state machine
src/storage.js              window.storage-compatible localStorage shim
src/main.jsx                entry
vite.config.js              base path + PWA manifest/workbox
.github/workflows/deploy.yml  build + Pages deploy on push to main
```

## Deploy

`REPO` at the top of `vite.config.js` **must equal the GitHub repo name**
(currently `solohelp`). It drives `base`, PWA `start_url`/`scope`, and SW
`navigateFallback`. Wrong value = green build, blank page, assets 404.

`package-lock.json` must stay committed — `setup-node`'s `cache: npm` and
`npm ci` both fail without it, before the build ever runs.

Live: https://arti47.github.io/solohelp/

## State

Two localStorage keys, both namespaced `ssr:` by `storage.js`:

- `solo-runner:campaign` — all game state (`BLANK` shape).
- `solo-runner:ui` — help state (`BLANK_UI`). Deliberately separate so
  **reset campaign** does not re-teach the user.

`put()` writes campaign, `putUi()` writes UI state. One write per mutation.

## Phase machine

`s.phase` is `open` → `run` → `land` → `open`.

```
OPEN  O1 recap → O2 state check → [Open session N] → O3 tick world → O4 intent
RUN   frame scene → oracle / moves → log line → resolve (adjusts tension)
LAND  L1 cut → L2 verdict → L3 log → L4 deltas → L6 seed → [Close] → archive
```

`pc` / `worldStatus` are campaign-level carry-over. At LAND they preload
`deltaPc` / `deltaWorld`; `closeSession()` writes them back. This is the
"start warm" mechanism.

## Help system

- `HELP` — map of `helpId` (falls back to Panel `title`) → plain instructional
  copy. **Voice: plain and instructional, not the README's terse/opinionated
  register.** Say what to do and what blocks you.
- `Panel` reads `HelpCtx` and renders a `?` toggle. Help is **open by default**
  and collapses only once the user dismisses it; state persists per panel.
- `ORIENTATION` — numbered first-run block above O1, dismissed with "got it".
- Header **guide** button resets both (`{closed:{}, orientation:false}`).
- Adding a panel? Add a `HELP` entry keyed by its title, or pass `helpId` when
  the title is dynamic (e.g. `Scene N · Frame` → `helpId="scene"`).

## Enforcement

Three hard gates: intent before RUN, log line before resolve, seed before close.
Each gate is stated **before** the click as a `<Hint>` under a disabled button,
and still guarded in the handler (`setErr`) as defense. Soft nudges: scene
prompt at 3, warning at 5, stall detector at 3 unlogged oracle calls, 5-min lull.

## Commands

```bash
npm install
npm run dev        # SW disabled in dev
npm run build      # always run before pushing
npm run preview    # test install/SW behaviour
```
