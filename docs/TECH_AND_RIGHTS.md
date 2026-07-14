# ChronoPin — Tech & commercial rights

Working notes for shipping a **paid** app where we actually have the right to use the assets.
Not legal advice — verify licenses before release.

**Product overview:** [`README.md`](../README.md)

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

### Guess map (the pin UI)
Prefer **not Google**:
- **OpenStreetMap** tiles via MapLibre + a commercial tile host (MapTiler, Stadia, Protomaps self-host)
- Or **Mapbox** (clear commercial pricing)

Always show required attribution (© OpenStreetMap contributors, etc.).

### Practical Classic V1
Ship **curated packs** first (rights you control).  
Optionally add Mapillary/Panoramax later as "Explore" if ToS still fits a paid app.

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

<!-- TODO: expand with app ↔ CDN ↔ pack manifest ↔ multiplayer sync diagram -->

See also: [`README.md`](../README.md) for product scope, modes, and V1 roadmap.
