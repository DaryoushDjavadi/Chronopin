#!/usr/bin/env bash
# Upload web/dist/ to Strato: STRATO-apps/wordpress_02/app/Chrono/
#
# Usage (once):
#   export STRATO_FTP_HOST="ssh.media-acht.de"   # or ftp.strato.de — from Strato panel
#   export STRATO_FTP_USER="your-ftp-user"
#   export STRATO_FTP_PASS="your-ftp-password"
#   ./scripts/deploy-strato.sh
#
# Requires: lftp (brew install lftp)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
REMOTE_DIR="STRATO-apps/wordpress_02/app/Chrono"

if [[ ! -f "$DIST/index.html" ]]; then
  echo "Missing $DIST/index.html — run: npm run build:strato"
  exit 1
fi

: "${STRATO_FTP_HOST:?Set STRATO_FTP_HOST (e.g. ssh.media-acht.de)}"
: "${STRATO_FTP_USER:?Set STRATO_FTP_USER}"
: "${STRATO_FTP_PASS:?Set STRATO_FTP_PASS}"

if ! command -v lftp >/dev/null 2>&1; then
  echo "Install lftp first: brew install lftp"
  exit 1
fi

echo "Uploading $DIST -> /$REMOTE_DIR on $STRATO_FTP_HOST ..."

lftp -e "
set ssl:verify-certificate no
set ftp:ssl-force true
set ftp:ssl-protect-data true
open -u ${STRATO_FTP_USER},${STRATO_FTP_PASS} sftp://${STRATO_FTP_HOST}
mkdir -p ${REMOTE_DIR}
cd ${REMOTE_DIR}
lcd ${DIST}
mirror --reverse --delete --verbose --exclude-glob .DS_Store
bye
"

echo "Done. Test: https://media-acht.de/Chrono/"
