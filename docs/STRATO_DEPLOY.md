# ChronoPin auf Strato deployen

Zielordner auf dem Server:

```
/STRATO-apps/wordpress_02/app/Chrono/
```

Öffentliche URL:

```
https://media-acht.de/Chrono/
```

## 1. Build

```bash
cd web
npm install
cp .env.example .env
# VITE_FIREBASE_* eintragen (für Online-Multiplayer)
npm run build:strato
```

Das erzeugt `web/dist/` mit Base-Pfad **`/Chrono/`** (`web/.env.production` → `VITE_BASE_PATH=/Chrono/`).

Lokal testen vor Upload:

```bash
npm run preview
# → http://127.0.0.1:4173/Chrono/
```

## 2. Upload

**Gesamten Inhalt** von `web/dist/` nach `app/Chrono/`:

```
app/Chrono/
  index.html
  .htaccess
  assets/
  panoramas/
  avatar/
  ChronoPinLogo.png
```

Automatisch per SFTP (nur Ordner `Chrono`):

```bash
export STRATO_FTP_HOST="ssh.media-acht.de"   # oder Host aus Strato-Panel
export STRATO_FTP_USER="your-user"
export STRATO_FTP_PASS="your-password"
cd web && ./scripts/deploy-strato.sh
```

Skript nutzt `lftp` mit `mirror --reverse --delete` — alte Assets auf dem Server werden entfernt, die nicht mehr im Build sind.

## 3. Firebase (einmalig)

1. **Authentication** → **Anonymous** aktivieren  
2. **Firestore** → Datenbank anlegen  
3. Rules + Indexes deployen (Repo-Root):

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest deploy --only firestore
```

4. **Authorized domains** (Authentication → Settings): `media-acht.de` (ohne Pfad)

Admin-Aktionen (Spieler löschen, Items vergeben) erfordern die aktuellen `firestore.rules` mit `isAdminUser()` für Namen **admin**, **dary**, **daryoush** (Groß/Kleinschreibung egal).

## 4. Mit Freundin spielen (Co-op)

**Beide** die gleiche URL öffnen:

1. **Name eingeben** (Login-Maske) — jeder eigener Name  
2. **👥 Friends** → Name suchen → **Add** → Anfrage annehmen  
3. **Multiplayer** → Freundin wählen → **Co-op Decide** → Invite senden (**Live** oder **Async**)  
4. Freundin: Home-Banner **Accept & play**  
5. Du (Host): Home-Banner **Start game**  
6. **Runden-Intro** (Animation) → Panorama → blind pinnen  
7. Beide sehen **Reveal** → **Team vote** (Partner-Wahl sichtbar) → **Submit team guess** wenn ihr euch einig seid  
8. **💬 Match-Chat** während der Runde  

Sync über Firestore (`coopRooms`, `coopInvites`, `coopRooms/{id}/messages`).

**Spiel löschen:** Friends → Tab **Games** (✕) oder **Delete game** im Wartebildschirm — Partner wird aus dem Match geworfen (`phase: done`).

## 5. Automatisierter Smoke-Test

Zwei Browser-Kontexte (Playwright) gegen Live oder Preview:

```bash
cd web
npm install
node scripts/coop-multiplayer-e2e.mjs
node scripts/coop-multiplayer-e2e.mjs http://127.0.0.1:4173/Chrono/
```

Deckt ab: Login → Freundschaft → Invite → beide pinnen → Reveal auf beiden Seiten.

## 6. Admin-Panel

Als Spieler **Admin**, **Dary** oder **Daryoush** eingeloggt: ⚙ auf dem Home-Screen → Spieler suchen, Items/Herzen vergeben oder Account löschen.

## 7. XP & Level (lokal)

Fortschritt (XP, Level, Perk-Vorschau) liegt in **localStorage** (`chronopin-progression`) — kein Firebase-Setup nötig. Nach Deploy sofort sichtbar:

- **Lv-Badge** neben dem Namen auf Home  
- **Player info** → Level & XP Balken  
- **+XP** nach Runden / Game Over / Co-op  

Cloud-Sync für XP ist für später geplant.

## 8. Factory Reset (Test)

Player info → ganz unten **Factory Reset** — löscht alle `chronopin-*` localStorage-Daten (inkl. XP) und zeigt die Login-Maske wieder.

## 9. Anderer Unterordner?

In `web/.env.production`:

```
VITE_BASE_PATH=/dein/pfad/
```

Und `web/public/.htaccess` (`RewriteBase`) anpassen, dann neu bauen.
