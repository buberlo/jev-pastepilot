#!/usr/bin/env bash
# Send selected or piped text into PastePilot.
# Explicit invoke only. Does not watch the clipboard unless --clipboard is passed.
# On a Mac, opens the app via pastepilot://ingest (not Chrome) unless --web.

set -euo pipefail

BASE="${PASTEPILOT_URL:-}"
PROVIDER="${PASTEPILOT_PROVIDER:-}"
PRINT_URL=0
FROM_CLIPBOARD=0
OPEN_WEB=0
TEXT=""

# Non-secret Mac Settings (UserDefaults). Never reads the Keychain API key.
if command -v defaults >/dev/null 2>&1; then
  if [[ -z "$BASE" ]]; then
    BASE="$(defaults read local.pastepilot.settings serverURL 2>/dev/null || true)"
  fi
  if [[ -z "$PROVIDER" ]]; then
    PROVIDER="$(defaults read local.pastepilot.settings provider 2>/dev/null || true)"
  fi
fi
BASE="${BASE:-http://localhost:5173}"
PROVIDER="${PROVIDER:-mock}"

usage() {
  cat <<'EOF'
Usage:
  share-to-pastepilot.sh "selected text"
  echo "selected text" | share-to-pastepilot.sh
  share-to-pastepilot.sh --clipboard          # explicit clipboard read only
  share-to-pastepilot.sh --print-url "text"   # print the HTTP ingest URL, do not open
  share-to-pastepilot.sh --url http://127.0.0.1:18763 "text"
  share-to-pastepilot.sh --web "text"         # open the HTTP URL in a browser

On a Mac, the default is pastepilot://ingest (the app window). --print-url still
prints the HTTP URL. Nothing is executed in PastePilot until you press Confirm.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --print-url)
      PRINT_URL=1
      shift
      ;;
    --clipboard)
      FROM_CLIPBOARD=1
      shift
      ;;
    --web)
      OPEN_WEB=1
      shift
      ;;
    --url)
      BASE="${2:-}"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      TEXT="$1"
      shift
      break
      ;;
  esac
done

if [[ -z "$TEXT" && $# -gt 0 ]]; then
  TEXT="$*"
fi

if [[ -z "$TEXT" && "$FROM_CLIPBOARD" -eq 1 ]]; then
  if command -v pbpaste >/dev/null 2>&1; then
    TEXT="$(pbpaste)"
  else
    echo "pbpaste is not available. Pass text as an argument or on stdin." >&2
    exit 1
  fi
fi

if [[ -z "$TEXT" && ! -t 0 ]]; then
  TEXT="$(cat)"
fi

if [[ -z "${TEXT}" ]]; then
  echo "No text. Select text first, pass an argument, pipe stdin, or use --clipboard." >&2
  exit 1
fi

ENCODED="$(printf '%s' "$TEXT" | python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.stdin.read(), safe=""))')"
PROVIDER="$(printf '%s' "$PROVIDER" | tr '[:upper:]' '[:lower:]')"
case "$PROVIDER" in
  jev|local)
    HTTP_TARGET="${BASE%/}/?provider=${PROVIDER}&text=${ENCODED}"
    SCHEME_TARGET="pastepilot://ingest?provider=${PROVIDER}&text=${ENCODED}"
    ;;
  *)
    HTTP_TARGET="${BASE%/}/?text=${ENCODED}"
    SCHEME_TARGET="pastepilot://ingest?text=${ENCODED}"
    ;;
esac

if [[ "$PRINT_URL" -eq 1 ]]; then
  printf '%s\n' "$HTTP_TARGET"
  exit 0
fi

if [[ "$(uname -s)" == "Darwin" && "$OPEN_WEB" -eq 0 ]]; then
  open "$SCHEME_TARGET"
  exit 0
fi

if command -v open >/dev/null 2>&1; then
  open "$HTTP_TARGET"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$HTTP_TARGET"
else
  printf '%s\n' "$HTTP_TARGET"
fi
