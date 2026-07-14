# ChronoPin

> **Working title.** Mobile geotime guessing game — like GeoGuessr, but across **now**, **the past**, and **the future**.

Guess **where** you are. In time modes, also guess **when**.

**Status:** Expo / React Native **boilerplate only**. Features below are the product plan — not shipped yet.

**Repo:** https://github.com/DaryoushDjavadi/Chronopin  
**Owner:** Daryoush Djavadi · commercial goal ~€1–2 one-time purchase (cover Apple/Google developer fees, not get rich)

---

## For Cursor / AI agents — read this first

If you land in a **new chat** on this repo, treat the following as source of truth. Do **not** ask the user to re-explain the project unless something below is ambiguous.

### What we are building
- A **phone app** (Expo) inspired by the *genre* of GeoGuessr / WenWare — **not a 1:1 clone**, own brand & UX.
- Three content modes:
  1. **Classic** — present-day location guessing (real imagery we have rights to)
  2. **Past** — AI-generated historical scenes; guess **place + year**
  3. **Future** — AI speculative scenes; guess **place + year** (fun, clearly labeled fiction)
- Social multiplayer is a core USP:
  - **Co-op Decide** — both players blind-pin the same scene, reveal, discuss, must agree on **one** final pin (team score)
  - **1v1 Duel** — same scene, closest wins
  - **Battle Royale / elimination** — later (4–8 players), not V1

### Commercial / rights constraints (non-negotiable)
- App will be **sold**; we need assets we are allowed to use commercially.
- **Do not** build the core product on scraped / bulk Google Street View. GeoGuessr has a Google deal; we do not.
- Classic V1: **curated / owned / clearly licensed** static packs hosted by us. Optional later: Mapillary / Panoramax / KartaView if ToS fits.
- Past / Future: **offline AI generation pipeline** → QA → host on our CDN. Prefer API terms that allow commercial use of outputs. Label AI content in-app.
- Guess map: MapLibre + OSM / MapTiler / Mapbox — **not Google as default**.
- Details: [`docs/TECH_AND_RIGHTS.md`](./docs/TECH_AND_RIGHTS.md)

### V1 scope (keep small)
1. Solo Classic + tiny Past pack  
2. Then Co-op Decide (2 players, room code)  
3. Then 1v1  
4. Future pack · Daily  
5. Store ~€1.99  
6. BR much later  

**Content > features.** Prefer 80 good rounds over matching BR.

### Tech stack (intended)
- Expo + TypeScript (this repo)
- Multiplayer rooms later: Firebase or Supabase (sync pins/votes only; imagery from packs)
- No heavy Account/Voice/Matchmaking in V1

### How to work with the user
- User communicates mainly in **German**; code/comments/docs can stay English unless asked otherwise.
- Do not expand scope without asking.
- Prefer planning docs + small increments over big unimplemented frameworks.
- This project started in conversation while an agent was attached to another repo (`Sphere_Visualization`). **Chronopin is the real app repo** — keep work here.

### Open access note
Cloud Agents must be **started on this Chronopin repo** to push. An agent bound to another repo cannot write here even if Chronopin is public.

---

## Modes

### 1. Classic (today)
Normal GeoGuessr-style play.
- Real map / street imagery from the present (rights-safe sources only)
- Pin the location on the world map
- Score by distance

### 2. Past (AI history)
Time-travel GeoGuessr.
- AI-generated (or curated) historical scenes
- Guess **place + year / era**
- Clues from architecture, clothes, tech, landscape

### 3. Future (AI speculative)
Same loop, flipped forward — deliberately fun and weird.
- AI scenes of possible near- / far-futures
- Guess **place + year** (e.g. 2040, 2150…)
- Tone: speculative fiction, not "correct history"
- Scoring can reward plausible reasoning, not only exact coordinates

You can mix eras later (e.g. "Any era" playlist).

---

## How a round works

1. You get a scene (photo / 360 / AI panorama)
2. Look around, read the clues
3. Drop a pin on the map
4. In Past / Future: also set a year (slider or era chips)
5. Submit → see distance (and time error) + short context card

---

## Multiplayer (planned)

Social play is a core part of ChronoPin — not an afterthought. All multiplayer modes work with Classic, Past, and Future scenes.

### Co-op — Decide (highlight feature)
You and a friend see the **same** scene and solve it as a team.

1. **Blind pin** — each player drops their own pin (and year, in time modes) privately  
2. **Reveal** — both pins appear on the map  
3. **Discuss** — argue it out (Voice / text — V1: use system/Discord, no in-app voice)  
4. **Decide** — you must agree on **one** final pin (vote, or host lock if you disagree)  
5. **Score** — one shared team score

If you deadlock: host decides, or the midpoint of both pins is used after timeout.

Room code / invite link. Built for **2 players** first; expandable later.

### 1v1 PvP — Duel
Competitive head-to-head on the same scene.
- Same photo / panorama for both
- Each pins privately → reveal
- Closest guess wins the round (distance + year error in time modes)
- Best of 5 (or similar short match)
- Room code / invite — no big matchmaking needed for v1

### Later — Battle Royale / Elimination
Party mode once Co-op + Duel feel solid:
- 4–8 players, same scene each round
- Worst guess(es) eliminated (or lose a life)
- Last player standing wins
- Same room-code model; public matchmaking optional much later

---

## Why ChronoPin

| Vs classic GeoGuessr | Vs WenWare-style past-only |
|---|---|
| Adds **time** (past + future) | Adds **classic present-day** too |
| Co-op "pin, argue, decide" | Own brand & UX (not a clone) |
| 1v1 duel + later party BR | Mobile-first, short rounds |

---

## Platforms & monetization (planned)

- **iOS + Android** via Expo / React Native
- Target price around **€1–2** (one-time unlock) — cover store / Apple developer costs, not a big-business bet
- Free daily or sample rounds possible later

---

## Tech (early)

- Expo + TypeScript
- Online rooms later (e.g. Firebase) for co-op / duel
- Map provider: prefer OpenStreetMap / MapLibre / MapTiler / Mapbox — **not Google** as core
- Classic imagery: curated packs you own/license first; optional Mapillary / Panoramax later
- Past / Future: offline AI generation pipeline, assets hosted by us

**Deep dive (licensing, Street View alternatives, AI pipeline):** see [`docs/TECH_AND_RIGHTS.md`](./docs/TECH_AND_RIGHTS.md).

---

## Was wir noch bedenken müssen

Dinge, die man beim Bauen und Verkaufen leicht vergisst — bewusst breit, damit wir später nicht stolpern. Kein Replace für Anwalt/Steuerberater.

### Recht & Marke
- **Name „ChronoPin"**: Domain + App-Store-Namen prüfen (Marken, bestehende Apps). Working title früh finalisieren oder bewusst platzhalterig halten.
- **Keine Marken von GeoGuessr / WenWare / Google** in Text, Screenshots, ASO-Keywords missbrauchen.
- **Bildrechte dokumentieren** pro Asset (Quelle, Lizenz, Datum, Prompt/Modell bei AI) — Ordner `license_record`, nicht nur „irgendwie generiert".
- **Historische Orte / Traumata**: Kriege, Genozide, Katastrophen — Filter, sensibler Ton, oder bewusst auspacken + Kontextkarte. Sonst App-Store- und PR-Risiko.
- **AI-Szenen als solche kennzeichnen** („Rekonstruktion / spekulativ") — nicht als echte Archivfotos verkaufen.
- **DSGVO / Privacy Policy / Impressum** (besonders wenn du in DE/EU verkaufst): Pflichttexte in der App und auf einer einfachen Webseite.
- **Keine personenbezogenen Fotos** ungefragt (Gesichter in Street-Level — Blur-Regeln der Quelle einhalten).

### Stores & Geld
- **Apple Developer (~99€/Jahr)** + **Google Play** (einmalige Gebühr) — Break-even in die Kalkulation.
- **Store-Cut** (~15–30 %) vom €1,99-Preis einrechnen.
- **Steuern / VAT** auf digitale Güter in EU (Apple/Google übernehmen oft viel, aber nicht alles — je nach Setup prüfen).
- **Preispolitik**: einmalig vs. Free + IAP; was ist nach Kauf inklusive (nur aktuelle Packs? spätere Packs gratis?).
- **Refunds & Support-Kanal**: auch bei Mini-App eine Mail-Adresse; sonst 1-Stern wegen „App startet nicht".
- **Alterseinstufung** (IARC): Gewalt in historischen Szenen, AI-Gesichter, User-Chat — früher klären.
- **ASO / Screenshots**: echte Gameplay-Shots, keine fremden Street-View-Branding-Elemente.

### Produkt & Fairness
- **Scoring-Formel**: Distanz (km) + Jahresfehler — Gewichtung ausbalancieren, sonst ignoriert man eine Achse.
- **Cheat-Resistenz Multiplayer**: gleiche Seed-Runde für beide; keine Spoiler der Lösung vor Reveal; Server (oder host-authoritative) für finalen Score, nicht nur Client-Trust.
- **Disconnect / AFK / Rage-Quit** in Co-op & Duel klar regeln (sonst „kaputte" Rooms).
- **Daily Challenge**: Spoiler in Social Media (Wordle-Style Grid ohne Antwort); gleiche Puzzle weltweit pro Tag (Timezone-UTC festlegen).
- **Content nach Kauf**: Erwartung „Spiel fertig" vs. „leere Hülle + später Packs" — in Store-Text ehrlich.
- **Schwierigkeit**: Anfänger-Pack vs. Hardcore; Tutorial-Runde mit offensichtlichem Landmark.

### Technik & Betrieb
- **Datenvolumen**: 360°-Bilder fressen Mobile-Data — Kompression, Preview zuerst, Wi‑Fi-Hinweis.
- **Offline**: mind. Solo-Packs cachen; Multiplayer braucht Netz.
- **Backend-Kosten**: Firebase Free Tier reicht für kleine Rooms — Limits + Missbrauch (Room-Spam) bedenken.
- **Room-Codes**: Rate-Limits, Ablauf nach X Min, kein Brute-Force auf kurze Codes.
- **Push-Notifications**: nur mit Opt-in; Daily-Reminder nervt schnell.
- **Analytics**: so wenig wie möglich; Consent wenn nötig; keine heimliche Ortung über den Needed-Guess hinaus.
- **Crash-Reporting** (z.B. Sentry) — ohne PII in Logs (Koordinaten der Lösung nicht an Dritte leaken).
- **Backups** der Round-Manifests & AI-Prompts — Content ist das eigentliche IP.
- **Versionierung der Packs**: App alt, Content neu — kompatible Schema-Versionen.

### Multiplayer sozialer Kram
- **Kein eingebauter Voice zuerst** — System-Call / Discord reicht für V1 (weniger Moderation).
- Falls Text-Chat: Toxizität, Report-Button, Mute — oder gar keinen Chat.
- **Kinder**: ohne Chat und ohne Accounts einfacher; mit Chat steigen Pflichten stark.
- **Fairness bei Co-op Decide**: Host-Missbrauch (immer eigenen Pin erzwingen) — Vote zuerst, Host nur Tiebreak.

### AI-Content speziell
- **QA-Pipeline**: halluzinierte Landmarken, falsche Flaggen, anachronistische Autos — vor Publish checken.
- **Kosten deckeln**: Packs offline generieren, nicht live pro Match.
- **Modellwechsel**: neuer Image-Generator → Stil bricht; Packs nicht wild mischen ohne Hinweis.
- **Prompt-Injection / Missbrauch** wenn ihr jemals User-generierte Szenen erlaubt (V1: nicht tun).

### UX / Gerät
- **Hochkant-first**, Karte als Overlay; eine Hand bedienbar.
- **Farbenblindheit**: Pin-Farben nicht nur Rot/Grün.
- **Leistungsmodus**: schwache Android-Geräte — Stills vor vollen 360-Panos.
- **Nicht-Spieler in der Bahn**: kurze Runden (60–90s), klare Progress-Anzeige.

### Organisation (Solo-Dev)
- **Scope töten**: V1 = Solo Classic + kleines Past-Pack. Co-op danach. BR viel später.
- **Inhalt > Features**: 80 gute Runden schlagen 10 Features mit 5 schlechten Bildern.
- **Zeitfresser**: Account-System, Matchmaking, Voice, BR — alles bewusst verschieben.
- **Testflight / interne Tester** bevor €1,99 — Freunde + 1–2 fremde Personen.
- **Changelog & Store-Text** bei jedem Content-Drop pflegen.

### Checkliste vor Store-Submit
- [ ] Privacy Policy + Impressum verlinkt  
- [ ] Jedes Bild hat License-Record  
- [ ] AI-Inhalte gekennzeichnet  
- [ ] Keine Google-Street-View-Abhängigkeit im Kern  
- [ ] IAP/Preis getestet (Sandbox)  
- [ ] Co-op Disconnect getestet  
- [ ] Alterseinstufung gewählt  
- [ ] Support-Mail erreichbar  
- [ ] App-Name / Icon final und frei  

Mehr Detail zu Imagery-Lizenzen: [`docs/TECH_AND_RIGHTS.md`](./docs/TECH_AND_RIGHTS.md).

---

## Run the boilerplate

```bash
npm install
npx expo start
```
