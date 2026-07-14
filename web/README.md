# ChronoPin — Web Prototype

Minimal playable web prototype for testing the core loop before Expo/React Native.

**Roadmap & recent features:** see the top section in the [root README](../README.md#zuletzt-umgesetzt--roadmap-schnell-nachschlagen).

## Run locally

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173 (also works on phone via network URL from Vite).

## Gameplay

- **3 hearts** per run — lose one if you're >1,500 km off or year off by >80 years
- **Multiple rounds** until hearts run out
- **Score** accumulates each round (distance + year accuracy)
- **Game Over** screen when hearts reach zero
- **Inventory** (explore/guess): binoculars, North Star — 1× per item per round
- **Pixel avatar** editor (preset colors + custom picker) + animated avatar in menu & game
- **ChronoSwitch** logo on home · **Attributes / Credits** footer chip (LPC attribution)

## Panorama Library

Home → **Panorama Library** — browse all scenes, preview in 360°, remove scenes locally (localStorage). **Restore hidden** brings them back. New imports show a **new** badge.

## Test scenes (29 locations)

Europe + worldwide (Tokyo, São Paulo, Cape Town, Mexico, …) — see [`public/panoramas/LICENSE.md`](./public/panoramas/LICENSE.md).

## Stack

- Vite + TypeScript
- Pannellum (360 viewer, CDN)
- MapLibre GL JS + OpenFreeMap
- Universal LPC avatars (bundled subset)

See [`../docs/TECH_AND_RIGHTS.md`](../docs/TECH_AND_RIGHTS.md) for licensing notes.
