#!/usr/bin/env bash
# Download an official Node binary for embedding in PastePilot.app.
# macOS only. Never ships TYPESAFE_API_KEY. No npm, no headers.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
NODE_VERSION="${PASTEPILOT_NODE_VERSION:-22.19.0}"
DEST="${ROOT}/bundled/runtime"
mkdir -p "$DEST"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Skipping official Node download (needs macOS). Linux tests use the system node." >&2
  exit 0
fi

ARCH="$(uname -m)"
case "$ARCH" in
  arm64) NODE_ARCH=arm64 ;;
  x86_64) NODE_ARCH=x64 ;;
  *)
    echo "Unsupported architecture: ${ARCH}" >&2
    exit 1
    ;;
esac

if [[ -x "${DEST}/node" ]]; then
  echo "Using existing ${DEST}/node"
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
TARBALL="node-v${NODE_VERSION}-darwin-${NODE_ARCH}.tar.gz"
curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/${TARBALL}" -o "${TMP}/${TARBALL}"
tar -xzf "${TMP}/${TARBALL}" -C "$TMP"
cp "${TMP}/node-v${NODE_VERSION}-darwin-${NODE_ARCH}/bin/node" "${DEST}/node"
chmod +x "${DEST}/node"
echo "Installed Node ${NODE_VERSION} (${NODE_ARCH}) → ${DEST}/node"
