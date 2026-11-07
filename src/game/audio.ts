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
function noise(dur: number, peak: number, freq = 900, delay = 0) {
  const c = actx(); if (!c) return;
  const n = Math.max(1, Math.round(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = c.createGain(); g.gain.value = peak;
  s.connect(f); f.connect(g); g.connect(c.destination);
  s.start(c.currentTime + delay);
}

const on = () => audioState.sfx;
export const SFX = {
  warm() { actx(); },
  hit(soft = false) { if (on()) noise(0.06, soft ? 0.08 : 0.12, soft ? 1400 : 700); },
  breakBlock() { if (on()) { noise(0.14, 0.2, 800); tone(180, 0.08, 'triangle', 0.06); } },
  place() { if (on()) { tone(300, 0.07, 'square', 0.07); tone(450, 0.06, 'square', 0.05, 0.03); } },
  pickup() { if (on()) { tone(880, 0.06, 'sine', 0.08); tone(1320, 0.08, 'sine', 0.06, 0.04); } },
  jump() { if (on()) tone(420, 0.1, 'triangle', 0.06); },
  step() { if (on()) noise(0.04, 0.035, 500); },
  splash() { if (on()) noise(0.25, 0.12, 1800); },
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
  };
})();

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
  stop() { this.seq++; try { speechSynthesis.cancel(); } catch { /* ignore */ } },
  /** Speak Arabic text if an Arabic voice exists, otherwise the Latin reading. */
  say(ar: string, latin: string) {
    if (!('speechSynthesis' in window)) return;
    this.stop();
    const u = new SpeechSynthesisUtterance(this.ar ? ar : latin);
    const v = this.ar || this.id;
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'ar-SA';
    u.rate = this.rate; u.pitch = 1.05;
    try { speechSynthesis.speak(u); } catch { /* ignore */ }
  },
  /** Speech in the UI language (Baby Mo talking). Uses a matching device voice; `force` tries any voice. */
  talk(text: string, lang: 'id' | 'en', force = false) {
    if (!('speechSynthesis' in window)) return;
    const v = lang === 'id' ? this.id : this.voices.find(x => /^en/i.test(x.lang)) || null;
    if (!v && !force) return;
    this.stop();
    const clean = text.replace(/<[^>]+>/g, ' ').replace(/[^\p{L}\p{N}\s,.!?'’-]/gu, '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
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
  const a = new Audio(file);
  a.onerror = () => { recorded.set(file, false); Speech.say(ar, latin); };
  a.play().then(() => recorded.set(file, true)).catch(() => { recorded.set(file, false); Speech.say(ar, latin); });
}
