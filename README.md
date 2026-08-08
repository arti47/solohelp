# Solo Session Runner

Installable PWA implementing the OPEN / RUN / LAND solo RPG session protocol.
React 18 + Vite 6 + Tailwind 4 + vite-plugin-pwa. State persists in `localStorage`.
System-agnostic: your resolution mechanics live inside the PLAY step, untouched.

## Deploy to GitHub Pages

1. Create a repo. If you name it something other than `solo-session-runner`,
   change `REPO` at the top of `vite.config.js` to match — the `base` path,
   `start_url`, `scope` and SW `navigateFallback` all derive from it.
   For a user site (`<username>.github.io`), set `REPO = ""`.

2. Push:
   ```bash
   git init && git add -A
   git commit -m "init: solo session runner"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

3. Keep `package-lock.json` committed — `setup-node`'s `cache: npm` and `npm ci`
   both fail without it, before the build runs. Regenerate with `npm install`.

4. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.

5. Push to `main` triggers `.github/workflows/deploy.yml`. Live at
   `https://<user>.github.io/<repo>/`.

## Add to home screen

- **Android/Chrome**: open the URL → menu → *Add to Home screen* / *Install app*.
- **iOS/Safari**: open the URL → Share → *Add to Home Screen*. iOS ignores
  `manifest.display`, so `apple-mobile-web-app-capable` in `index.html` is what
  gives you the standalone (chrome-less) window.
- Launches offline after first load; the service worker is `autoUpdate`.

## Local

```bash
npm install
npm run dev      # http://localhost:5173/<repo>/
npm run build && npm run preview
```

The service worker is disabled in `dev`. Test install behaviour against `preview`
or the deployed URL.

## Data

Single key `ssr:solo-runner:campaign`, JSON, batched — one write per mutation.
`src/storage.js` mirrors the Claude artifact `window.storage` async API, so the
component is portable between the two environments unchanged.

Storage is per-origin and per-device. No sync, no backend. **Reset campaign**
at the bottom of the page wipes it. Add an export button before you care about
a campaign you'd hate to lose.

## In-app help

Every panel carries a `?` toggle with plain instructions for that step. Help is
expanded by default and stays collapsed per panel once you dismiss it. A
first-run orientation block above O1 explains the OPEN/RUN/LAND loop; **guide**
in the header brings both back. Blocked actions state their reason under the
disabled button rather than only after you click.

Help state lives in `solo-runner:ui`, separate from campaign data, so **reset
campaign** does not re-teach you. Copy lives in `HELP` / `ORIENTATION` at the top
of `src/SoloSessionRunner.jsx`.

## Enforcement rules (why the UI blocks you)

| Rule | Reason |
|---|---|
| Intent required to leave OPEN | a session with no falsifiable goal has no ending |
| Seed required to close | starting cold is the top cause of abandoned campaigns |
| No bare yes/no from the oracle | bare answers resolve without consequence and stall the story |
| Log line required before resolve | deferred logging is no logging |
| Tension auto-adjusts on resolve | automatic difficulty curve, no bookkeeping |
| Thread cap 6 | past six, decision paralysis |
| Scene prompt at 3, warning at 5 | beyond five, logging quality collapses |
| Stall (3 oracle calls, no log) and lull (5 min idle) detectors | replaces the pacing reflex a live GM supplies |

## Structure

```
index.html            manifest links, iOS standalone meta
vite.config.js        base path + PWA manifest/workbox
src/main.jsx          entry
src/SoloSessionRunner.jsx   protocol UI + state machine
src/storage.js        window.storage-compatible localStorage shim
public/icon-*.png     192 / 512 / maskable-512
.github/workflows/deploy.yml   build + Pages deploy on push to main
```
