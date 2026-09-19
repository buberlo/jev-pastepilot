#!/usr/bin/env bash
# Build the optional PastePilot Settings + Service .app — macOS + Xcode CLT only.
# Not signed or notarized. Linux cannot produce a .app.
set -euo pipefail

if ! command -v swiftc >/dev/null 2>&1; then
  echo "swiftc not found. Install Xcode Command Line Tools on a Mac." >&2
  echo "Settings source is in this folder. The web URL ingest works without this binary." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="${ROOT}/dist/PastePilot.app/Contents"
mkdir -p "${DIST}/MacOS"

swiftc -O -parse-as-library \
  -framework AppKit -framework SwiftUI -framework Security \
  -o "${DIST}/MacOS/PastePilot" \
  "${ROOT}/AppSettings.swift" \
  "${ROOT}/KeychainStore.swift" \
  "${ROOT}/PastePilotApp.swift" \
  "${ROOT}/ServiceProvider.swift" \
  "${ROOT}/SettingsView.swift" \
  "${ROOT}/ShareURLBuilder.swift"

cp "${ROOT}/Info.plist" "${DIST}/Info.plist"

echo "Built ${ROOT}/dist/PastePilot.app"
echo "Copy it into ~/Applications and open it. The Settings window is the app."
echo "  PastePilot → Settings…  (⌘,)"
echo "Select text in any app → Services → Send to PastePilot"
echo "The API key lives in Keychain service local.pastepilot.typesafe — not in this repo."
echo "Keep the web app running: macos/run-dev-with-keychain.sh   (or npm run dev)"
