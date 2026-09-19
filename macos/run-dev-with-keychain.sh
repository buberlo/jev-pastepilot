#!/usr/bin/env bash
# Start the local PastePilot server using Mac Settings (Keychain + prefs).
# Never prints TYPESAFE_API_KEY. Do not run with bash -x.
# Linux has no Keychain — falls through to npm run dev / gitignored .env.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "$(uname -s)" == "Darwin" ]]; then
  if security find-generic-password -s local.pastepilot.typesafe -a TYPESAFE_API_KEY >/dev/null 2>&1; then
    TYPESAFE_API_KEY="$(security find-generic-password -s local.pastepilot.typesafe -a TYPESAFE_API_KEY -w)"
    export TYPESAFE_API_KEY
  fi
  MODEL="$(defaults read local.pastepilot.settings model 2>/dev/null || true)"
  PROVIDER="$(defaults read local.pastepilot.settings provider 2>/dev/null || true)"
  if [[ -n "${MODEL}" ]]; then
    export TYPESAFE_MODEL="${MODEL}"
  fi
  if [[ -n "${PROVIDER}" ]]; then
    export DECISION_PROVIDER="${PROVIDER}"
  fi
else
  echo "Keychain is macOS-only. Using npm run dev (optional gitignored .env). Never commit TYPESAFE_API_KEY." >&2
fi

exec npm run dev
