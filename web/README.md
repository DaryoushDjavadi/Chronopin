# ChronoPin — Web Prototype

Playable browser prototype for the core geotime guessing loop (Solo + Co-op multiplayer). Mobile-first, deployable to static hosting or Firebase.

**Live demo:** https://media-acht.de/Chrono/  
**Roadmap & product context:** [root README](../README.md)

## Quick start

```bash
cd web
npm install
cp .env.example .env   # optional — fill VITE_FIREBASE_* for online play
npm run dev
```

Open **http://localhost:5173** (fixed port via `strictPort`).

```bash
npm run build          # production build → dist/
npm run build:strato   # build for /Chrono/ subpath (Strato)
npm run preview        # serve dist/ locally
```

## First launch

1. **Login screen** — enter your name (max 20 chars)
2. New name → new player · existing name → welcome back (Firebase `loginNames`)
3. Same name on a **new device** reclaims your cloud profile automatically
4. **Instant login:** profile saves locally first — the home screen appears immediately; cloud sync runs in the background
5. Avatar & name editable later under **Player info**
6. If Firebase is slow or unavailable, you still get in (offline mode with optional notice)

Without Firebase (no `.env`), everything runs offline in `localStorage`.

## Solo gameplay

- **3 hearts** per run — lose one if >1,500 km off or year off by >80 years
- Modes: **Classic** (region filter), **Past**, **Future**
- **Daily ChronoPin** — one round per UTC day + reward wheel → stash
- **Inventory:** binoculars, North Star (1× per item per round)
- **Scoreboard** (local + Firestore sync when online)
- **Player stats** (local)

## Multiplayer — Co-op Decide ✅

Home → **Multiplayer** → pick a friend → **Co-op Decide**

| Mode | Behaviour |
|---|---|
| **Live** | Both pin blind; reveal when both pins are in |
| **Async** | Host pins first; guest pins later |

**Flow:** invite → accept → explore → hidden pin → reveal → team vote → result

**Delete game:** Friends → **Games** tab (✕ on active session) or **Delete game** on the co-op wait screen.

**With Firebase (2 devices):**

1. Both open the same URL and log in with different names
2. 👥 **Friends** → search by name → send/accept request
3. Multiplayer → choose friend → Co-op Decide → send invite
4. Guest: home banner **Accept & play**
5. Host: home banner **Start game**
6. 💬 **Match chat** during the game (pop-up toasts + chat panel)

**1v1 Duel** and **Battle Royale** are UI previews only (coming soon).

### Multiplayer E2E test (Playwright)

Automated smoke test with **two browser contexts** (simulates two players):

```bash
cd web
npm install
node scripts/coop-multiplayer-e2e.mjs                    # live: media-acht.de/Chrono/
node scripts/coop-multiplayer-e2e.mjs http://127.0.0.1:4173/Chrono/   # after npm run preview
```

Covers: login → friend request → co-op invite → both pin → reveal screen on both sides.

## Social & Friends

| Feature | Status |
|---|---|
| Search players by name (Firebase) | ✅ |
| Deduped results, exclude self | ✅ |
| Friend requests send/accept/decline | ✅ |
| Friend list + profile stats | ✅ |
| Chat per friend (local) | ✅ |
| Match chat during Co-op (Firestore sync) | ✅ |
| Delete active co-op game (Games tab / wait screen) | ✅ |
| Cloud DM sync | 🔜 |

Demo offline users (Max, Lena, Kai, Sam, Yuki) still work without Firebase.

## Admin panel

Players named **Admin**, **Dary**, or **Daryoush** see a ⚙ button on Home:

- Search cloud players
- Grant stash items or bonus hearts for next run
- Delete player accounts (loginNames + profile + scoreboard)

Requires deployed Firestore rules with `isAdminUser()`.

## Panorama Library

- Browse **44 scenes** (Wikimedia + Panoramax), 360° preview
- **Trash** — hidden from gameplay and world map
- **🌍 World map** — active scenes only (trash excluded)

```bash
npm run import:panos -- --source panoramax
npm run import:panos -- --source mapillary   # needs MAPILLARY_ACCESS_TOKEN
```

## Firebase setup (`chronopin-2bdce`)

Copy [`.env.example`](./.env.example) → `.env` and fill `VITE_FIREBASE_*` from Firebase Console.

**Console (once):**

1. Authentication → **Anonymous** enabled
2. Firestore → create database
3. Deploy rules + indexes from repo root:

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest deploy --only firestore
```

4. **Authorized domains** — add `media-acht.de`

| Firestore collection | Purpose |
|---|---|
| `users/{uid}` | Profile, avatar, searchName, admin bonuses |
| `loginNames/{searchName}` | Unique display names → uid |
| `friendRequests`, `friendships` | Social graph |
| `coopRooms/{roomId}` | Live co-op state |
| `coopRooms/{roomId}/messages` | In-match chat |
| `coopInvites/{id}` | Pending game invites |
| `scoreboard/{searchName_mode}` | Global best scores |

Modules: `src/lib/firebase*.ts`, `src/lib/login.ts`, `src/lib/admin*.ts`

## Deploy

| Target | Command / doc |
|---|---|
| **Strato webspace** | `npm run build:strato` → `./scripts/deploy-strato.sh` — see [`../docs/STRATO_DEPLOY.md`](../docs/STRATO_DEPLOY.md) |
| **Firebase Hosting** | `npm run build && firebase deploy --only hosting` |

## Key source files

```
src/
├── main.ts                 # App shell, routing, lifecycle
├── data/coop.ts            # Co-op rooms & phases
├── data/match-chat.ts      # In-match messages
├── data/social.ts          # Friends & local chat
├── lib/login.ts            # Name login / registration / reclaim
├── lib/admin.ts            # Admin name check
├── lib/admin-ui.ts         # Admin overlay
├── lib/firebase-admin.ts   # Admin cloud actions
├── lib/coop-ui.ts          # Co-op + multiplayer UI
├── lib/match-chat-ui.ts    # Match chat overlay & toasts
├── lib/firebase-*.ts       # Auth, profile, friends, coop sync
└── lib/app-reset.ts        # Factory reset (Player info)

scripts/
└── coop-multiplayer-e2e.mjs   # Playwright 2-player co-op smoke test
```

Full architecture: [`../docs/WEB_PROTOTYPE.md`](../docs/WEB_PROTOTYPE.md)

## Stack

- Vite 6 + TypeScript
- Pannellum (360°, CDN) · MapLibre + OpenFreeMap
- Universal LPC avatars (canvas compositor)
- Firebase Auth (anonymous) + Firestore when configured
- Persistence: `localStorage` + cloud sync

Licensing: [`../docs/TECH_AND_RIGHTS.md`](../docs/TECH_AND_RIGHTS.md)
