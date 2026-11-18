# halo-frontend – notes for Claude Code

## What this is
- **Admin panel** – served at `/admin`. Built from `prototypes/admin-prototype.html`.
  Verified against the prototype. **Do not change admin code, styles or behaviour** unless asked.
  Mobile deviations (asked for): narrower topbar search below 600px, stacked banner rows on phones,
  centred icons, loaders (`core/loading.ts`, `components/loader.component.ts`).
- **User journey** – served at `/`. Generated from `prototypes/b-infinity-prototype.html` (Beyond Infinity).
  `prototypes/user-journey-prototype.html` is the older Halo version, kept for reference only.
  No phone frame. Screens keep the prototype's 402px design width: on phones (≤600px) the screen is
  CSS-zoomed to the device width, on wider viewports it is a centred 402px column.
- **Backend** – separate repo `halo-backend` (Express + Neon). Locally on port 5050; in production on Render.
  API base URL: `src/environments/environment.ts` (production → Render URL) and
  `environment.development.ts` (`/api`, proxied by `proxy.conf.json`). Render's `CLIENT_ORIGIN` must include the Vercel URL.

## Commands
- `npm install`, `npm run dev` (port 4200), `npm run build` (→ `dist/halo-admin/browser`).
- Deployed on Vercel via `vercel.json` (no env vars). If the Render URL changes, update `src/environments/environment.ts`.

## Layout
- `src/app/app.routes.ts` – `''` → user app, `'admin'` → admin.
- `src/app/user/` – **generated** by `tools/convert.js`; do not hand-edit `user-app.html`, `user-logic.ts`, `user-app.css`.
  - `user-h.ts` – `h()` replaces React.createElement; returns `Html` values.
  - `user-morph.directive.ts` – `[uMorph]` renders `Html` slots by patching the DOM in place (like React), so CSS animations are not restarted on re-render. Never switch these slots back to `[innerHTML]`.
  - `user-app.component.ts` – Angular wrapper: lifecycle, `vm` getter, `uShow`/`uSync`, phone zoom (`fit()`).
- `src/user-data/` – the prototype's global data scripts (countries, languages, flags, partner logos), loaded via `angular.json` `scripts`.
- `src/assets/fonts/` – Inter 900 (used by the B-Infinity logo text).

## Regenerating the user app
```
T=$(mktemp -d)
node tools/unpack.js prototypes/b-infinity-prototype.html $T
node tools/split.js $T
node tools/convert.js $T src/app/user
```
If the prototype's fonts or data scripts change, also copy the woff2 files listed in `$T/fonts.txt` into
`src/assets/fonts/` and the two `<script src>` files of the prototype into `src/user-data/`.
The converter mirrors the dc-runtime: `sc-if/sc-for` → `@if/@for`, `{{ x }}` → `<span class="sc-interp">`,
element values → `[uMorph]`, server sheet → flex column on short screens, `onChange` on text inputs → `(input)`, and it resets `box-sizing` to `content-box`
inside the user app (the admin's global reset uses border-box).

## Status
- Admin: working and verified on desktop and mobile (390×844).
- User journey: all 18 screens, 11 sheets and the maintenance page match the prototype (text, position, size,
  colour, font at 402×874). Deliberate difference: Partners chart labels are visible (the prototype hides them by a bug).
- User accounts, balances, deposits, withdrawals and orders are client-side only (as in the prototype). Not in the database yet.

## Working rules
- Verify UI changes against the prototype at the same viewport (402×874 or 390×844 phone, 1280×800 desktop).
- Run `npm run build` after every change.
- Signals must not be written synchronously inside `effect()` (NG0600); the loading counter defers with a microtask.
