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

## Deploy on Vercel

`vercel.json` configures the build (`npm run build`, output `dist/halo-admin/browser`) and serves
`index.html` for every path, so `/admin` works on refresh. No Vercel environment variables are needed.

The API address comes from Angular environment files:
- `src/environments/environment.ts` – production (Vercel): the Render URL.
- `src/environments/environment.development.ts` – `npm run dev`: `/api`, proxied to `localhost:5050`.

The app calls Render directly, so the backend's `CLIENT_ORIGIN` on Render must list the Vercel URL (CORS).

## Regenerating the user app from the prototype

```bash
T=$(mktemp -d)
node tools/unpack.js prototypes/b-infinity-prototype.html $T
node tools/split.js $T
node tools/convert.js $T src/app/user
```
