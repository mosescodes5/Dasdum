#!/usr/bin/env bash
# One-command deploy to Namecheap cPanel over SSH (rsync).
#
# One-time setup: copy deploy.config.example to deploy.config and fill it in.
# Then:  npm run deploy
#
# Needs: bash, rsync, ssh. On Windows use WSL (Ubuntu) and run it from there.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f deploy.config ]; then
  echo "Missing deploy.config — copy deploy.config.example and fill it in." >&2
  exit 1
fi
# shellcheck disable=SC1091
source deploy.config   # SSH_USER, SSH_HOST, SSH_PORT, APP_DIR, SITE_URL

echo "==> Building"
NEXT_PUBLIC_SITE_URL="$SITE_URL" npm run build
node scripts/prepare-deploy.mjs

echo "==> Uploading to $SSH_USER@$SSH_HOST:$APP_DIR"
# --delete removes stale files from old builds; .env and anything outside
# the app folder (your uploads folder) are never touched.
rsync -az --delete --info=progress2 \
  --exclude ".env" --exclude "tmp/" --exclude "stderr.log" \
  -e "ssh -p $SSH_PORT" \
  deploy/ "$SSH_USER@$SSH_HOST:$APP_DIR/"

echo "==> Restarting app"
ssh -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" "mkdir -p $APP_DIR/tmp && touch $APP_DIR/tmp/restart.txt"
echo "Done: $SITE_URL"
