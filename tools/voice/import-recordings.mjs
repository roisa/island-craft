// Put real-voice recordings from the recording page (rekam/ → "Download ZIP") into the game.
//   bash tools/voice/import-recordings.sh ~/Downloads/mocraft-rekaman-20261120-1530.zip
//   DRY_RUN=1 bash tools/voice/import-recordings.sh <zip>      (only list what would change)
// Each take voice/<id>.wav in the ZIP becomes public/voice/rec-<id>-<n>.mp3 (24 kHz mono 64 kbps; n goes up
// with each new take, so phones fetch the new sound), and every key of that line (rekam/rekam-data.js) points
// at it in src/game/voice-manifest.rec.json. Recordings win over every other clip, and re-importing the app's
// clips (import.mjs) or making clips in Cloud Shell (gen.py) never touches them.
// Needs ffmpeg (brew install ffmpeg) and python3 (for unzipping safely).
import fs from 'fs';
import path from 'path';
import os from 'os';
import vm from 'vm';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ZIP = process.argv[2], DRY = !!process.env.DRY_RUN;
if (!ZIP || !fs.existsSync(ZIP)) { console.error('usage: bash tools/voice/import-recordings.sh <mocraft-rekaman-….zip>'); process.exit(2); }
const has = cmd => { try { execFileSync(cmd, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } };
if (!DRY && !has('ffmpeg')) { console.error('ffmpeg is needed: brew install ffmpeg (Mac) or apt-get install ffmpeg'); process.exit(2); }

// the line list: id -> keys
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'rekam/rekam-data.js'), 'utf8'), { window: win });
const BY = new Map((win.REKAM || []).map(r => [r.id, r]));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mocraft-rekam-'));
try {
  execFileSync('python3', ['-I', '-m', 'zipfile', '-e', path.resolve(ZIP), tmp]); // (zipfile drops absolute paths and "..")
  const dir = path.join(tmp, 'voice');
  const takes = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.(wav|m4a|webm|ogg|mp3)$/i.test(f)).sort() : [];
  if (!takes.length) { console.error('no recordings (voice/<id>.wav) found in ' + ZIP); process.exit(1); }
  const recFile = path.join(ROOT, 'src/game/voice-manifest.rec.json');
  const rec = JSON.parse(fs.readFileSync(recFile, 'utf8'));
  const out = path.join(ROOT, 'public/voice');
  let n = 0;
  for (const t of takes) {
    const id = t.replace(/\.[^.]+$/, '');
    if (!/^[A-Za-z0-9_-]+$/.test(id)) { console.log('skip ' + t + ' (odd file name)'); continue; }
    const row = BY.get(id);
    if (!row) { console.log('skip ' + t + ' (no such line in rekam/rekam-data.js)'); continue; }
    const old = fs.readdirSync(out).filter(f => f.startsWith('rec-' + id + '-') && f.endsWith('.mp3'));
    const ver = Math.max(0, ...old.map(f => +f.slice(('rec-' + id + '-').length, -4) || 0)) + 1;
    const name = `rec-${id}-${ver}.mp3`;
    if (DRY) { console.log(`would make public/voice/${name} for ${row.t}`); n++; continue; }
    execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', path.join(dir, t), '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '64k', path.join(out, name)]);
    for (const f of old) fs.rmSync(path.join(out, f));
    for (const k of row.ks) rec[k] = name;
    console.log(`made public/voice/${name}  ${row.t}`); n++;
  }
  if (!DRY) {
    fs.writeFileSync(recFile, JSON.stringify(Object.fromEntries(Object.entries(rec).sort(([a], [b]) => a.localeCompare(b)))));
    console.log(`✅ ${n} recordings in the game. Next: npx vite-node tools/voice/build-rekam-data.mjs, then build.`);
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
