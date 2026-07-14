# ChronoPin — Web Prototype (technical)

Playable browser prototype under [`web/`](../web/). Validates core loop + Firebase multiplayer before Expo/React Native.

**Run:** `cd web && npm install && npm run dev` → **http://localhost:5173**

**Product & roadmap:** [`README.md`](../README.md)  
**Strato deploy:** [`STRATO_DEPLOY.md`](./STRATO_DEPLOY.md)  
**Licensing:** [`TECH_AND_RIGHTS.md`](./TECH_AND_RIGHTS.md)

---

## Firebase

**Project:** `chronopin-2bdce` · config via `web/.env` (`VITE_FIREBASE_*`).

| Collection | Purpose | Sync |
|---|---|---|
| `users/{uid}` | Profile (name, avatar, searchName) | Boot + profile save |
| `loginNames/{searchName}` | Unique display name → uid | Login + profile save |
| `friendRequests/{id}` | Pending friend requests | Social sync |
| `friendships/{id}` | Accepted pairs (userA, userB) | On accept |
| `coopRooms/{roomId}` | Full `CoopRoom` document | Every update + `onSnapshot` |
| `coopRooms/{roomId}/messages/{id}` | In-match chat | Realtime listener |
| `coopInvites/{inviteId}` | Co-op game invites | Create/update + incoming listener |

**Auth:** Anonymous sign-in at bootstrap. `playerId` = Firebase `uid`.

**Deploy:** [`firestore.rules`](../firestore.rules) + [`firestore.indexes.json`](../firestore.indexes.json) via `firebase deploy --only firestore`.

Without `.env`, app runs **offline** using `localStorage` only.

---

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 6 + TypeScript (strict) |
| 360° viewer | [Pannellum](https://pannellum.org/) (CDN) |
| Guess map | MapLibre GL JS + [OpenFreeMap](https://openfreemap.org/) |
| UI | Vanilla TS + `styles.css` |
| Persistence | `localStorage` + Firebase Auth/Firestore |
| Avatars | Universal LPC sprite subset (canvas compositor) |
| Dialogs | In-app confirm/alert (`lib/dialog-ui.ts`) |

---

## Game flow

### Login

```
(first visit) onboarding (name) → home
(return visit with profile) home
(factory reset) onboarding
```

Name login: `lib/login.ts` — creates or restores player via `loginNames` + `users`.

### Solo

```
home → explore → guess → result → (next round | gameover)
```

### Daily

```
home → daily card → explore → guess → result → reward wheel → stash
```

### Co-op Decide (Firebase)

```
home → pick friend → coop setup → invite
  → guest accept (home banner)
  → host start (home banner)
  → explore → guess (hidden pin) → coop-wait → coop-reveal → coop-vote → coop-result
```

Match chat available on all co-op screens (`lib/match-chat-ui.ts`).

---

## Screens

| Screen | Notes |
|---|---|
| Onboarding / Login | Name entry only (`renderOnboarding`) |
| Home | Solo/Multi tabs, daily, social, co-op banners |
| Explore / Guess | Solo or co-op (`isCoopRun`) |
| Co-op Wait / Reveal / Vote / Result | Multiplayer phases |
| Library / Library View / Library Map | Trash excluded from map pins |
| Player Info | Stats, avatar edit, stash, **Factory Reset** |

**Overlays:** Social, Co-op setup, Credits, Classic region, Daily wheel, Inventory (solo), Match chat (co-op).

---

## Source layout (key files)

```
web/src/
├── main.ts
├── data/coop.ts, match-chat.ts, social.ts, user-directory.ts
├── lib/
│   ├── login.ts, app-reset.ts
│   ├── firebase.ts, firebase-auth.ts, firebase-profile.ts
│   ├── firebase-friends.ts, firebase-coop.ts, firebase-social.ts
│   ├── firebase-match-chat.ts
│   ├── coop-ui.ts, match-chat-ui.ts, social-ui.ts
│   └── daily.ts, library.ts, profile.ts, …
web/public/.htaccess          # SPA rewrite (Strato)
web/scripts/import-external-panos.mjs
```

---

## localStorage keys

| Key | Content |
|---|---|
| `chronopin-profile` | Player profile |
| `chronopin-social` | Friend ids, request ids |
| `chronopin-social-messages` | Friend chat (local) |
| `chronopin-match-chat` | Match chat cache |
| `chronopin-coop-rooms` / `coop-invites` / `coop-active` | Co-op state |
| `chronopin-trashed-panos` / `seen-panos` | Library |
| `chronopin-daily` / `chronopin-stash` | Daily rewards |
| `chronopin-scoreboard` / `player-stats` | Solo meta |

Writes use `safeStorageSet()` — fails silently on quota/private mode.

---

## Co-op phases

| Phase | Meaning |
|---|---|
| `invite_pending` | Waiting for guest accept |
| `explore` | Pinning phase |
| `host_pinned` | Async: guest's turn |
| `reveal` | Both pins visible |
| `vote` | Team picks final pin |
| `result` | Score shown |
| `done` | Room closed |

**Quit behaviour:** `leaveCoopRunLocally()` on exit mid-game — does not set `done` for partner. `finishCoopRoom()` only after result screen.

**Offline demo:** `simulatePartnerPin/Vote()` visible only when Firebase is not configured.

---

## Known limitations (v1)

| Area | Status |
|---|---|
| 1v1 Duel / Battle Royale | UI only |
| Friend DMs | localStorage only |
| Scoreboard cloud sync | Not implemented |
| Pano/map loading UI | None (blank until loaded) |
| Bundle size | ~1.6 MB JS (MapLibre eager load) |

---

## Build & deploy

```bash
cd web
npm run build          # default base /
npm run build:strato   # base /app/Chrono/
```

Upload `web/dist/` to static host. See [`STRATO_DEPLOY.md`](./STRATO_DEPLOY.md).

Do not commit `web/dist/`, `node_modules/`, or `web/.env`.
