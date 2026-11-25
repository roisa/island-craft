#!/usr/bin/env bash
# Make the game's missing Arabic clips in Baby Mo's voice, in Google Cloud Shell (signed in already: no API
# key needed), and push them to a new branch for Claude to merge.
#   bash tools/voice/cloudshell.sh            -> every missing clip (Iqro syllables and words, du'a, the ayat,
#                                                 and Baby Mo's guidance in Indonesian & English)
#   bash tools/voice/cloudshell.sh <voice>    -> another voice, e.g. ar-XA-Chirp3-HD-Kore
# Default voice: Chirp3-HD Algenib, the Baby Mo voice. A recording from the recording page (rekam/) always wins.
set -euo pipefail
cd "$(dirname "$0")/../.."
VOICE="${1:-}"; ARGS=(); [ -n "$VOICE" ] && ARGS+=(--voice "$VOICE")
echo "▶ Project: $(gcloud config get-value project 2>/dev/null)"
gcloud services enable texttospeech.googleapis.com >/dev/null
# ffmpeg lets gen.py hear whether a clip is really silent
command -v ffmpeg >/dev/null || { echo "▶ Installing ffmpeg for the silence check…"; sudo apt-get -qq update >/dev/null 2>&1; sudo apt-get -qq install -y ffmpeg >/dev/null 2>&1 || echo "  (no ffmpeg: only the size check will run)"; }
python3 tools/voice/gen.py --dry-run "${ARGS[@]}"
python3 tools/voice/gen.py --test "${ARGS[@]}"
echo "▶ Making the clips: Arabic, and Baby Mo’s guidance in Indonesian & English (about 10 minutes)…"
python3 tools/voice/gen.py "${ARGS[@]}"
BR="voice-clips-$(date +%Y%m%d-%H%M)"; git checkout -q -b "$BR"
git add public/voice/game-*.mp3 src/game/voice-manifest.game.json
git -c user.name="${GIT_NAME:-babymo}" -c user.email="${GIT_EMAIL:-babymo@users.noreply.github.com}" commit -q -m "Voice: the game's missing clips, Arabic and Baby Mo's guidance (${VOICE:-Chirp3-HD Algenib})"
git push -q -u origin "$BR"
echo ""
echo "✅ Done — pushed branch: $BR"
echo "   Tell Claude: \"merge $BR\" (the clips play in the game from the next build)."
