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

`vercel.json` configures everything:
- build `npm run build`, output `dist/halo-admin/browser`
- `/api/*` is forwarded to the Render backend (`https://halo-backend.onrender.com`). If your Render
  URL is different, change the `destination` in `vercel.json`.
- every other path serves `index.html`, so `/admin` works on refresh.

## Regenerating the user app from the prototype

```bash
T=$(mktemp -d)
node tools/unpack.js prototypes/b-infinity-prototype.html $T
node tools/split.js $T
node tools/convert.js $T src/app/user
```
