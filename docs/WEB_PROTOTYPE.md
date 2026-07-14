# ChronoPin — Web Prototype (technical)

Playable browser prototype under [`web/`](../web/). Validates core loop, Firebase multiplayer, progression meta, and deploy path before Expo/React Native.

**Run:** `cd web && npm install && npm run dev` → **http://localhost:5173**

**Product & roadmap:** [`README.md`](../README.md)  
**Strato deploy:** [`STRATO_DEPLOY.md`](./STRATO_DEPLOY.md)  
**Licensing:** [`TECH_AND_RIGHTS.md`](./TECH_AND_RIGHTS.md)

---

## Firebase

**Project:** `chronopin-2bdce` · config via `web/.env` (`VITE_FIREBASE_*`).

| Collection | Purpose | Sync |
|---|---|---|
| `users/{uid}` | Profile (name, avatar, searchName, admin bonuses) | Boot + profile save |
| `loginNames/{searchName}` | Unique display name → uid | Login + profile save |
| `friendRequests/{id}` | Pending friend requests | Social sync |
| `friendships/{id}` | Accepted pairs (userA, userB) | On accept |
| `coopRooms/{roomId}` | Full `CoopRoom` document | Patch writes + `onSnapshot` |
| `coopRooms/{roomId}/messages/{id}` | In-match chat | Realtime listener |
| `coopInvites/{inviteId}` | Co-op game invites | Create/update + incoming listener |
| `scoreboard/{searchName_mode}` | Global best scores per player/mode | On run end |
| `panoramaRatings/{panoId}` | Shared difficulty rating (1–3★) per library scene | On rate + library open + login |

**Auth:** Anonymous sign-in at bootstrap. `playerId` = Firebase `uid`.

**Deploy:** [`firestore.rules`](../firestore.rules) + [`firestore.indexes.json`](../firestore.indexes.json) via `firebase deploy --only firestore`.

Without `.env`, app runs **offline** using `localStorage` only (demo friends, local co-op, no cloud scoreboard).

---

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 6 + TypeScript (strict) |
| 360° viewer | [Pannellum](https://pannellum.org/) (CDN) for static JPGs · [MapillaryJS](https://mapillary.github.io/mapillary-js/) for live API streams |
| Guess map | MapLibre GL JS + [OpenFreeMap](https://openfreemap.org/) |
| UI | Vanilla TS + `styles.css` |
| Persistence | `localStorage` + Firebase Auth/Firestore |
| Avatars | Universal LPC sprite subset (canvas compositor) |
| Dialogs | In-app confirm/alert (`lib/dialog-ui.ts`) |
| Progression | Local XP/level (`lib/progression.ts`) |

---

## Game flow

### Login

```
(first visit) onboarding (name) → home
(return visit with profile) home
(factory reset) onboarding
```

Name login: `lib/login.ts` — creates or restores player via `loginNames` + `users`. Profile saves locally first; cloud sync runs in the background (no UI hang on slow Firebase).

### Solo

```
home → [round intro overlay] → explore → guess → result (+ XP banner) → (next round | gameover)
```

Each new round shows a **round intro overlay** (~2.8 s or tap to dismiss) before the panorama loads.

### Daily

```
home → daily card → [round intro] → explore → guess → result → reward wheel → stash
```

Daily rounds award bonus XP (+40 on top of round XP).

### Co-op Decide (Firebase)

```
home → pick friend → coop setup → invite
  → guest accept (home banner)
  → host start (home banner)
  → [round intro] → explore → guess (hidden pin) → coop-wait → coop-reveal → coop-vote → coop-result (+ XP)
```

Match chat available on all co-op screens (`lib/match-chat-ui.ts`).

**Vote flow (v2):** Each player picks host pin / guest pin / midpoint as a **preference** (`setCoopVotePreference`). Both see the partner's pick live. When both agree, **Submit team guess** (`confirmCoopTeamVote`) locks the final pin. Preferences can be changed until submit.

---

## Progression (XP & level)

Local-only meta — stored in `chronopin-progression` (`xp`, `lifetimeXp`). Not synced to Firestore yet.

| Source | XP (approx.) |
|---|---|
| Round result | 12–100 by accuracy ratio |
| Heart kept | +20 bonus |
| Daily round | +40 bonus |
| Run won | 60 + 8 × rounds played |
| Run lost | 15 + 3 × rounds played |
| Co-op result | 20–100 by team score ratio |

**Levels:** Threshold table up to Lv 10, then +600 XP per level. Titles: Rookie → Explorer → Scout → Pathfinder → … → Chrono Master.

**UI:**
- Compact **Lv N** badge on home player chip
- **Level & XP** panel in Player info (bar, title, perk placeholders)
- **+XP banner** on result / game over / co-op result; highlights level-up

**Perks:** `getLevelPerks()` returns placeholder unlocks (extra heart, avatar items, daily boost) — mechanics not wired yet.

**Module:** `web/src/lib/progression.ts` · overlay: `web/src/lib/round-intro-ui.ts`

---

## Screens

| Screen | Notes |
|---|---|
| Onboarding / Login | Name entry only (`renderOnboarding`) |
| Home | Solo/Multi tabs, daily, social, co-op banners, level badge on player chip |
| Explore / Guess | Solo or co-op (`isCoopRun`); round intro overlay on explore |
| Result / Game over | XP gain banner |
| Co-op Wait / Reveal / Vote / Result | Multiplayer phases; live polling on wait/reveal/vote |
| Library / Library View / Library Map | Trash excluded from map pins; **accordion groups** by source tag (wikimedia / panoramax / mapillary / kartaview) |
| Player Info | Stats, avatar edit, stash, **Level & XP**, **Factory Reset** |

**Overlays:** Social, Co-op setup, Credits, Classic region, Daily wheel, Inventory (solo), Match chat (co-op), Admin (⚙), Round intro, **Mapillary Live settings**.

---

## Panorama library

**Static catalog:** `data/panoramas.ts` — **83** equirectangular JPGs in `public/panoramas/` (Wikimedia, Panoramax, KartaView).

**Mapillary Live (optional):** When `VITE_MAPILLARY_ACCESS_TOKEN` is set and library toggle is ON, **61** virtual entries are merged from `data/mapillary-live-spots.ts`. Each resolves a nearby 360° image via Mapillary Graph API; thumbnails cached in `localStorage`. Preview uses MapillaryJS, not Pannellum.

**UI grouping:** `lib/library.ts` → `groupVisiblePanoramasBySource()` renders collapsible sections. Expand state: `chronopin-library-groups`.

**Difficulty ratings:** `lib/pano-ratings.ts` + `lib/firebase-pano-ratings.ts` — 1–3★ per `panoId`; sync on login and library open.

**Import pipeline:** `scripts/import-external-panos.mjs` — Panoramax / Mapillary JPG / KartaView; `--merge` appends to `panoramas.ts`; `--only city1,city2` filters seeds.

**Modules:** `lib/mapillary-api.ts`, `lib/mapillary-viewer.ts`, `lib/mapillary-live-catalog.ts`, `lib/mapillary-live-ui.ts`

---

## Source layout (key files)

```
web/src/
├── main.ts                    # App shell, routing, XP awards, round intro lifecycle
├── types.ts
├── data/
│   ├── coop.ts                # Rooms, phases, vote prefs, abandonCoopGame
│   ├── match-chat.ts, social.ts, user-directory.ts
│   ├── avatar-credits.ts      # Attribution strings for credits overlay
│   └── rounds.ts, lpc-catalog.ts
├── lib/
│   ├── login.ts, app-reset.ts
│   ├── progression.ts         # XP, levels, badges, perk placeholders
│   ├── round-intro-ui.ts      # Animated round-start overlay
│   ├── credits-ui.ts          # Attributes / Credits overlay
│   ├── admin.ts, admin-ui.ts, firebase-admin.ts
│   ├── firebase.ts, firebase-auth.ts, firebase-profile.ts
│   ├── firebase-friends.ts, firebase-coop.ts, firebase-social.ts
│   ├── firebase-match-chat.ts, firebase-scoreboard.ts, firebase-pano-ratings.ts
│   ├── mapillary-api.ts, mapillary-viewer.ts, mapillary-live-catalog.ts, mapillary-live-ui.ts
│   ├── coop-ui.ts, match-chat-ui.ts, social-ui.ts
│   ├── avatar-compose.ts, avatar-editor-ui.ts
│   ├── daily.ts, library.ts, profile.ts, scoreboard.ts, stats.ts, …
│   └── dialog-ui.ts, asset-url.ts, storage.ts
web/public/.htaccess           # SPA rewrite (Strato, RewriteBase /Chrono/)
web/scripts/
├── deploy-strato.sh
├── import-external-panos.mjs
└── coop-multiplayer-e2e.mjs   # Playwright 2-player smoke test
```

---

## localStorage keys

| Key | Content |
|---|---|
| `chronopin-profile` | Player profile |
| `chronopin-progression` | XP + lifetime XP |
| `chronopin-social` | Friend ids, request ids |
| `chronopin-social-messages` | Friend chat (local only) |
| `chronopin-match-chat` | Match chat cache |
| `chronopin-coop-rooms` / `coop-invites` / `coop-active` | Co-op state |
| `chronopin-trashed-panos` / `seen-panos` | Library |
| `chronopin-library-groups` | Accordion expand state per source tag |
| `chronopin-pano-ratings` | Panorama difficulty cache (1–3★); synced to Firestore `panoramaRatings` when signed in |
| `chronopin-mapillary-live-cache` | Resolved Mapillary image IDs + thumbs per city seed |
| `chronopin-mapillary-live-prefs` | Mapillary Live library/gameplay toggles |
| `chronopin-mapillary-live-recent` | Recently used Mapillary image IDs (avoid repeats) |
| `chronopin-daily` / `chronopin-stash` | Daily rewards |
| `chronopin-scoreboard` / `player-stats` | Solo meta |

Factory reset (`app-reset.ts`) removes **all** keys with prefix `chronopin-` (including progression).

Writes use `safeStorageSet()` — fails silently on quota/private mode.

---

## Co-op phases

| Phase | Meaning |
|---|---|
| `invite_pending` | Waiting for guest accept |
| `explore` | Pinning phase |
| `host_pinned` | Async: guest's turn |
| `reveal` | Both pins visible |
| `vote` | Team picks final pin (preference + confirm) |
| `result` | Score shown |
| `done` | Room closed — partner syncs out of active game |

**Firestore sync:**
- **Patch-only writes** (`patchCoopRoomInFirestore`) — never null out partner pin/vote on merge
- **Pin sanitize** — `year` omitted for Classic (undefined rejected by Firestore)
- **Live polling** on wait / reveal / vote screens when partner is slow

**Quit / delete:**
- `leaveCoopRunLocally()` — exit UI without closing room for partner
- `abandonCoopGame()` — delete active game (Games tab ✕ or wait screen); sets room `phase: 'done'` for partner
- `finishCoopRoom()` — after result screen when match is fully done

**Offline demo:** `simulatePartnerPin/Vote()` visible only when Firebase is not configured.

---

## Admin panel

Players named **Admin**, **Dary**, or **Daryoush** get ⚙ on Home → search cloud players, grant stash items / bonus hearts, delete accounts. Requires `isAdminUser()` in deployed Firestore rules.

---

## Known limitations (v1)

| Area | Status |
|---|---|
| 1v1 Duel / Battle Royale | UI only |
| Friend DMs | localStorage only (no Firestore friend chat) |
| XP / level cloud sync | Local only |
| Level perks | Placeholder text only — no gameplay effect yet |
| Pano/map loading UI | None (blank until loaded) |
| Mapillary Live | Requires client token; API rate/coverage varies by city; verify Mapillary ToS for commercial game |
| Bundle size | ~1.7 MB JS + MapillaryJS chunk when live viewer loads |

---

## Build & deploy

```bash
cd web
npm run build          # default base /
npm run build:strato   # base /Chrono/ (web/.env.production)
```

Upload `web/dist/` to static host. See [`STRATO_DEPLOY.md`](./STRATO_DEPLOY.md).

**E2E (Co-op smoke test):**

```bash
cd web
node scripts/coop-multiplayer-e2e.mjs                              # live
node scripts/coop-multiplayer-e2e.mjs http://127.0.0.1:4173/Chrono/ # local preview
```

Do not commit `web/dist/`, `node_modules/`, or `web/.env`.
