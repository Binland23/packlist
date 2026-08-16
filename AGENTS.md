# Packlist

Personal packing/wardrobe Progressive Web App (PWA). Pure client-side static site — HTML/CSS/vanilla JS with a service worker. No backend, no accounts; data lives on the device via `localStorage` + IndexedDB.

## Cursor Cloud specific instructions

- This is a zero-dependency static site: there is no `package.json`, no lockfile, no automated tests, and no linter/build step. There is nothing to install; `python3` and `node` are already available.
- Run the app by serving the repo root over HTTP, then open the printed URL:
  - `python3 -m http.server 8080` → http://localhost:8080
  - Service workers and the photo/IndexedDB APIs require `http://` (not `file://`), so always serve over HTTP rather than opening `index.html` directly.
- The service worker (`sw.js`) precaches app files aggressively. After editing any precached file, bump `CACHE_VERSION` in `sw.js` (and/or hard-refresh) so changes are picked up; otherwise the browser may keep serving the cached build.
- `node scripts/render-icons.mjs` regenerates the PWA icons in `assets/icons/`. It uses only Node builtins (no npm packages) and is optional — only run it when icons need regenerating.
- App structure (see `README.md` "Project layout"): `index.html` shell, `css/styles.css`, `js/app.js` (screens/interactions), `js/storage.js` (outfits/trips/accessories in localStorage), `js/db.js` (IndexedDB photos), `js/categories.js` (clothing catalog).
