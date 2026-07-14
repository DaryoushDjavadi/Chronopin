# ChronoPin — Web Prototype

Minimal playable web prototype for testing the core loop before Expo/React Native.

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

## Panorama Library

Home → **Panorama Library** — browse all test scenes like a file list, preview in 360°, remove scenes you don't like (hidden locally via localStorage; repo files unchanged). **Restore hidden** brings them back.

## Test scenes (11 locations)

Berlin (6), Paris, Vienna (2), Wiesbaden, Ellmau/Austria — see [`public/panoramas/LICENSE.md`](./public/panoramas/LICENSE.md).

## Stack

- Vite + TypeScript
- Pannellum (360 viewer, CDN)
- MapLibre GL JS + OpenFreeMap

See [`../docs/TECH_AND_RIGHTS.md`](../docs/TECH_AND_RIGHTS.md) for licensing notes.
