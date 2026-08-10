# Packlist

A personal packing app for frequent travelers. Save favorite **outfits** (clothes + accessories together), keep a list of **staples** you bring every time, plan **trips** day by day, and tick items off as you pack.

Built as an installable **Progressive Web App** for iPhone (and any modern browser). Data stays on your device — no account, no server.

## Features

- **Outfit library** — name looks, list pieces & accessories, optional photo (add later from your camera roll)
- **Staples** — toiletries, basics, tech, documents — auto-included on every packing list
- **Trips** — multi-day plans with **multiple outfits per day**
- **Packing checklist** — large tap targets, progress %, reset when needed
- **Offline / home screen** — works as a standalone app once installed

## Quick start (local)

Serve the folder over HTTP (required for service workers and photo APIs):

```bash
# from this directory
python3 -m http.server 8080
# or
npx --yes serve -l 8080
```

Open [http://localhost:8080](http://localhost:8080) on your Mac, or use your Mac’s LAN IP from your iPhone on the same Wi‑Fi.

## Install on iPhone

1. Deploy to **GitHub Pages** (or any HTTPS host) — see below  
2. Open the site in **Safari**  
3. Tap **Share** → **Add to Home Screen**  
4. Launch **Packlist** from your home screen (standalone, no browser chrome)

Photos and lists are stored in Safari’s local storage / IndexedDB for that site.

## Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Initial Packlist PWA"
gh repo create packlist --public --source=. --remote=origin --push
# Enable Pages: Settings → Pages → Deploy from branch → main → / (root)
# Or:
gh api repos/$(gh api user --jq .login)/packlist/pages -X POST \
  -f "source[branch]=main" -f "source[path]=/"
```

Your app will be at:

`https://<username>.github.io/packlist/`

> **Note:** If the repo name is not the site root, relative paths in this project (`./`, `manifest.json`, `sw.js`) still work under a subpath.

After each deploy that changes app files, bump `CACHE_VERSION` in `sw.js` so installed clients pick up the new build.

## Project layout

```
index.html          App shell
css/styles.css      Mobile-first UI
js/db.js            IndexedDB photos
js/storage.js       Outfits, staples, trips (localStorage)
js/app.js           Screens & interactions
manifest.json       PWA manifest
sw.js               Offline precache
assets/icons/       App icons
scripts/render-icons.mjs
```

## Privacy

Everything is stored **only on your device**. Clearing Safari site data for the Packlist URL will erase outfits, trips, and photos.

## Regenerating icons

```bash
node scripts/render-icons.mjs
```
