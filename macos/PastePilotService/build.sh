#!/usr/bin/env bash
# Assemble PastePilot.app: Swift UI + bundled Vite UI + Node server.
# macOS + Xcode CLT for the .app. Linux can still run bundle-web.sh.
# Not signed or notarized. Never copies TYPESAFE_API_KEY.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "${ROOT}/../.." && pwd)"
DIST="${ROOT}/dist/PastePilot.app/Contents"

if [[ ! -f "${ROOT}/bundled/server.mjs" || ! -f "${ROOT}/bundled/web/index.html" ]]; then
  "${REPO}/macos/bundle-web.sh"
fi

if [[ "$(uname -s)" == "Darwin" && ! -x "${ROOT}/bundled/runtime/node" ]]; then
  "${ROOT}/bundle-runtime.sh"
fi

if ! command -v swiftc >/dev/null 2>&1; then
  echo "swiftc not found. Web/server bundle is ready under macos/PastePilotService/bundled/." >&2
  echo "Install Xcode Command Line Tools on a Mac to produce PastePilot.app." >&2
  exit 1
fi

if [[ ! -x "${ROOT}/bundled/runtime/node" ]]; then
  echo "Missing bundled Node runtime. Run macos/PastePilotService/bundle-runtime.sh on a Mac." >&2
  exit 1
fi

mkdir -p "${DIST}/MacOS" "${DIST}/Resources/web" "${DIST}/Resources/server" "${DIST}/Resources/runtime"

swiftc -O -parse-as-library \
  -framework AppKit -framework Combine -framework SwiftUI -framework Security -framework WebKit \
  -o "${DIST}/MacOS/PastePilot" \
  "${ROOT}/AppSettings.swift" \
  "${ROOT}/IngestStore.swift" \
  "${ROOT}/KeychainStore.swift" \
  "${ROOT}/LocalServer.swift" \
  "${ROOT}/MacActions.swift" \
  "${ROOT}/MainWebView.swift" \
  "${ROOT}/PastePilotApp.swift" \
  "${ROOT}/ServiceProvider.swift" \
  "${ROOT}/SettingsView.swift" \
  "${ROOT}/ShareURLBuilder.swift"

cp "${ROOT}/Info.plist" "${DIST}/Info.plist"
rm -rf "${DIST}/Resources/web"
mkdir -p "${DIST}/Resources/web"
cp -R "${ROOT}/bundled/web/." "${DIST}/Resources/web/"
cp "${ROOT}/bundled/server.mjs" "${DIST}/Resources/server/server.mjs"
cp "${ROOT}/bundled/runtime/node" "${DIST}/Resources/runtime/node"
chmod +x "${DIST}/Resources/runtime/node"

if [[ -e "${DIST}/Resources/web/.env" ]]; then
  echo "Refusing to ship a .env inside the app bundle." >&2
  exit 1
fi

echo "Built ${ROOT}/dist/PastePilot.app"
echo "The main window is PastePilot. Settings is ⌘,."
echo "The API key lives in Keychain service local.pastepilot.typesafe — not in this repo or the zip."
