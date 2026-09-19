#!/usr/bin/env bash
# Double-click on a Mac to install the Send to PastePilot Quick Action.
# Copies the bundled .workflow into ~/Library/Services.
# Does not watch the clipboard. Not a signed or notarized .app.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="${ROOT}/Send to PastePilot.workflow"
DEST="${HOME}/Library/Services/Send to PastePilot.workflow"

if [[ ! -d "$SRC" ]]; then
  echo "Missing ${SRC}" >&2
  exit 1
fi

mkdir -p "${HOME}/Library/Services"
rm -rf "$DEST"
cp -R "$SRC" "$DEST"

if [[ "$(uname -s)" == "Darwin" ]]; then
  /System/Library/CoreServices/pbs -flush 2>/dev/null || true
  killall pbs 2>/dev/null || true
fi

cat <<'EOF'
Installed: Send to PastePilot

1. Keep PastePilot running:
     npm run dev
   (http://localhost:5173)

2. In any app, select text → Services → Send to PastePilot
   If it is missing: System Settings → Keyboard → Keyboard Shortcuts → Services
   Enable “Send to PastePilot” under Text.

3. The browser opens with the text filled. Preview → Confirm is still required.

This is a Quick Action / Service, not a notarized Mac app.
EOF

if [[ -t 0 ]]; then
  printf '\nPress Return to close.'
  read -r _
fi
