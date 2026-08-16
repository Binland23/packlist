# Packlist

A personal packing app for frequent travelers. Save favorite **outfits**, keep a reusable **accessory bank**, skip staples per trip, plan **days** with outfits and extras, and tick each piece off as you pack.

Built as an installable **Progressive Web App** for iPhone (and any modern browser). Data stays on your device — no account, no server.

## Features

- **Closet** — outfits, clothes, and accessories under one tab; optional photo on each piece
- **Outfit library** — name looks, list pieces from clothing categories or free text, optional photo
- **Accessory bank** — save earrings, bags, shoes, and belts once and tap them onto outfits or days
- **Categories** — pick Tops (tees, blouses, sweatshirts), Layers (sweaters, blazers, jackets, coats, vests), Bottoms (jeans, pants, shorts, leggings, skirts), Dresses / Suits, Active (swim, workout), Intimates (bras, underwear, sleep), and Shoes (sandals, sneakers, flats, heels, boots) instead of typing every piece; drag to reorder each list
- **Staples** — toiletries, basics (bulk underwear/socks/sleepwear), tech, documents start on every trip; remove or add extras **for that trip only**. Outfit-specific bras or underwear live under Intimates and attach to the look.
- **Trips** — multi-day plans with multiple outfits **and extra items** per day
- **Packing checklist** — outfits expand to individual pieces; tap a look to pack every piece; repeats show on later days but check off once everywhere
- **Offline / home screen** — works as a standalone app once installed
- **Settings** — themes, text size, packing behavior, categories, export/import, searchable
- **Hints** — tap the gray tips at the top of a page to hide them

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
js/storage.js       Outfits, staples, accessories, trips (localStorage)
js/categories.js    Clothing category catalog
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
