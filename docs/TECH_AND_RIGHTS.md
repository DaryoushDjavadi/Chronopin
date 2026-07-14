# ChronoPin — Tech & commercial rights

Working notes for shipping a **paid** app where we actually have the right to use the assets.
Not legal advice — verify licenses before release.

**Product overview:** [`README.md`](../README.md)  
**Web prototype (technical):** [`WEB_PROTOTYPE.md`](./WEB_PROTOTYPE.md)

---

## Web prototype — current bundled assets

The playable demo in [`web/`](../web/) uses only assets we can document and attribute. Before App Store release, re-verify each license.

### Panoramas (Classic mode test content)

- **83 equirectangular JPGs** in `web/public/panoramas/` (Wikimedia Commons + Panoramax + one KartaView scene)
- Catalog: `web/src/data/panoramas.ts` — source tags: `wikimedia`, `panoramax`, `kartaview`
- Source: **Wikimedia Commons** (CC BY-SA 3.0 / 4.0 and similar — per-file in [`web/public/panoramas/LICENSE.md`](../web/public/panoramas/LICENSE.md)) plus **Panoramax** / **KartaView** where noted
- Downloaded via Wikimedia `Special:FilePath?width=1536` (scaled) or `npm run import:panos` (`scripts/import-external-panos.mjs`, optional `--merge`, `--only city1,city2`)
- **Commercial use:** CC BY-SA generally allows commercial use **with attribution and ShareAlike on derivatives** — confirm per file; keep attribution in-app and in repo
- **Not for final product volume alone** — curated/owned packs remain the commercial Classic strategy; Wikimedia/Panoramax/KartaView JPGs are fine for **prototype / dev testing**

### Mapillary Live (prototype — streamed, not bundled JPGs)

- **61 city seed locations** in `data/mapillary-live-spots.ts` — resolved at runtime via Mapillary Graph API
- Viewer: **MapillaryJS** (`lib/mapillary-viewer.ts`); lookup: `lib/mapillary-api.ts`
- Requires free **client access token** (`VITE_MAPILLARY_ACCESS_TOKEN` in `web/.env`, baked into build for Strato)
- User toggles: library visibility + optional inclusion in solo gameplay (`lib/mapillary-live-catalog.ts`)
- **Before paid launch:** read Mapillary Terms §12 Commercial; app must supplement Mapillary, show attribution; do not long-term cache/rehost tiles without permission
- Thumbnails cached locally for UX only — not a substitute for licensing review

### Avatar sprites (Universal LPC)

- Subset in `web/public/avatar/lpc/` — walk animation sheets (male + female)
- Source: [Universal LPC Spritesheet Character Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)
- Licenses: **CC-BY-SA 3.0**, **GPL 3.0**, **OGA-BY 3.0** (per layer — see [`web/public/avatar/lpc/LICENSE.md`](../web/public/avatar/lpc/LICENSE.md) and upstream CREDITS.csv)
- **Before paid launch:** audit CREDITS.csv; prefer CC0/OGA-BY layers where possible; show in-app credits
- Home menu **Attributes / Credits** overlay lists body/head/face attribution (`data/avatar-credits.ts`, `lib/credits-ui.ts`); editor footer links to Universal LPC
- ShareAlike may affect **redistributing modified sprite sheets** — document what you ship

### App branding

- **ChronoSwitch** logo: `logo/ChronoPinLogo.png` (source) + `web/public/ChronoPinLogo.png` (served as home logo & favicon)
- Working product name in repo/docs may still say **ChronoPin** — logo artwork reads **ChronoSwitch**

### Maps & 360 viewer (runtime, not stored)

| Service | Use | Notes |
|---|---|---|
| **OpenFreeMap** + MapLibre | Guess/result pin map | OSM-based; show attribution |
| **Pannellum** (jsDelivr CDN) | 360° viewer for static JPG panos | MIT license; CDN script in `index.html` |
| **MapillaryJS** (npm bundle) | 360° viewer for Mapillary Live streams | Mapillary ToS + attribution required |
| **Google Fonts** | DM Sans, JetBrains Mono, Press Start 2P | SIL Open Font License |

### Web prototype — production gaps (rights & scope)

| Area | Prototype status |
|---|---|
| Classic panoramas | Wikimedia + Panoramax + KartaView JPG set (~83) — replace/expand for store |
| Past/Future rounds | Placeholder years on Classic panos (no separate AI asset packs yet) |
| Social / Co-op / Scoreboard | **Real Firebase** when `.env` configured — not mock UI |
| Panorama difficulty ratings | Firestore `panoramaRatings` when online |
| XP / Level progression | **Local only** (`localStorage`) — no cloud account data yet |
| Level perks | Placeholder copy only — no gameplay bonuses shipped |
| Mapillary Live | **Playable in prototype** (API stream + MapillaryJS) — legal review before store |

---

## Goal

Sell ChronoPin (~€1–2) in App Store / Play Store without depending on a fragile Google Street View deal like GeoGuessr has.

Split imagery by mode:

| Mode | Imagery source | Who owns / licenses it |
|---|---|---|
| Classic | Open street-level or **our curated packs** | Us + attribution to source |
| Past | **AI-generated** panoramas/scenes we produce | Us (via API output terms) |
| Future | **AI-generated** speculative scenes | Us (via API output terms) |
| Guess map | OpenStreetMap / MapLibre / MapTiler / Mapbox | Provider ToS + OSM attribution |

Do **not** scrape or bulk-store Google Street View. GeoGuessr can; indie apps generally cannot cheaply or cleanly.

---

## Classic mode — real "street view"

### Avoid as core product
- **Google Street View / Maps Platform**
  - Pay-per-pano, ToS forbids scraping / bulk storing / building a Maps substitute
  - Content must stay inside Google's services model
  - Fine for a tiny prototype; bad foundation for a €2 commercial game

### Realistic options

#### A) Curated static packs (recommended for V1 commercial)
- Own photos, commissioned shoots, or clearly licensed stills / panoramas
- Each round = `{ imageUrl, lat, lng, attribution, license }`
- Host on your CDN (Cloudflare R2, etc.)
- Pros: full control, predictable cost, App Store review friendly  
- Cons: not "infinite world"; start with 40–200 rounds

#### B) Mapillary (live API + MapillaryJS)
- Crowdsourced street imagery; many indie GeoGuessr clones use it
- User images typically **CC BY-SA** → attribution + ShareAlike obligations
- Commercial use allowed under Mapillary ToS **with extra conditions** (privacy: no unblurring faces/plates; developer apps must not merely rehost Mapillary)
- Pros: lots of coverage, "real explore" feel  
- Cons: Meta-owned ToS can change; thinner than Google; ShareAlike & attribution UX; confirm game use is OK for your exact integration

#### C) KartaView
- Imagery often **CC BY-SA 4.0** → commercial OK with attribution + ShareAlike
- Coverage weaker than Mapillary/Google
- Good as supplementary pack source

#### D) Panoramax
- Open / FOSS-friendly street imagery (stronger in some EU regions)
- Check instance license per dataset; promising long-term alternative
- **Already used** in web prototype import pipeline (`npm run import:panos -- --source panoramax`)

### Guess map (the pin UI)
Prefer **not Google**:
- **OpenStreetMap** tiles via MapLibre + a commercial tile host (MapTiler, Stadia, Protomaps self-host)
- Or **Mapbox** (clear commercial pricing)

Always show required attribution (© OpenStreetMap contributors, etc.).

### Practical Classic V1
Ship **curated packs** first (rights you control).  
Optionally add Mapillary/Panoramax later as "Explore" if ToS still fits a paid app.

### Recommended third-party source (Classic expansion)

**Primary pick: [Mapillary](https://www.mapillary.com/)** (Meta)

Best balance for an indie commercial game that needs *more than Europe* without a Google deal:

| | Mapillary | KartaView | Panoramax |
|---|---|---|---|
| Global coverage | Good (crowdsourced) | Weaker | EU-focused |
| 360° imagery | Yes (API prefers 360) | Some | Growing |
| Commercial use | Allowed with **Section 12** extra terms | CC BY-SA + ToS | Instance-dependent |
| Integration | **MapillaryJS** viewer + Graph API v4 | API available | FOSS-friendly |
| Cost | Free tier / API access token | Free | Free |
| Risks | Meta ToS changes; must not re-host raw tiles; blur faces/plates; register app | ShareAlike; thinner coverage | Less global |

**What to do before shipping Classic on Mapillary:**
1. Register app at [Mapillary Developer](https://www.mapillary.com/developer) → `client_id` / token  
2. Read [Terms §12 Commercial](https://www.mapillary.com/terms) — app must *supplement* Mapillary, not just rehost  
3. Use **MapillaryJS** for viewing (not downloading & caching panos on your CDN long-term without permission)  
4. Show Mapillary + contributor attribution in-app  
5. User imagery is often **CC BY-SA** — document in `license_record`  
6. Email Mapillary (vendor@meta.com) if unsure about game use case  

**Fallback / supplement:** own curated CDN packs for flagship rounds; Mapillary for “Explore” volume.

**Not recommended as core:** Google Street View (see above).

---

## Past & Future — AI GeoGuessr images

### Pipeline (offline content factory)
1. Pick target `{ placeName, lat, lng, year, eraTag, shortFact }`
2. Generate scene (still or equirectangular 360°) with an API that grants **commercial use of outputs**
3. Human QA (looks wrong? trademark-heavy? creepy faces?)
4. Store final assets in **your** bucket + round JSON in DB
5. App only downloads **your** packaged rounds — no live "generate every game" (cost + moderation risk)

### Providers (check current ToS before buying credits)
| Provider | Why consider |
|---|---|
| OpenAI Image API | Commercial use of API outputs under business terms; pay-as-you-go |
| Flux / Black Forest (via API hosts) | Strong images; verify commercial license of the host you use |
| Adobe Firefly | Stronger "commercially safe / indemnified" marketing — usually pricier |

Prefer **API / business account**, not consumer ChatGPT screengrabs.

### Prompting approach
- Past: architecture, vehicles, clothing, weather consistent with year + place  
- Future: clearly **speculative** — sci-fi / plausible near-future, labeled in-game  
- Prefer **equirectangular** for 360 viewer (three.js / expo-gl later)  
- Or start with **flat stills** (cheaper, simpler UX)

### Rights & risk checklist
- You get rights to **outputs** under provider ToS — you do **not** get rights to paste Google/Mapillary photos into the prompt as style references without their license
- Don't train on scraped Street View
- Landmark / trademark / real-person likeness: QA + disclaimers ("AI reconstruction / speculative")
- EU: consider labeling AI-generated content where required
- Keep a `license_record.json` per asset: provider, date, model, prompt hash, commercial-term version

### Cost control
- Generate packs in batches (e.g. 50 past + 50 future)
- Reuse forever in the app → one-time content cost fits a €1–2 product much better than per-view Google billing

---

## Architecture sketch (commercial-friendly)

```
[Expo app]
  ├── Classic packs → CDN images you license/own
  ├── Past packs → CDN AI assets you generated
  ├── Future packs → CDN AI assets you generated
  ├── Map → MapLibre + OSM/MapTiler (pin only)
  └── Multiplayer → Firebase / Supabase rooms (co-op, duel)

[Content pipeline — offline]
  script → AI API → QA → upload CDN → publish round manifest

[Web prototype today]
  ├── Static hosting (Strato /Chrono/ or Firebase Hosting)
  ├── Firebase Auth + Firestore (profile, friends, co-op, scoreboard)
  └── localStorage (XP, stash, local chat cache, offline coop demo)
```

Multiplayer (co-op decide, 1v1) only syncs **guesses / pins / votes**, not heavy imagery (clients pull the same pack id).

**Progression (future):** XP/level can stay device-local for privacy-light V1, or sync to `users/{uid}` once perks affect multiplayer fairness — decide before shipping paid perks.

---

## What we will not do for paid launch
- Bulk download / cache Google Street View as our game library  
- Use Google imagery on a non-Google map stack in ways ToS forbid  
- Ship AI scenes without QA / labeling  
- Pretend AI past scenes are archival photos  

---

## Suggested build order (rights-first)

0. **Done:** Web prototype with Wikimedia/Panoramax/KartaView Classic pack + Mapillary Live (optional) + LPC avatars + Firebase co-op ([`web/`](../web/), [`WEB_PROTOTYPE.md`](./WEB_PROTOTYPE.md))  
1. Solo Classic with **owned/curated** static rounds + OSM map (replace/expand Wikimedia test set for store)  
2. Past pack via AI pipeline + in-app “AI reconstruction” label  
3. ~~Co-op Decide (2 players)~~ — **playable** in web prototype with Firebase  
4. 1v1 Duel (room codes)  
5. Future pack  
6. XP perks with real gameplay effect + optional cloud sync  
7. Optional: Mapillary/Panoramax “live classic” if legal review OK  
8. Later: Battle Royale  

---

## Repo / access

Remote: https://github.com/DaryoushDjavadi/Chronopin  
Push requires git credentials or Cursor GitHub App with write access to this repo.
