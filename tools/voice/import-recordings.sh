#!/usr/bin/env bash
# Put the recording page's ZIP into the game (see tools/voice/import-recordings.mjs), then refresh the page's list.
#   bash tools/voice/import-recordings.sh ~/Downloads/mocraft-rekaman-….zip
set -euo pipefail
cd "$(dirname "$0")/../.."
node tools/voice/import-recordings.mjs "$@"
[ -n "${DRY_RUN:-}" ] || npx vite-node tools/voice/build-rekam-data.mjs
