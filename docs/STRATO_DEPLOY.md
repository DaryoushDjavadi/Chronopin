# ChronoPin auf Strato deployen

Zielordner auf dem Server:

```
/STRATO-apps/wordpress_02/app/Chrono/
```

Öffentliche URL (Beispiel):

```
https://deine-domain.de/app/Chrono/
```

## 1. Build

```bash
cd web
npm install
cp .env.example .env
# VITE_FIREBASE_* eintragen (für Online-Multiplayer)
npm run build:strato
```

Das erzeugt `web/dist/` mit Base-Pfad `/app/Chrono/` (`.env.production`).

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

## 3. Firebase (einmalig)

1. **Authentication** → **Anonymous** aktivieren  
2. **Firestore** → Datenbank anlegen  
3. Rules + Indexes deployen (Repo-Root):

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest deploy --only firestore
```

4. **Authorized domains** (Authentication → Settings): deine Domain **ohne** `https://` und **ohne** Pfad

## 4. Mit Freundin spielen (Co-op)

**Beide** die gleiche URL öffnen:

1. **Name eingeben** (Login-Maske) — jeder eigener Name  
2. **👥 Friends** → Name suchen → **Add** → Anfrage annehmen  
3. **Multiplayer** → Freundin wählen → **Co-op Decide** → Invite senden (**Live**)  
4. Freundin: Home-Banner **Accept & play**  
5. Du (Host): Home-Banner **Start game**  
6. Beide spielen — **💬 Match-Chat** während der Runde  

Sync über Firestore (`coopRooms`, `coopInvites`, `coopRooms/{id}/messages`).

## 5. Factory Reset (Test)

Player info → ganz unten **Factory Reset** — löscht lokale Daten und zeigt die Login-Maske wieder.

## 6. Anderer Unterordner?

In `web/.env.production`:

```
VITE_BASE_PATH=/dein/pfad/
```

Und `web/public/.htaccess` (`RewriteBase`) anpassen, dann neu bauen.
