# ChronoPin — Web Prototype (technical)

Playable browser prototype under [`web/`](../web/). Validates core loop before Expo/React Native.

**Run:** `cd web && npm install && npm run dev` → http://localhost:5173

**Product & roadmap:** [`README.md`](../README.md#zuletzt-umgesetzt--roadmap-schnell-nachschlagen)  
**Licensing:** [`TECH_AND_RIGHTS.md`](./TECH_AND_RIGHTS.md#web-prototype--current-bundled-assets)

---

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 6 + TypeScript (strict) |
| 360° viewer | [Pannellum](https://pannellum.org/) (CDN) |
| Guess map | MapLibre GL JS + [OpenFreeMap](https://openfreemap.org/) Liberty style |
| UI | Vanilla TS + single `styles.css` (~2.6k lines) |
| Persistence | `localStorage` only (no backend yet) |
| Avatars | Universal LPC sprite subset (canvas compositor) |

---

## Game flow

```
onboarding → home → explore → guess → result → (next round | gameover)
                      ↑___________|
```

- **3 hearts** per run (`MAX_HEARTS` in `types.ts`)
- Lose heart if distance **> 1,500 km** or year error **> 80 years**
- **Classic / Past / Future** modes — Past/Future add year slider + era chips
- Scoring in `lib/geo.ts` (`scoreGuess`)

---

## Screens & features

| Screen | File / renderer | Notes |
|---|---|---|
| Onboarding | `renderOnboarding()` | Name + avatar editor |
| Home | `renderHome()` | Modes, tools, social button |
| Explore | `renderExplore()` | Pannellum + session HUD + inventory |
| Guess | `renderGuess()` | MapLibre pin + optional year |
| Result | `renderResult()` | Grade, map line, context |
| Game Over | `renderGameOver()` | Final score → scoreboard |
| Library | `renderLibrary()` | Browse / hide panoramas |
| Library View | `renderLibraryView()` | Full-screen preview |
| Scoreboard | `renderScoreboard()` | Local high scores by mode |
| Player Info | `renderPlayerInfo()` | Stats + edit profile |

**Overlays (not separate screens):**
- **Inventory** — explore/guess only (`lib/inventory-ui.ts`)
- **Social / Friends** — home only (`lib/social-ui.ts`, mock data in `data/social.ts`)
- **Avatar editor** — accordion UI (`lib/avatar-editor-ui.ts`)

---

## Source layout

```
web/src/
├── main.ts              # ~1.6k lines — routing, render, events, map/pano lifecycle
├── types.ts             # AppState, Round, GameSession, …
├── styles.css           # Design tokens + all screen styles
├── data/
│   ├── panoramas.ts     # 29 scene catalog
│   ├── rounds.ts        # Round picker + mode filtering
│   ├── lpc-catalog.ts   # Avatar config + LPC file map
│   ├── inventory.ts     # Items + slot grid
│   ├── social.ts        # Mock friends, chat, requests
│   └── landmarks.ts     # Binocular hint places
└── lib/
    ├── geo.ts           # Haversine, scoring, hearts UI
    ├── profile.ts       # Player profile (localStorage)
    ├── stats.ts         # Aggregate stats by region
    ├── scoreboard.ts    # High score list
    ├── library.ts       # Hidden panorama IDs
    ├── avatar-compose.ts / avatar-animate.ts / avatar-editor-ui.ts
    ├── inventory-ui.ts / inventory-hints.ts
    └── social-ui.ts

web/public/
├── panoramas/           # 29 JPG equirectangular (see LICENSE.md)
└── avatar/lpc/          # LPC walk sprite sheets (see LICENSE.md)
```

---

## localStorage keys

| Key | Module | Content |
|---|---|---|
| `chronopin-profile` | `profile.ts` | `{ name, avatarConfig, createdAt }` |
| `chronopin-scoreboard` | `scoreboard.ts` | Array of score entries |
| `chronopin-player-stats` | `stats.ts` | Games/rounds/regions aggregate |
| `chronopin-hidden-panos` | `library.ts` | Hidden panorama IDs |
| `chronopin-social` | `social.ts` | Friend IDs, pending requests |
| `chronopin-social-messages` | `social.ts` | Chat messages per friend |

No schema versioning yet — breaking changes require manual clear or migration helpers.

---

## Avatar system

- Config: `AvatarConfig` in `lpc-catalog.ts` (`body`, `skin`, `hair`, `topColor` as hex, …)
- Compositor draws LPC walk frames (south-facing row) onto canvas
- **Idle** animation: menu / editor (`avatar-idle` class)
- **Walk** animation: in-game avatar button (`avatar-walk` class)
- Male + female body/head/torso/legs/feet sheets in `public/avatar/lpc/`

---

## Inventory (in-game)

| Item | ID | Status |
|---|---|---|
| Binoculars | `binoculars` | Usable — landmark hint |
| North Star | `star` | Usable — country/region hint |
| Compass | `compass` | Locked (Soon) |
| Pocket map | `map` | Locked (Soon) |
| Time shard | `hourglass` | Locked (Soon) |

One use per item per round. Hints via `inventory-hints.ts` + `landmarks.ts`.

---

## Social (mock)

- Demo friend **Max Mustermann** — online/offline toggles every ~40s
- Pending request **Lena Vogt** — accept/decline (accept bug: does not add to friend list yet)
- Chat persisted in `chronopin-social-messages`
- Firebase planned for real sync

---

## Known bugs & tech debt

| Priority | Issue |
|---|---|
| High | MapLibre not destroyed on guess → explore (`back-explore`) |
| High | Pannellum not destroyed on explore → guess |
| Medium | `acceptFriendRequest` does not register new friends |
| Medium | UI English + `de-DE` numbers + `lang="de"` mismatch |
| Medium | `localStorage.setItem` without try/catch |
| Low | MapLibre bundled on all screens (~890 KB JS) |
| Low | Avatar RAF loops run while visible (no reduced-motion guard) |
| Low | Native `alert()` / `confirm()` for destructive actions |

See also review notes in root [`README.md`](../README.md#bekannte-lücken--bugs-noch-offen).

---

## Adding a panorama

1. Add CC-licensed equirectangular JPG to `web/public/panoramas/`
2. Entry in `web/src/data/panoramas.ts` (`id`, `lat`, `lng`, `modes`, attribution)
3. Row in `web/public/panoramas/LICENSE.md`
4. Optional: `isNew: true` for library badge

---

## Build

```bash
cd web
npm run build    # tsc + vite → web/dist/
npm run preview  # serve production build
```

Do not commit `web/dist/` or `node_modules/` (see `web/.gitignore`).
