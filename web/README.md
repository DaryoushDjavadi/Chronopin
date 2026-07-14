# ChronoPin — Web Prototype

Playable browser prototype for the core geotime guessing loop (Solo + Co-op multiplayer). Mobile-first, deployable to static hosting or Firebase.

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
npm run build:strato   # build for /app/Chrono/ subpath (Strato)
npm run preview        # serve dist/ locally
```

## First launch

1. **Login screen** — enter your name (max 20 chars)
2. New name → new player · existing name → welcome back (Firebase `loginNames`)
3. Avatar & name editable later under **Player info**

Without Firebase (no `.env`), everything runs offline in `localStorage`.

## Solo gameplay

- **3 hearts** per run — lose one if >1,500 km off or year off by >80 years
- Modes: **Classic** (region filter), **Past**, **Future**
- **Daily ChronoPin** — one round per UTC day + reward wheel → stash
- **Inventory:** binoculars, North Star (1× per item per round)
- **Scoreboard** & **Player stats** (local)

## Multiplayer — Co-op Decide ✅

Home → **Multiplayer** → pick a friend → **Co-op Decide**

| Mode | Behaviour |
|---|---|
| **Live** | Both pin blind; reveal when both pins are in |
| **Async** | Host pins first; guest pins later |

**Flow:** invite → accept → explore → hidden pin → reveal → team vote → result

**With Firebase (2 devices):**

1. Both open the same URL and log in with different names
2. 👥 **Friends** → search by name → send/accept request
3. Multiplayer → choose friend → Co-op Decide → send invite
4. Guest: home banner **Accept & play**
5. Host: home banner **Start game**
6. 💬 **Match chat** during the game (pop-up toasts + chat panel)

**1v1 Duel** and **Battle Royale** are UI previews only (coming soon).

## Social & Friends

| Feature | Status |
|---|---|
| Search players by name (Firebase) | ✅ |
| Friend requests send/accept/decline | ✅ |
| Friend list + profile stats | ✅ |
| Chat per friend (local) | ✅ |
| Match chat during Co-op (Firestore sync) | ✅ |
| Cloud DM sync | 🔜 |

Demo offline users (Max, Lena, Kai, Sam, Yuki) still work without Firebase.

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

4. **Authorized domains** — add your production domain

| Firestore collection | Purpose |
|---|---|
| `users/{uid}` | Profile, avatar, searchName |
| `loginNames/{searchName}` | Unique display names → uid |
| `friendRequests`, `friendships` | Social graph |
| `coopRooms/{roomId}` | Live co-op state |
| `coopRooms/{roomId}/messages` | In-match chat |
| `coopInvites/{id}` | Pending game invites |

Modules: `src/lib/firebase*.ts`, `src/lib/login.ts`

## Deploy

| Target | Command / doc |
|---|---|
| **Strato webspace** | `npm run build:strato` → upload `dist/` — see [`../docs/STRATO_DEPLOY.md`](../docs/STRATO_DEPLOY.md) |
| **Firebase Hosting** | `npm run build && firebase deploy --only hosting` |

## Key source files

```
src/
├── main.ts                 # App shell, routing, lifecycle
├── data/coop.ts            # Co-op rooms & phases
├── data/match-chat.ts      # In-match messages
├── data/social.ts          # Friends & local chat
├── lib/login.ts            # Name login / registration
├── lib/coop-ui.ts          # Co-op + multiplayer UI
├── lib/match-chat-ui.ts    # Match chat overlay & toasts
├── lib/firebase-*.ts       # Auth, profile, friends, coop sync
└── lib/app-reset.ts        # Factory reset (Player info)
```

Full architecture: [`../docs/WEB_PROTOTYPE.md`](../docs/WEB_PROTOTYPE.md)

## Stack

- Vite 6 + TypeScript
- Pannellum (360°, CDN) · MapLibre + OpenFreeMap
- Universal LPC avatars (canvas compositor)
- Firebase Auth (anonymous) + Firestore when configured
- Persistence: `localStorage` + cloud sync

Licensing: [`../docs/TECH_AND_RIGHTS.md`](../docs/TECH_AND_RIGHTS.md)
