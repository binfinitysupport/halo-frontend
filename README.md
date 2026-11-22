# halo-frontend – B-Infinity user app + Halo admin (Angular 18)

- `/` – B-Infinity user journey (generated from `prototypes/b-infinity-prototype.html`).
- `/admin` – Halo admin panel. Talks to the API in the `halo-backend` repo via `/api`.

## Run locally

```bash
npm install
npm run dev        # http://localhost:4200 – /api is proxied to http://localhost:5050 (proxy.conf.json)
npm run build      # output: dist/halo-admin/browser
```

Start the backend (`halo-backend`) on port 5050 first, or the admin shows "Request failed".

## Admin login

- Open the user app, choose **Login → Email**, and sign in with the admin email and password configured on the
  backend (`ADMIN_EMAIL` / `ADMIN_PASSWORD` in `halo-backend/.env`). You are taken to `/admin`.
- Any other login goes to the B-Infinity user journey as before.
- Opening `/admin` without a session redirects to `/?mode=login`. Sessions last 8 hours; **Log out** is in the
  admin sidebar (and in the menu on phones).

## Beginner guide: how the frontend is organised

There are two apps in one Angular project (Angular 18, TypeScript, HTML):

1. **The user app** (`/`) – the B-Infinity mobile screens. Its screens, styles and logic were **generated from the
   design prototype** (`prototypes/b-infinity-prototype.html`) by `tools/convert.js`, so they look and behave like the
   prototype. Data goes to and from the backend through `src/app/user/user-api.ts`. The hand-written bridge between
   the generated code and Angular is `src/app/user/user-app.component.ts`.
2. **The admin panel** (`/admin`) – normal hand-written Angular. Each page asks the backend for data.

### Read the code in this order

1. `src/main.ts` – starts the app.
2. `src/app/app.config.ts` – settings shared by the whole app (HTTP interceptors, router).
3. `src/app/app.routes.ts` – which URL shows which page.
4. `src/app/app.component.ts` – the admin layout (sidebar, top bar, current page).
5. `src/app/pages/users.component.ts` – a typical admin page: template, signals, a request to the API.
6. `src/app/core/api.service.ts` – how every admin page talks to the backend.
7. `src/app/user/user-app.component.ts` – the user app bridge; its header has a map of the file.
8. `src/app/user/user-api.ts` – every user-app call to the backend, one method each.
9. `src/app/user/user-logic.ts` – the generated screen logic. Start at `renderVals()` (the view model) and follow the
   `// coins`, `// register / login`, `// sheets` … comments.
10. `src/app/user/user-app.html` – the generated screens. Search for `SCREEN:` to jump to a screen or sheet.

### Every file in `src`

| File | What it does |
|---|---|
| `main.ts` | Starts the app (`bootstrapApplication`). |
| `index.html` | The one HTML page. Holds the `<app-root>` tag and a small iPhone zoom fix. |
| `environments/*.ts` | The backend address: `/api` locally, the Render URL in production. |
| `app/root.component.ts` | Empty shell that only holds the router outlet. |
| `app/app.config.ts` | Registers the HTTP interceptors and the router. |
| `app/app.routes.ts` | URL table: `/` → user app, `/admin` → admin panel (guarded). |
| `app/app.component.ts` | Admin layout: sidebar or phone menu, top bar, search, current page. |
| `app/core/nav.ts` | The admin menu items, in order. |
| `app/core/models.ts` | TypeScript shapes of the data the admin receives from the API. |
| `app/core/format.ts` | Display helpers: numbers, dates, initials, status colours. |
| `app/core/api.service.ts` | `get/post/patch/put` helpers for admin pages; error text helper. |
| `app/core/admin-auth.service.ts` | Admin login, logout and the saved session (localStorage). |
| `app/core/admin-auth.interceptor.ts` | Adds the admin token to API calls; logs out on a 401 answer. |
| `app/core/admin-auth.guard.ts` | Blocks `/admin` unless an admin is logged in. |
| `app/core/loading.ts` | Counts running requests for the top loading bar. |
| `app/core/ui.store.ts` | Shared admin state: current page, search text, toast, sidebar badges. |
| `app/pages/*.component.ts` | One admin page each: Dashboard, Users, KYC review, Deposits/Withdrawals (money), Banners (content), Settings. |
| `app/components/*.ts` | Shared admin pieces: sidebar, user drawer, KYC pop-up, loader, toggle, icons. |
| `app/user/user-api.ts` | Hand-written. Calls the backend for the user app (register, login, wallets, deposits …). |
| `app/user/user-app.component.ts` | Hand-written. Connects the generated screens to Angular and to `user-api.ts`. |
| `app/user/user-h.ts` | Hand-written. `h()` builds small HTML pieces (coins, charts) that the screens show. |
| `app/user/user-morph.directive.ts` | Hand-written. `[uMorph]` updates those pieces in place so animations keep running. |
| `app/user/user-logic.ts` | **GENERATED** – the prototype's screen logic (`renderVals()` is the view model). |
| `app/user/user-app.html` | **GENERATED** – the screens as Angular templates. |
| `app/user/user-app.css` | **GENERATED** – the prototype's styles plus the responsive shell. |
| `user-data/*.js` | Copied from the prototype: country list, languages, flags, partner logos. |

Hand-written files can be edited freely. **Do not edit the three GENERATED files**; change the prototype or
`tools/convert.js` and regenerate instead (see below).

### Words you will meet

- **Component** – a piece of screen: a TypeScript class plus its HTML template.
- **Template** – the HTML inside a component. `@if` shows something when a condition is true; `@for` repeats it.
- **Signal** – a value that the screen re-reads automatically when it changes (`count = signal(0)`, `count.set(1)`).
- **`computed()`** – a value worked out from signals; it updates by itself.
- **`effect()`** – code that runs again whenever the signals it reads change (used to reload a list when a filter changes).
- **`input()` / `output()`** – how a parent component passes data down and receives events back up.
- **Service** – a class shared across the app (for example `ApiService`), created once.
- **Interceptor** – code that runs on every HTTP request (adds the token, shows the loading bar).
- **Guard** – code that decides whether a route may open (`adminAuthGuard`).
- **View model (`vm`)** – in the user app, the object `renderVals()` returns; the template reads `vm.something`.
- **`setState()`** – the prototype's way to change data; it bumps `version` so Angular re-renders.
- **`h()` / `Html`** – builds an element as HTML text; `[uMorph]` shows it.
- **`patchOnce` / `patchRange` (in `tools/convert.js`)** – replace a piece of the prototype's code with a call to our
  component. They fail loudly if the prototype text changed, so a broken connection cannot go unnoticed.

### Common changes

- **Change an admin page:** edit `src/app/pages/<page>.component.ts` (its template is inside the same file).
- **Change a user-app text, colour or layout:** edit `prototypes/b-infinity-prototype.html`, then regenerate.
  Never edit `user-app.html` by hand.
- **Change what a user-app button does on the server:** edit the matching method in `user-app.component.ts`
  (or `user-api.ts` for the request itself). The converter's `patchOnce` / `patchRange` lines in `tools/convert.js`
  show which prototype handler calls which method.

### Regenerate the user app

```bash
T=$(mktemp -d) && node tools/unpack.js prototypes/b-infinity-prototype.html $T && node tools/split.js $T && node tools/convert.js $T src/app/user
```

The converter writes `user-logic.ts` over several lines (so it can be read) and puts a `SCREEN:` comment before each
screen and sheet in `user-app.html`. Neither change alters what the app does.

### How an admin page loads data (example: the Users page)

```
sidebar click ──► UiStore.go('users')          (core/ui.store.ts: remembers which page is open)
              ──► AppComponent shows <app-users> (app.component.ts)
              ──► UsersComponent.reload()        (pages/users.component.ts)
              ──► ApiService.get('/users')       (core/api.service.ts)
              ──► adminAuthInterceptor adds the login token, loadingInterceptor shows the top bar
              ──► backend GET /api/users  ──► rows shown in the table
```

### How a user-app button reaches the server (example: Register)

```
Submit button (generated user-app.html)  (click)="vm.submitRegister($event)"
  ──► submitRegister() in user-logic.ts  (the prototype's own checks: phone, email, captcha, agree box)
  ──► patchRange in tools/convert.js     replaced the account step with this.registerAccount(R, s.invite)
  ──► UserAppComponent.registerAccount() (user-app.component.ts)
  ──► userApi.register()                 (user-api.ts)  ──► POST /api/app/auth/register
  ──► the screen state is updated with setState(), and Angular shows the home screen
```

How admin login works:

```
user app login form (Email tab) ──► no user account matches ──► UserAppComponent.tryAdminLogin()
  ──► AdminAuthService.login() ──► backend POST /api/auth/login ──► token saved ──► go to /admin
/admin is protected by adminAuthGuard: no valid token ──► back to the login form (/?mode=login)
```

## Code map

```
src/app/app.routes.ts            routes: '' user app, 'admin' admin panel (guarded)
src/app/core/admin-auth.*        admin session: login service, route guard, token interceptor
src/app/core/api.service.ts      HTTP helper for the admin API (base URL from src/environments)
src/app/core/ui.store.ts         admin UI state: current page, search, toast, sidebar badges
src/app/pages/                   one component per admin page
src/app/components/              shared admin pieces: sidebar, user drawer, KYC modal, loader, icons
src/app/user/                    B-Infinity user app; user-logic.ts / user-app.html / user-app.css are GENERATED
                                 by tools/convert.js from prototypes/ – edit the converter, not those files
tools/                           unpack.js, split.js, convert.js – rebuild the user app from the prototype
```

## Deploy on Vercel

`vercel.json` configures the build (`npm run build`, output `dist/halo-admin/browser`) and serves
`index.html` for every path, so `/admin` works on refresh. No Vercel environment variables are needed.

The API address comes from Angular environment files:
- `src/environments/environment.ts` – production (Vercel): the Render URL.
- `src/environments/environment.development.ts` – `npm run dev`: `/api`, proxied to `localhost:5050`.

The app calls Render directly, so the backend's `CLIENT_ORIGIN` on Render must list the Vercel URL (CORS).
