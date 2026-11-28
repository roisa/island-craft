#!/usr/bin/env python3
"""Make the Arabic clips the game still says with the device's voice, in Baby Mo's voice
(Google Cloud Text-to-Speech, Chirp3-HD "Algenib" — the same voice as the Baby Mo app and Pulau Hijaiyah).

Input:  tools/voice/missing.tsv  (kind, arabic, latin, key; made by `npx vite-node tools/voice/missing.mjs`)
        The "arabic" column is the text to say: Arabic lines, and Baby Mo's guidance in Indonesian and English
        (kinds mo-id / mo-en, keys id|… / en|…), said with the same voice in that language (id-ID / en-US Algenib,
        as in the Baby Mo app). Mo's lines are played sentence by sentence, so each row is one sentence.
Output: public/voice/game-<id>.mp3 and src/game/voice-manifest.game.json  {"ar|<text>": "game-<id>.mp3"}
        (re-importing the app's clips with import.mjs keeps these)
The Qur'an ayat are made too, for now; a reciter's recording made on the recording page (rekam/) replaces them
(recordings always win over generated clips).

Auth (any one):
  - Google Cloud Shell, or a signed-in gcloud (gcloud auth login; gcloud config set project <id>): nothing to set
  - GOOGLE_TTS_API_KEY=<an API key with Cloud Text-to-Speech enabled>

Usage:
  python3 tools/voice/gen.py --dry-run     # list what would be made (no credentials needed)
  python3 tools/voice/gen.py --test        # one clip: checks the credentials and the voice
  python3 tools/voice/gen.py               # make every missing clip (clips already made are kept)
  python3 tools/voice/gen.py --force       # remake them
  python3 tools/voice/gen.py --voice ar-XA-Chirp3-HD-Kore   # another voice
"""
import argparse, base64, hashlib, json, os, re, shutil, subprocess, sys, tempfile, time, unicodedata, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TSV = os.path.join(ROOT, "tools", "voice", "missing.tsv")
OUT = os.path.join(ROOT, "public", "voice")
MANIFEST = os.path.join(ROOT, "src", "game", "voice-manifest.game.json")
VOICE = "ar-XA-Chirp3-HD-Algenib"
MIN_BYTES = 2500  # a real syllable is bigger; the voice sometimes returns a tiny near-silent clip

# ---------- credentials ----------
KEY = os.environ.get("GOOGLE_TTS_API_KEY", "").strip()
_auth = None
def _gcloud(*args):
    try:
        r = subprocess.run(["gcloud", *args], capture_output=True, text=True, timeout=60)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""
def auth():
    global _auth
    if _auth is None:
        token = "" if KEY else _gcloud("auth", "print-access-token")
        project = os.environ.get("GOOGLE_CLOUD_PROJECT", "") or os.environ.get("DEVSHELL_PROJECT_ID", "") or (_gcloud("config", "get-value", "project") if token else "")
        _auth = (token, project)
    return _auth
HELP = """No working Google credentials, so no clip was made. Use one of:
  - Google Cloud Shell (https://shell.cloud.google.com): bash tools/voice/cloudshell.sh
  - gcloud auth login && gcloud config set project <your-project>, then run this again
  - export GOOGLE_TTS_API_KEY=<an API key with Cloud Text-to-Speech enabled>, then run this again"""

def voice_for(key, voice):
    """the voice for a line: the Arabic voice, or the same voice in Indonesian / English for Mo's guidance"""
    parts = voice.split("-")
    if key.startswith("id|"): return "-".join(["id", "ID"] + parts[2:])
    if key.startswith("en|"): return "-".join(["en", "US"] + parts[2:])
    return voice

def synth(text, voice):
    global _auth
    url = "https://texttospeech.googleapis.com/v1/text:synthesize" + ("?key=" + KEY if KEY else "")
    body = {"input": {"text": text}, "voice": {"languageCode": "-".join(voice.split("-")[:2]), "name": voice},
            "audioConfig": {"audioEncoding": "MP3", "sampleRateHertz": 24000}}  # Chirp voices: natural speed
    refreshed = False
    for attempt in range(5):
        token, project = auth()
        headers = {"Content-Type": "application/json"}
        if token and not KEY:
            headers["Authorization"] = "Bearer " + token
            if project: headers["x-goog-user-project"] = project
        if not KEY and not token: raise SystemExit(HELP)
        req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
        try:
            return base64.b64decode(json.load(urllib.request.urlopen(req, timeout=40))["audioContent"])
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:300]
            if e.code in (429, 500, 503): time.sleep(2 ** attempt); continue
            if e.code == 403 and ("has not been used" in msg or "SERVICE_DISABLED" in msg):
                print("   …Google is still switching the API on, waiting 30 s", flush=True); time.sleep(30); continue
            if e.code == 401 and token and not refreshed:  # a gcloud token lasts about an hour
                refreshed = True; _auth = None; continue
            raise SystemExit(f"HTTP {e.code} from Text-to-Speech:\n{msg}\n\n{HELP if e.code in (401, 403) else ''}")
        except urllib.error.URLError as e:
            if attempt < 4: time.sleep(2 ** attempt); continue
            raise SystemExit(f"Network error: {e}")
    raise SystemExit("Text-to-Speech kept failing; try again in a minute.")

def loud_enough(mp3):
    """False when ffmpeg hears near-silence (a size check alone lets a silent syllable through)"""
    if not shutil.which("ffmpeg"): return True
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f: f.write(mp3); fp = f.name
    try:
        o = subprocess.run(["ffmpeg", "-hide_banner", "-i", fp, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
        m = re.search(r"max_volume: (-?[\d.]+)", o)
        return not m or float(m.group(1)) > -30
    finally: os.remove(fp)

TANWIN = {"ً": "َ", "ٍ": "ِ", "ٌ": "ُ"}  # an / in / un -> fathah / kasrah / dhammah
def other_ways(t):
    """other ways to ask for the same sound, only when the voice gave silence: a lone tanwin syllable as its
    sound (بًا -> بَنْ), anything else with a full stop / exclamation / Arabic comma after it"""
    m = re.fullmatch("([ء-ي])([ً-ٍ])[اى]?", unicodedata.normalize("NFC", t.strip()))
    if m: return [m.group(1) + TANWIN[m.group(2)] + "نْ"] * 2
    return [t + ".", t + "!", t + "،"]

def make(t, voice):
    for i, text in enumerate([t, t, t] + other_ways(t)):
        mp3 = synth(text, voice)
        if len(mp3) >= MIN_BYTES and loud_enough(mp3):
            if i: print(f"   (try {i + 1} gave sound{' as ' + text if text != t else ''})", flush=True)
            return mp3
    return None

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true"); ap.add_argument("--test", action="store_true")
    ap.add_argument("--force", action="store_true"); ap.add_argument("--voice", default=VOICE)
    a = ap.parse_args()
    rows = []
    with open(TSV, encoding="utf-8") as f:
        head = f.readline().rstrip("\n").split("\t")
        for line in f:
            r = dict(zip(head, line.rstrip("\n").split("\t")))
            if r.get("arabic"): rows.append(r)
    try: manifest = json.load(open(MANIFEST, encoding="utf-8"))
    except Exception: manifest = {}
    os.makedirs(OUT, exist_ok=True)
    tag = a.voice.split("-")[-1].lower()
    name = lambda r: "game-" + hashlib.sha1((tag + "|" + r["key"]).encode()).hexdigest()[:8] + ".mp3"  # (the key has the language)
    todo = [r for r in rows if a.force or not (manifest.get(r["key"]) and os.path.exists(os.path.join(OUT, manifest[r["key"]])))]
    print(f"▶ {len(rows)} lines on the list, {len(todo)} to make, voice {a.voice}")
    if a.dry_run:
        for r in todo: print(f"   + {r['kind']:<10} {r['arabic']}  ({r['latin']})")
        return
    if a.test:
        mp3 = make("بَ", a.voice)
        print("✅ the voice works" if mp3 else "⚠️ the voice answered, but with silence"); return
    done = bad = 0
    for i, r in enumerate(todo, 1):
        mp3 = make(r["arabic"], voice_for(r["key"], a.voice))
        if not mp3: print(f"   ✗ no sound for {r['arabic']} ({r['latin']})"); bad += 1; continue
        fn = name(r)
        with open(os.path.join(OUT, fn), "wb") as f: f.write(mp3)
        manifest[r["key"]] = fn; done += 1
        print(f"   {i}/{len(todo)} {r['kind']:<10} {r['arabic']}  ✓", flush=True)
        with open(MANIFEST, "w", encoding="utf-8") as f: json.dump(dict(sorted(manifest.items())), f, ensure_ascii=False)  # (saved as it goes: a run can resume)
    with open(MANIFEST, "w", encoding="utf-8") as f: json.dump(dict(sorted(manifest.items())), f, ensure_ascii=False)
    print(f"✅ made {done} clips" + (f", {bad} gave no sound" if bad else ""))
    if bad: sys.exit(1)

if __name__ == "__main__":
    main()
