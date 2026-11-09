// Sound: light synthesized effects (no audio files), a calm generative
// background melody, and letter speech (recorded files if present, else TTS).

let ctx: AudioContext | null = null;
export const audioState = { sfx: true, music: true };

export function actx(): AudioContext | null {
  if (!ctx) { try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => { });
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', peak = 0.16, delay = 0, dest?: AudioNode) {
  const c = actx(); if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest ?? c.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(dur: number, peak: number, freq = 900, delay = 0, type: BiquadFilterType = 'lowpass', q = 0.7) {
  const c = actx(); if (!c) return;
  const n = Math.max(1, Math.round(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = peak;
  s.connect(f); f.connect(g); g.connect(c.destination);
  s.start(c.currentTime + delay);
}

const on = () => audioState.sfx;
// a little random pitch so repeated hits don't sound like a machine gun
const vary = (f: number, amt = 0.08) => f * (1 + (Math.random() * 2 - 1) * amt);

/** Per-material sounds: hit (each strike while mining), break, place and footsteps. */
type MatSound = { hit(): void; brk(): void; place(): void; step(): void };
const MAT_SOUND: Record<string, MatSound> = {
  wood: {
    hit() { tone(vary(190), 0.09, 'triangle', 0.13); noise(0.05, 0.08, vary(900), 0, 'bandpass', 2); },
    brk() { tone(vary(150), 0.16, 'triangle', 0.12); tone(vary(110), 0.2, 'triangle', 0.08, 0.05); noise(0.18, 0.14, 700, 0, 'bandpass', 1.2); },
    place() { tone(vary(240), 0.07, 'triangle', 0.12); noise(0.04, 0.06, 1200, 0, 'bandpass', 2); },
    step() { tone(vary(160), 0.05, 'triangle', 0.035); },
  },
  stone: {
    hit() { noise(0.05, 0.13, vary(2600), 0, 'bandpass', 3); tone(vary(520), 0.04, 'square', 0.03); },
    brk() { noise(0.2, 0.2, 1500, 0, 'bandpass', 0.9); noise(0.12, 0.1, 3200, 0.04, 'bandpass', 2); },
    place() { noise(0.06, 0.12, 1800, 0, 'bandpass', 2); tone(vary(330), 0.05, 'square', 0.04); },
    step() { noise(0.04, 0.05, vary(2200), 0, 'bandpass', 2.5); },
  },
  dirt: {
    hit() { noise(0.06, 0.12, vary(500)); },
    brk() { noise(0.2, 0.2, 600); noise(0.1, 0.08, 300, 0.05); },
    place() { noise(0.08, 0.13, 550); },
    step() { noise(0.045, 0.045, vary(450)); },
  },
  sand: {
    hit() { noise(0.07, 0.1, vary(1800), 0, 'highpass', 0.5); },
    brk() { noise(0.25, 0.14, 2200, 0, 'highpass', 0.4); },
    place() { noise(0.1, 0.1, 2000, 0, 'highpass', 0.4); },
    step() { noise(0.06, 0.04, vary(2500), 0, 'highpass', 0.4); },
  },
  snow: {
    hit() { noise(0.07, 0.1, vary(1200), 0, 'bandpass', 0.8); },
    brk() { noise(0.22, 0.13, 1400, 0, 'bandpass', 0.6); },
    place() { noise(0.09, 0.1, 1300, 0, 'bandpass', 0.7); },
    step() { noise(0.07, 0.05, vary(1500), 0, 'bandpass', 0.7); },
  },
  glass: {
    hit() { tone(vary(1900, 0.04), 0.06, 'sine', 0.06); },
    brk() { [2093, 2637, 3136, 2349].forEach((f, i) => tone(vary(f, 0.03), 0.18, 'sine', 0.06, i * 0.03)); noise(0.12, 0.08, 5000, 0, 'highpass', 0.7); },
    place() { tone(vary(1568, 0.03), 0.09, 'sine', 0.07); tone(vary(2093, 0.03), 0.07, 'sine', 0.05, 0.03); },
    step() { tone(vary(1200), 0.03, 'sine', 0.02); },
  },
  leaves: {
    hit() { noise(0.08, 0.08, vary(3500), 0, 'highpass', 0.5); },
    brk() { noise(0.28, 0.12, 3000, 0, 'highpass', 0.4); },
    place() { noise(0.1, 0.08, 3200, 0, 'highpass', 0.4); },
    step() { noise(0.06, 0.03, vary(3500), 0, 'highpass', 0.4); },
  },
  wool: {
    hit() { noise(0.05, 0.1, vary(350)); },
    brk() { noise(0.16, 0.14, 400); },
    place() { noise(0.07, 0.12, 380); },
    step() { noise(0.05, 0.035, vary(320)); },
  },
  metal: {
    hit() { tone(vary(880, 0.03), 0.12, 'triangle', 0.08); tone(vary(1320, 0.03), 0.1, 'sine', 0.04); },
    brk() { [880, 1175, 1568].forEach((f, i) => tone(f, 0.25, 'triangle', 0.08, i * 0.05)); },
    place() { tone(vary(1047, 0.02), 0.12, 'triangle', 0.08); },
    step() { tone(vary(700), 0.04, 'triangle', 0.025); },
  },
  magic: {
    hit() { tone(vary(1047, 0.05), 0.08, 'sine', 0.06); },
    brk() { [784, 988, 1175].forEach((f, i) => tone(f, 0.18, 'sine', 0.08, i * 0.06)); },
    place() { tone(1175, 0.12, 'sine', 0.07); },
    step() { },
  },
};
MAT_SOUND.ore = { ...MAT_SOUND.stone, brk() { MAT_SOUND.stone.brk(); tone(vary(1319, 0.03), 0.16, 'sine', 0.06, 0.05); } };
MAT_SOUND.grass = MAT_SOUND.dirt; MAT_SOUND.clay = MAT_SOUND.dirt; MAT_SOUND.gravel = MAT_SOUND.sand;
MAT_SOUND.ice = MAT_SOUND.glass; MAT_SOUND.plant = MAT_SOUND.leaves;
MAT_SOUND.water = { hit() { }, brk() { noise(0.25, 0.12, 1800); }, place() { noise(0.2, 0.1, 1600); }, step() { noise(0.08, 0.04, 1600); } };
const snd = (m: string) => MAT_SOUND[m] ?? MAT_SOUND.stone;
/** limit how often one sound can start (many drops at once shouldn't stack up) */
const lastAt = new Map<string, number>();
function throttle(key: string, ms: number) {
  const now = performance.now(), l = lastAt.get(key) ?? 0;
  if (now - l < ms) return false;
  lastAt.set(key, now); return true;
}
export const SFX = {
  warm() { actx(); },
  hit(soft = false) { if (on()) noise(0.06, soft ? 0.08 : 0.12, soft ? 1400 : 700); },
  breakBlock() { if (on()) { noise(0.14, 0.2, 800); tone(180, 0.08, 'triangle', 0.06); } },
  place() { if (on()) { tone(300, 0.07, 'square', 0.07); tone(450, 0.06, 'square', 0.05, 0.03); } },
  pickup() { if (on() && throttle('pickup', 70)) { tone(880, 0.06, 'sine', 0.08); tone(1320, 0.08, 'sine', 0.06, 0.04); } },
  /** the "pop into the bag" note rises a little with each item in a burst */
  pop(i = 0) { if (on() && throttle('pop', 45)) tone(988 * Math.pow(2, Math.min(i, 7) / 12), 0.07, 'sine', 0.07); },
  /** a short, friendly voice for each animal (synthesized glides, nothing scary) */
  critter(kind: string) {
    if (!on() || !throttle('critter', 250)) return;
    const c = actx(); if (!c) return;
    const glide = (f0: number, f1: number, dur: number, type: OscillatorType, peak: number, delay = 0, wob = 0) => {
      const t0 = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      if (wob) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = wob; lg.gain.value = f0 * 0.06; l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + dur + 0.05); }
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
    };
    const v = vary(1, 0.06);
    if (kind === 'chicken') { glide(900 * v, 1300 * v, 0.07, 'triangle', 0.05); glide(950 * v, 1400 * v, 0.07, 'triangle', 0.05, 0.1); }
    else if (kind === 'sheep' || kind === 'goat') glide((kind === 'goat' ? 420 : 340) * v, 300 * v, 0.45, 'sawtooth', 0.025, 0, 11);
    else if (kind === 'cow') glide(150 * v, 110 * v, 0.6, 'sawtooth', 0.03, 0, 4);
    else if (kind === 'cat') glide(620 * v, 900 * v, 0.28, 'triangle', 0.04, 0, 6);
    else if (kind === 'camel') glide(200 * v, 160 * v, 0.4, 'sawtooth', 0.025, 0, 7);
  },
  /** three soft gulps, then a happy "ahh" */
  gulp() {
    if (!on()) return;
    const c = actx(); if (!c) return;
    for (let i = 0; i < 3; i++) {
      const t0 = c.currentTime + i * 0.42, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(vary(260, 0.05), t0); o.frequency.exponentialRampToValueAtTime(110, t0 + 0.16);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.22, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 0.25);
      noise(0.08, 0.05, 700, i * 0.42 + 0.05, 'bandpass', 3);
    }
    [523, 659, 784].forEach((f, i) => tone(f, 0.22, 'sine', 0.09, 1.35 + i * 0.07));
  },
  pour() { if (on()) { noise(0.7, 0.07, 1800, 0, 'bandpass', 1.5); [880, 988, 1175].forEach((f, i) => tone(f, 0.1, 'sine', 0.03, 0.15 + i * 0.18)); } },
  hitMat(m: string) { if (on() && throttle('hit', 60)) snd(m).hit(); },
  breakMat(m: string) { if (on()) snd(m).brk(); },
  placeMat(m: string) { if (on() && throttle('place', 50)) snd(m).place(); },
  stepMat(m: string) { if (on() && throttle('step', 120)) snd(m).step(); },
  jump() { if (on()) tone(420, 0.1, 'triangle', 0.06); },
  step() { if (on()) noise(0.04, 0.035, 500); },
  splash() { if (on()) noise(0.25, 0.12, 1800); },
  /** the soft rush of a waterfall (v = how close, 0..1) */
  rush(v: number) { if (on() && v > 0.05) noise(1.6, 0.035 * v, 1300, 0, 'bandpass', 0.6); },
  /** night sounds: a cricket's chirp, an owl's hoo-hoo */
  cricket() { if (on()) for (let i = 0; i < 3; i++) tone(4200 + Math.random() * 300, 0.03, 'sine', 0.012, i * 0.07); },
  owl() { if (on()) { tone(392, 0.28, 'sine', 0.035, 0); tone(330, 0.45, 'sine', 0.035, 0.38); } },
  twinkle() { if (on()) [1568, 2093, 2637].forEach((f, i) => tone(f, 0.18, 'sine', 0.05, i * 0.07)); },
  /** a firework: whoosh up, then a soft pop */
  boom() { if (on()) { noise(0.5, 0.04, 2400, 0, 'highpass'); noise(0.5, 0.11, 500, 0.45); tone(90, 0.3, 'sine', 0.08, 0.45); } },
  craft() { if (on()) { tone(523, 0.1, 'triangle', 0.12); tone(659, 0.1, 'triangle', 0.12, 0.08); tone(784, 0.16, 'triangle', 0.12, 0.16); } },
  pet() { if (on()) { tone(660, 0.1, 'sine', 0.14); tone(990, 0.14, 'sine', 0.1, 0.07); } },
  letter() { if (on()) { tone(784, 0.12, 'sine', 0.14); tone(988, 0.12, 'sine', 0.12, 0.09); tone(1175, 0.2, 'sine', 0.12, 0.18); } },
  quest() { if (on()) { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.11)); } },
  error() { if (on()) tone(220, 0.12, 'sine', 0.08); },
  click() { if (on()) tone(700, 0.04, 'sine', 0.06); },
  /** soft bell chime for prayer time (not an adhan recording) */
  chime() {
    if (!on()) return;
    [[587, 0], [784, 0.35], [880, 0.7], [784, 1.2]].forEach(([f, d]) => { tone(f, 1.6, 'sine', 0.1, d); tone(f * 2, 1.0, 'sine', 0.025, d); });
  },
  /** the bedug: a deep, warm drum beat */
  drum(times = 1) {
    if (!on()) return;
    const c = actx(); if (!c) return;
    for (let i = 0; i < times; i++) bedugStrike(c, c.currentTime + 0.02 + i * 0.55, i === times - 1 ? 1 : 0.85);
  },
  fanfare() { if (on()) { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.15, i * 0.14)); } },
};

export function haptic(p: number | number[]) { try { navigator.vibrate?.(p); } catch { /* ignore */ } }

// ---- calm generative music (pentatonic, different mood at night) --------------
export const Music = (() => {
  let master: GainNode | null = null, timer = 0, night = false, running = false;
  const DAY = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
  const NIGHT = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0];
  function ensure() {
    const c = actx(); if (!c) return false;
    if (!master) { master = c.createGain(); master.gain.value = 0; master.connect(c.destination); }
    return true;
  }
  function note() {
    if (!running || !master || !ctx) return;
    const scale = night ? NIGHT : DAY;
    const f = scale[Math.floor(Math.random() * scale.length)];
    tone(f, 2.4, 'sine', 0.07, 0, master);
    if (Math.random() < 0.35) tone(f / 2, 3.2, 'triangle', 0.04, 0.05, master);
    if (Math.random() < 0.25) tone(scale[Math.floor(Math.random() * scale.length)] * 2, 1.4, 'sine', 0.025, 0.4, master);
    timer = window.setTimeout(note, (night ? 1500 : 1100) + Math.random() * 1800);
  }
  return {
    setEnabled(v: boolean) {
      if (v) {
        if (!ensure()) return;
        master!.gain.setTargetAtTime(0.5, ctx!.currentTime, 1.5);
        if (!running) { running = true; note(); }
      } else if (master && ctx) {
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
        running = false; clearTimeout(timer);
      }
    },
    setNight(v: boolean) { night = v; },
    /** quieter for a while (the adhan) */
    duck(secs: number) {
      if (!master || !ctx || !running) return;
      master.gain.setTargetAtTime(0.04, ctx.currentTime, 0.3);
      setTimeout(() => { if (running && master && ctx) master.gain.setTargetAtTime(0.5, ctx.currentTime, 1.5); }, secs * 1000);
    },
  };
})();

// ---- the bedug at prayer time ---------------------------------------------------
// Instead of a sung adhan: the bedug, the big drum of Indonesian masjids, beaten in
// the traditional "tabuh bedug" before the call to prayer. A few slow, heavy beats,
// a roll that speeds up, then strong beats to finish. Each strike is made in code
// like a real bedug: a deep buffalo-hide membrane (a booming low note that drops
// in pitch, with the overtones of a round drum head), the slap of the wooden
// stick, the hollow wooden shell, and the echo of the masjid's veranda.
let hall: { c: AudioContext; inp: GainNode } | null = null;
/** the masjid echo, built once */
function bedugHall(c: AudioContext): AudioNode {
  if (hall?.c === c) return hall.inp;
  const inp = c.createGain(), dry = c.createGain(), wet = c.createGain(), conv = c.createConvolver(), lp = c.createBiquadFilter();
  // a 2.2 s reverb tail from fading noise
  const len = Math.floor(c.sampleRate * 2.2), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  conv.buffer = ir; lp.type = 'lowpass'; lp.frequency.value = 1400;
  dry.gain.value = 0.72; wet.gain.value = 0.28;
  // a soft saturation adds the harmonics that let the low boom be heard on a phone's small speaker
  const sat = c.createWaveShaper(), curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 2.6) / Math.tanh(2.6); }
  sat.curve = curve;
  inp.connect(sat); sat.connect(dry); dry.connect(c.destination);
  sat.connect(conv); conv.connect(lp); lp.connect(wet); wet.connect(c.destination);
  hall = { c, inp };
  return inp;
}
let noiseBuf: AudioBuffer | null = null;
function noiseOf(c: AudioContext) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const n = Math.floor(c.sampleRate * 0.5); noiseBuf = c.createBuffer(1, n, c.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
/** one strike of the bedug at time t0, strength 0…1 */
export function bedugStrike(c: AudioContext, t0: number, v = 1) {
  const out = bedugHall(c);
  const f = 58 + (Math.random() - 0.5) * 3;   // the big drum's low note
  // the membrane: a fundamental that thumps in high and settles, plus the round head's overtones (1, 1.59, 2.14, 2.65, 3.16)
  for (const [ratio, gain, decay] of [[1, 0.5, 1.7], [1.59, 0.42, 0.85], [2.14, 0.3, 0.5], [2.65, 0.2, 0.32], [3.16, 0.12, 0.22]] as [number, number, number][]) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * ratio * 1.55, t0);
    o.frequency.exponentialRampToValueAtTime(f * ratio, t0 + 0.06);
    o.frequency.exponentialRampToValueAtTime(f * ratio * 0.94, t0 + decay);
    const pk = gain * v;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(pk, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay * (0.75 + v * 0.35));
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + decay * 1.2 + 0.05);
  }
  // the slap of the wooden stick on the hide
  const slap = c.createBufferSource(); slap.buffer = noiseOf(c);
  const sl = c.createBiquadFilter(); sl.type = 'lowpass'; sl.frequency.value = 1500 + v * 700;
  const sg = c.createGain(); sg.gain.setValueAtTime(0.42 * v, t0); sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
  slap.connect(sl); sl.connect(sg); sg.connect(out); slap.start(t0, Math.random() * 0.3); slap.stop(t0 + 0.07);
  // the hollow wooden shell ringing
  const shell = c.createBufferSource(); shell.buffer = noiseOf(c);
  for (const [fq, q, gn, dc] of [[150, 5, 1.3, 0.4], [310, 6, 0.55, 0.18]] as [number, number, number, number][]) {
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q;
    const hg = c.createGain(); hg.gain.setValueAtTime(gn * v, t0); hg.gain.exponentialRampToValueAtTime(0.0001, t0 + dc);
    shell.connect(bp); bp.connect(hg); hg.connect(out);
  }
  shell.start(t0, Math.random() * 0.1); shell.stop(t0 + 0.45);
}
/** the beat times of the tabuh bedug (seconds) with their strength */
export function bedugPattern(): [number, number][] {
  const out: [number, number][] = [];
  let t = 0;
  // three slow, heavy beats
  for (let i = 0; i < 3; i++) { out.push([t, 1]); t += 1.15; }
  // a roll that speeds up: from 0.7 s apart down to 0.13 s, getting softer
  let gap = 0.7;
  for (let i = 0; i < 22; i++) { out.push([t, Math.max(0.55, 0.95 - i * 0.018)]); t += gap; gap = Math.max(0.13, gap * 0.86); }
  t += 0.55;
  // and strong beats to finish: dug… dug… dug
  for (let i = 0; i < 3; i++) { out.push([t, 1]); t += i < 2 ? 0.8 : 0; }
  return out;
}
/** the bedug at prayer time; returns how long it lasts (0 if sound is off) */
export function adhan(): number {
  const c = actx(); if (!c || !audioState.sfx) return 0;
  const t0 = c.currentTime + 0.12, beats = bedugPattern();
  for (const [t, v] of beats) bedugStrike(c, t0 + t, v);
  const secs = beats[beats.length - 1][0] + 2.2;
  Music.duck(secs + 1);
  return secs;
}

// ---- speech ------------------------------------------------------------------
export const Speech = {
  voices: [] as SpeechSynthesisVoice[], ar: null as SpeechSynthesisVoice | null, id: null as SpeechSynthesisVoice | null,
  rate: 0.8, seq: 0,
  init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      this.voices = speechSynthesis.getVoices() || [];
      this.ar = this.voices.find(v => /^ar/i.test(v.lang)) || null;
      this.id = this.voices.find(v => /^id/i.test(v.lang)) || this.voices.find(v => /^ms/i.test(v.lang)) || null;
    };
    load(); speechSynthesis.onvoiceschanged = load; setTimeout(load, 800);
  },
  /** priority of what is speaking now: 0 Baby Mo chatter, 1 dialogs & 🔊 buttons, 2 letters / du'a */
  prio: -1, until: 0,
  busy(p: number) { return this.prio > p && performance.now() < this.until && ('speechSynthesis' in window) && speechSynthesis.speaking; },
  mark(p: number, text: string) { this.prio = p; this.until = performance.now() + 900 + text.length * 90; },
  /** stop speech; with a level, only stop what is at or below that level */
  stop(level = 9) { if (this.prio > level && performance.now() < this.until) return; this.seq++; this.prio = -1; try { speechSynthesis.cancel(); } catch { /* ignore */ } },
  /** Speak Arabic text if an Arabic voice exists, otherwise the Latin reading. */
  say(ar: string, latin: string) {
    if (!('speechSynthesis' in window)) return;
    this.stop();
    this.mark(2, latin);
    const u = new SpeechSynthesisUtterance(this.ar ? ar : latin);
    const v = this.ar || this.id;
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'ar-SA';
    u.rate = this.rate; u.pitch = 1.05;
    try { speechSynthesis.speak(u); } catch { /* ignore */ }
  },
  /** Speech in the UI language (Baby Mo talking). Uses a matching device voice; `force` tries any voice. */
  talk(text: string, lang: 'id' | 'en', force = false, prio = 0) {
    if (!('speechSynthesis' in window)) return;
    if (this.busy(prio)) return;   // never talk over a letter or du'a
    const v = lang === 'id' ? this.id : this.voices.find(x => /^en/i.test(x.lang)) || null;
    if (!v && !force) return;
    this.stop();
    const clean = text.replace(/<[^>]+>/g, ' ').replace(/[^\p{L}\p{N}\s,.!?'’-]/gu, '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    this.mark(prio, clean);
    const u = new SpeechSynthesisUtterance(clean);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = lang === 'id' ? 'id-ID' : 'en-US';
    u.rate = 0.95; u.pitch = 1.25;
    try { speechSynthesis.speak(u); } catch { /* ignore */ }
  },
};

/**
 * Letter pronunciation. If recorded files are added at
 * public/audio/hijaiyah/<index>.mp3 (0 = Alif … 27 = Ya) they are used;
 * otherwise the device's text-to-speech reads the letter.
 */
const recorded = new Map<string, boolean>();
export function playLetter(i: number, ar: string, latin: string, variant = '') {
  const file = `audio/hijaiyah/${i}${variant}.mp3`;
  if (recorded.get(file) === false) { Speech.say(ar, latin); return; }
  Speech.stop(); Speech.mark(2, latin);
  const a = new Audio(file);
  a.onerror = () => { recorded.set(file, false); Speech.say(ar, latin); };
  a.play().then(() => recorded.set(file, true)).catch(() => { recorded.set(file, false); Speech.say(ar, latin); });
}

/**
 * An ayah of a surah. If a recitation is added at public/audio/surah/<id>-<n>.mp3
 * (n from 1) it is played; otherwise the device reads it (Arabic voice if there is one).
 */
export function playAyah(id: string, n: number, ar: string, latin: string) {
  const file = `audio/surah/${id}-${n}.mp3`;
  if (recorded.get(file) === false) { Speech.say(ar, latin); return; }
  Speech.stop(); Speech.mark(2, latin);
  const a = new Audio(file);
  a.onerror = () => { recorded.set(file, false); Speech.say(ar, latin); };
  a.play().then(() => recorded.set(file, true)).catch(() => { recorded.set(file, false); Speech.say(ar, latin); });
}
