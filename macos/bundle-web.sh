#!/usr/bin/env bash
# Production Vite UI + standalone Node server for the Mac .app (and Linux tests).
# Never copies .env or TYPESAFE_API_KEY.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d node_modules ]]; then
  npm ci
fi

npm run build
node scripts/build-standalone.mjs

DEST="${ROOT}/macos/PastePilotService/bundled"
rm -rf "${DEST}/web"
mkdir -p "${DEST}/web"
cp -R "${ROOT}/dist/." "${DEST}/web/"

if [[ -e "${DEST}/web/.env" || -e "${DEST}/.env" ]]; then
  echo "Refusing to bundle a .env file." >&2
  exit 1
fi
if grep -R --binary-files=without-match -E 'TYPESAFE_API_KEY=' "${DEST}/web" >/dev/null 2>&1; then
  echo "Refusing to bundle: web output looks like it contains a key assignment." >&2
  exit 1
fi

echo "Bundled web UI + server into ${DEST}"
