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

Das erzeugt `web/dist/` mit Base-Pfad `/Chrono/` (`.env.production`).

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
export STRATO_FTP_HOST="your-host.ssh.w1.strato.hosting"
export STRATO_FTP_USER="your-user"
export STRATO_FTP_PASS="your-password"
cd web && ./scripts/deploy-strato.sh
```

## 3. Firebase (einmalig)

1. **Authentication** → **Anonymous** aktivieren  
2. **Firestore** → Datenbank anlegen  
3. Rules + Indexes deployen (Repo-Root):

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest deploy --only firestore
```

4. **Authorized domains** (Authentication → Settings): `media-acht.de` (ohne Pfad)

Admin-Aktionen (Spieler löschen, Items vergeben) erfordern die aktuellen `firestore.rules` mit `isAdminUser()` für Namen **admin**, **dary**, **daryoush**.

## 4. Mit Freundin spielen (Co-op)

**Beide** die gleiche URL öffnen:

1. **Name eingeben** (Login-Maske) — jeder eigener Name  
2. **👥 Friends** → Name suchen → **Add** → Anfrage annehmen  
3. **Multiplayer** → Freundin wählen → **Co-op Decide** → Invite senden (**Live**)  
4. Freundin: Home-Banner **Accept & play**  
5. Du (Host): Home-Banner **Start game**  
6. Beide spielen — **💬 Match-Chat** während der Runde  

Sync über Firestore (`coopRooms`, `coopInvites`, `coopRooms/{id}/messages`).

## 5. Admin-Panel

Als Spieler **Admin**, **Dary** oder **Daryoush** eingeloggt: ⚙ auf dem Home-Screen → Spieler suchen, Items/Herzen vergeben oder Account löschen.

## 6. Factory Reset (Test)

Player info → ganz unten **Factory Reset** — löscht lokale Daten und zeigt die Login-Maske wieder.

## 7. Anderer Unterordner?

In `web/.env.production`:

```
VITE_BASE_PATH=/dein/pfad/
```

Und `web/public/.htaccess` (`RewriteBase`) anpassen, dann neu bauen.
