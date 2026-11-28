// Cleans up the letter / syllable clips that came from the Baby Mo app (hijaiyah-*.mp3), which were made by a
// text-to-speech voice from one syllable at a time:
//   - many start with up to a second of silence, so a tap on ب or َ felt late (and quick taps overlapped):
//     the silence before and after the voice is cut and the loudness evened out -> public/voice/fix-<name>.mp3
//   - some are near-silent blips (the voice returned almost nothing for that syllable): those are marked ""
//     ("broken"), so the game doesn't play them; the device reads the syllable until a clip is made for it
//     (tools/voice/missing.mjs lists them, tools/voice/cloudshell.sh makes them, a recording on rekam/ wins).
// Output: src/game/voice-manifest.fix.json  {"<key>": "fix-<name>.mp3" | ""}
// Needs ffmpeg. Run again after re-importing the app's clips:
//   node tools/voice/fix-clips.mjs
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const VOICE = path.join(ROOT, 'public/voice');
const APP = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/game/voice-manifest.json'), 'utf8'));
/** quieter than this at its loudest: not a real voice */
const QUIET_DB = -18;
/** shorter than this once trimmed: not a whole syllable */
const MIN_SEC = 0.12;

const run = (args) => spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8' }).stderr || ''; // (ffmpeg reports on stderr)
const probe = (f) => {
  const out = run(['-i', f, '-af', 'volumedetect', '-f', 'null', '-']);
  const max = +(out.match(/max_volume: ([-0-9.]+) dB/)?.[1] ?? -99);
  const dur = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return { max, dur: dur ? +dur[1] * 3600 + +dur[2] * 60 + +dur[3] : 0 };
};

const byFile = new Map();
for (const [k, v] of Object.entries(APP)) {
  const f = v.split('?')[0];
  if (!/^hijaiyah-/.test(f)) continue;
  if (!byFile.has(f)) byFile.set(f, []);
  byFile.get(f).push(k);
}
const fix = {};
let made = 0, broken = 0, kept = 0;
for (const [f, keys] of byFile) {
  const src = path.join(VOICE, f);
  if (!fs.existsSync(src)) continue;
  const { max } = probe(src);
  if (max < QUIET_DB) { for (const k of keys) fix[k] = ''; broken++; continue; }
  const out = 'fix-' + f, dst = path.join(VOICE, out);
  if (!fs.existsSync(dst)) {
    // cut the silence before and after the voice (keeping 40 ms of air), then bring the peak to -1 dB
    const gain = Math.max(0, -1 - max).toFixed(1);
    run(['-y', '-i', src, '-af',
      `silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.06,areverse,volume=${gain}dB`,
      '-ar', '24000', '-ac', '1', '-b:a', '64k', dst]);
  }
  const p = fs.existsSync(dst) ? probe(dst) : { dur: 0, max: -99 };
  if (p.dur < MIN_SEC) { for (const k of keys) fix[k] = ''; broken++; fs.rmSync(dst, { force: true }); continue; }
  for (const k of keys) fix[k] = out;
  made++;
}
const sorted = Object.fromEntries(Object.entries(fix).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(path.join(ROOT, 'src/game/voice-manifest.fix.json'), JSON.stringify(sorted) + '\n');
console.log(`voice-manifest.fix.json: ${made} clips trimmed, ${broken} near-silent clips marked broken${kept ? `, ${kept} kept` : ''}`);
const bad = Object.entries(sorted).filter(([k, v]) => !v && k.startsWith('ar|')).map(([k]) => k.slice(3));
if (bad.length) console.log('broken (the device reads these until a clip is made):', bad.join(' '));
