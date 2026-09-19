#!/usr/bin/env bash
# Build the optional PastePilot Service .app — macOS + Xcode CLT only.
set -euo pipefail

if ! command -v swiftc >/dev/null 2>&1; then
  echo "swiftc not found. Install Xcode Command Line Tools on a Mac." >&2
  echo "The web URL ingest works without this binary: npm run dev, then open /?text=" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="${ROOT}/dist/PastePilot.app/Contents"
mkdir -p "${DIST}/MacOS"

swiftc -O -framework AppKit -o "${DIST}/MacOS/PastePilot" "${ROOT}/main.swift"
cp "${ROOT}/Info.plist" "${DIST}/Info.plist"

echo "Built ${ROOT}/dist/PastePilot.app"
echo "Copy it into ~/Applications, launch it once, then:"
echo "  System Settings → Keyboard → Keyboard Shortcuts → Services"
echo "Select text in any app → Services → Send to PastePilot"
echo "PastePilot (npm run dev) must already be running at http://localhost:5173"
