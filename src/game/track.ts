// A race track's shape, shared by the landmark that builds it and the race that runs on it.
// Each track is laid out like a real circuit, from straights and bends of a set radius (a sweeper,
// a hairpin, a chicane, a kink before the line…), so it no longer feels like going round an oval.
// Coordinates are relative to the track's middle (x east, z south). The start line is on the
// south side at x = 0; karts drive west from it and go round clockwise (seen from above, north up).
//
// There are three tracks: the big circuit (green fields), the Snow track (icy patches) and the
// Desert track (soft sand, long straights). Each has boost pads, mystery-box rows and a jump ramp.

export type TrackKind = 'main' | 'snow' | 'desert';
export interface Span { s: number; len: number }
/** a patch of ice (slippery) or soft sand (slow) across part of the track */
export interface Patch { s: number; len: number; lane0: number; lane1: number }
/** the coins on the track for a lap: little groups to count and add up */
export interface Coin { s: number; lane: number; group: number }
/** a hijaiyah letter on the track: which of the race's four letters (`slot`) */
export interface LetterSpot { s: number; lane: number; slot: number }

/**
 * One piece of a track: a straight (`line` metres; null = worked out so the lap closes up)
 * or a bend (`r` radius in metres, `deg` degrees: + turns right, − turns left).
 * A `name` lets the track put things on that piece.
 */
export type Piece = ({ line: number | null } | { r: number; deg: number }) & { name?: string };

/** a piece placed in the world: where it starts along the lap, and its exact geometry */
interface Part {
  name?: string; s: number; len: number;
  /** start point and heading (th: 0 = east, π/2 = south) */
  x: number; z: number; th: number;
  /** bends only: the centre, the radius, the start angle round the centre and the signed turn */
  arc?: { cx: number; cz: number; r: number; a0: number; a: number };
}

/** lay the pieces end to end from the start line (heading west); `free` fills the open straights */
function layPieces(start: [number, number], pieces: Piece[], free: number[]): { parts: Part[]; end: [number, number] } {
  let x = start[0], z = start[1], th = Math.PI, s = 0, k = 0;
  const parts: Part[] = [];
  for (const p of pieces) {
    if ('line' in p) {
      const len = p.line ?? free[k++];
      parts.push({ name: p.name, s, len, x, z, th });
      x += Math.cos(th) * len; z += Math.sin(th) * len; s += len;
    } else {
      const a = (p.deg * Math.PI) / 180, side = Math.sign(a);
      const cx = x - Math.sin(th) * p.r * side, cz = z + Math.cos(th) * p.r * side, a0 = Math.atan2(z - cz, x - cx);
      const len = Math.abs(a) * p.r;
      parts.push({ name: p.name, s, len, x, z, th, arc: { cx, cz, r: p.r, a0, a } });
      x = cx + Math.cos(a0 + a) * p.r; z = cz + Math.sin(a0 + a) * p.r; th += a; s += len;
    }
  }
  return { parts, end: [x, z] };
}

export class Track {
  readonly LAP: number;
  readonly boosts: Span[];
  /** rows of mystery boxes (across the whole track) */
  readonly boxRows: number[];
  /** jump ramps (on a straight, across the track) */
  readonly ramps: Span[];
  /** ice (snow track) or sand (desert track) */
  readonly patches: Patch[];
  /** where the arches over the track stand, and the lanterns round the inside of a bend */
  readonly arches: number[];
  readonly lanterns: number[];
  /** the desert's tumbleweeds: where they roll across */
  readonly weeds: number[];
  private parts: Part[];
  /** the letters and the coin groups on a lap, spread out so only one thing happens at a time */
  private plan: { letters: number[]; coins: number[] };
  /**
   * `half` and `R` give the size of the ground the track is built on (unchanged since the first
   * ovals, so nothing else in the world moves); `W` is the track's width.
   */
  constructor(readonly half: number, readonly R: number, readonly W: number, readonly kind: TrackKind, pieces: Piece[]) {
    // the two open straights are worked out so the lap ends exactly where it began (the end point is linear in their lengths)
    const start: [number, number] = [0, R];
    const e0 = layPieces(start, pieces, [0, 0]).end, ea = layPieces(start, pieces, [1, 0]).end, eb = layPieces(start, pieces, [0, 1]).end;
    const ax = ea[0] - e0[0], az = ea[1] - e0[1], bx = eb[0] - e0[0], bz = eb[1] - e0[1], rx = start[0] - e0[0], rz = start[1] - e0[1];
    const det = ax * bz - az * bx;
    const free = [(rx * bz - rz * bx) / det, (ax * rz - az * rx) / det];
    this.parts = layPieces(start, pieces, free).parts;
    const last = this.parts[this.parts.length - 1];
    this.LAP = last.s + last.len;
    const on = (name: string, at: number) => { const p = this.part(name); return p.s + (at <= 1 ? at * p.len : at); };
    const W2 = W / 2;
    if (kind === 'main') {
      this.boosts = [{ s: on('exit', 0.5), len: 5 }, { s: on('home', 3), len: 5 }];
      this.boxRows = [on('start', 14), on('east', 0.5)];
      this.ramps = [{ s: on('back', 0.5) - 1, len: 2 }];
      this.patches = [];
      // five rainbow arches through the chicane, and lanterns round the inside of the long sweeper
      const c = this.part('chic1'), b = this.part('back');
      this.arches = [0, 1, 2, 3, 4].map(i => c.s + 2 + (i * (b.s + b.len - 2 - c.s - 2)) / 4);
      this.lanterns = [0, 1, 2, 3, 4, 5, 6].map(i => on('sweep', i / 6));
      this.weeds = [];
    } else if (kind === 'snow') {
      this.boosts = [{ s: on('back', 4), len: 5 }, { s: on('home', 8), len: 5 }];
      this.boxRows = [on('start', 8), on('back', 26)];
      this.ramps = [{ s: on('back', 18), len: 2 }];
      // ice on the outside of the hairpin and the inside of the east bend, and a little rink on the back straight
      const h = this.part('hairpin'), e = this.part('east');
      this.patches = [
        { s: h.s + h.len * 0.25, len: h.len * 0.5, lane0: -0.5, lane1: W2 },
        { s: e.s + e.len * 0.2, len: e.len * 0.55, lane0: -W2, lane1: 0.5 },
        { s: on('back', 11), len: 5, lane0: -1.5, lane1: 1.5 },
      ];
      this.arches = [0.2, 0.45, 0.82].map(f => on('back', f));
      this.lanterns = [];
      this.weeds = [];
    } else {
      this.boosts = [{ s: on('back', 6), len: 5 }, { s: on('home', 4), len: 5 }, { s: on('start', 12), len: 4 }];
      this.boxRows = [on('start', 20), on('back', 20)];
      this.ramps = [{ s: on('back', 31), len: 2 }];
      // soft sand on the inside of the hairpin's second half and the outside of the first east bend, and a drift by the start straight
      const t = this.part('turn2'), e = this.part('east1');
      this.patches = [
        { s: t.s + t.len * 0.25, len: t.len * 0.5, lane0: -W2, lane1: 0.5 },
        { s: e.s + e.len * 0.2, len: e.len * 0.55, lane0: -0.5, lane1: W2 },
        { s: on('start', 24), len: 5, lane0: 1.2, lane1: W2 },
      ];
      this.arches = [0.12, 0.36, 0.6, 0.86].map(f => on('back', f));
      this.lanterns = [];
      this.weeds = [on('start', 7), on('back', 12), on('back', 38)];
    }
    this.plan = this.spread();
  }
  /** a named piece of the track */
  part(name: string): { s: number; len: number } {
    const p = this.parts.find(q => q.name === name);
    if (!p) throw new Error(`no track part ${name}`);
    return { s: p.s, len: p.len };
  }
  /**
   * Where the letters and coins go on a lap: six spots, each as far as it can be from the mystery
   * boxes and from each other (so a child meets one thing at a time), off the start, the ramp and
   * the ice or sand. Four of them are the race's four letters, two are coin groups.
   */
  private spread() {
    const L = this.LAP, gap = (a: number, b: number) => { const d = Math.abs(a - b) % L; return Math.min(d, L - d); };
    const blocked = (s: number, len: number) => {
      for (let d = 0; d <= len; d += 0.5) {
        const q = s + d;
        if (q < 9 || q > L - 6) return true;
        if (this.boxRows.some(b => gap(b, q) < 6)) return true;
        if (this.ramps.some(r => q > r.s - 4 && q < r.s + r.len + 4)) return true;
        if (this.patches.some(p => q > p.s - 1.5 && q < p.s + p.len + 1.5)) return true;
      }
      return false;
    };
    // each new spot goes where it's furthest from everything already there; `own` keeps the letters apart from each other too
    const taken = [...this.boxRows];
    const pick = (n: number, own: number[]) => {
      const out: number[] = [];
      for (let k = 0; k < n; k++) {
        let best = -1, bestGap = -1;
        for (let s = 0; s < L; s += 0.5) {
          if (blocked(s, 5)) continue;
          const g = Math.min(...taken.map(t => gap(t, s)), ...own.map(t => 0.6 * gap(t, s)));
          if (g > bestGap) { bestGap = g; best = s; }
        }
        if (best < 0) break;
        taken.push(best); own.push(best); out.push(best);
      }
      return out.sort((a, b) => a - b);
    };
    // the four letters first, spread round the whole lap; then the two coin groups in the biggest gaps left
    const letters = pick(4, []), coins = pick(2, []);
    return { letters, coins };
  }
  /** this lap's letters: the race's four letters once each, near the middle of the track (easy to drive through) */
  letterSpots(lap: number): LetterSpot[] {
    const lanes = [[0, -1.6, 1.6, 0], [1.6, 0, -1.6, 1.2], [-1.2, 1.6, 0, -1.6]][((lap % 3) + 3) % 3];
    return this.plan.letters.map((s, i) => ({ s: s + 2, lane: lanes[i % 4], slot: i % 4 }));
  }
  /** this lap's coins: two small groups to count and add up */
  coinPlan(lap: number): Coin[] {
    const sizes = lap % 2 ? [2, 3] : [3, 1], lanes = lap % 2 ? [-2, 2] : [2, -2];
    const out: Coin[] = [];
    this.plan.coins.forEach((s0, gi) => { for (let i = 0; i < sizes[gi]; i++) out.push({ s: s0 + i * 2.5, lane: lanes[gi], group: gi }); });
    return out;
  }
  private inSpan(list: Span[], s: number) { s = ((s % this.LAP) + this.LAP) % this.LAP; return list.some(b => s >= b.s && s <= b.s + b.len); }
  /** is this spot on a boost pad? (pads cover the middle of the track) */
  onBoost(s: number, lane: number) { return Math.abs(lane) <= 2.2 && this.inSpan(this.boosts, s); }
  /** is this spot on a jump ramp? */
  onRamp(s: number, lane: number) { return Math.abs(lane) <= this.W / 2 && this.inSpan(this.ramps, s); }
  /** the ice or sand patch here, if any */
  patchAt(s: number, lane: number): Patch | null {
    s = ((s % this.LAP) + this.LAP) % this.LAP;
    return this.patches.find(p => s >= p.s && s <= p.s + p.len && lane >= p.lane0 && lane <= p.lane1) ?? null;
  }
  /** what a cell is, by its distance from the centre line: the track, the kerb, the tyre wall (outside only), or neither */
  cellKind(dx: number, dz: number): 'track' | 'kerb' | 'wall' | 'in' | 'out' {
    const d = this.laneOf(dx, dz), W = this.W;
    if (Math.abs(d) <= W / 2) return 'track';
    if (Math.abs(d) <= W / 2 + 1) return 'kerb';
    if (d > 0 && d <= W / 2 + 2) return 'wall';
    return d < 0 ? 'in' : 'out';
  }
  /** the point s metres after the start line, `lane` metres towards the outside, and the heading there (yaw: 0 faces +z) */
  pointAt(s: number, lane = 0): { x: number; z: number; yaw: number } {
    s = ((s % this.LAP) + this.LAP) % this.LAP;
    let p = this.parts[this.parts.length - 1];
    for (const q of this.parts) if (s < q.s + q.len) { p = q; break; }
    const u = Math.min(p.len, s - p.s);
    let x: number, z: number, th: number;
    if (!p.arc) { th = p.th; x = p.x + Math.cos(th) * u; z = p.z + Math.sin(th) * u; }
    else { const { cx, cz, r, a0, a } = p.arc, t = a0 + Math.sign(a) * (u / r); x = cx + Math.cos(t) * r; z = cz + Math.sin(t) * r; th = p.th + Math.sign(a) * (u / r); }
    // the outside is on the left of the way the karts drive
    return { x: x + Math.sin(th) * lane, z: z - Math.cos(th) * lane, yaw: Math.PI / 2 - th };
  }
  /** the nearest point on the centre line: how far along the lap (0 … LAP), and how far to the side (+ outside) */
  private locate(dx: number, dz: number): { s: number; lane: number } {
    if (this.last && this.last.dx === dx && this.last.dz === dz) return this.last.at;
    let best = Infinity, at = { s: 0, lane: 0 };
    for (const p of this.parts) {
      let u: number, qx: number, qz: number, th: number;
      if (!p.arc) {
        const tx = Math.cos(p.th), tz = Math.sin(p.th);
        u = Math.max(0, Math.min(p.len, (dx - p.x) * tx + (dz - p.z) * tz));
        qx = p.x + tx * u; qz = p.z + tz * u; th = p.th;
      } else {
        const { cx, cz, r, a0, a } = p.arc, side = Math.sign(a), full = Math.abs(a);
        // how far round the bend the point is (in its turning direction), kept to the bend's ends
        let d = (side * (Math.atan2(dz - cz, dx - cx) - a0)) % (Math.PI * 2); if (d < 0) d += Math.PI * 2;
        if (d > full) d = d - full < Math.PI * 2 - d ? full : 0;
        u = d * r; const t = a0 + side * d; qx = cx + Math.cos(t) * r; qz = cz + Math.sin(t) * r; th = p.th + side * d;
      }
      const ex = dx - qx, ez = dz - qz, dist = ex * ex + ez * ez;
      if (dist < best) { best = dist; at = { s: p.s + u, lane: ex * Math.sin(th) - ez * Math.cos(th) }; }
    }
    if (at.s >= this.LAP) at.s -= this.LAP;
    // the side of the nearest point says inside or outside; its distance says how far
    at.lane = Math.sign(at.lane || 1) * Math.sqrt(best);
    this.last = { dx, dz, at };
    return at;
  }
  private last: { dx: number; dz: number; at: { s: number; lane: number } } | null = null;
  /** how far a point is from the centre line, sideways (+ towards the outside) */
  laneOf(dx: number, dz: number): number { return this.locate(dx, dz).lane; }
  /** how far along the lap a point is (0 … LAP), measured on the centre line */
  progressOf(dx: number, dz: number): number { return this.locate(dx, dz).s; }
}

/** the three tracks: the big circuit, the Snow track and the Desert track (each about 170–200 m a lap) */
export const TRACKS: Record<TrackKind, Track> = {
  // the start straight, a sweeper into the hairpin, the rainbow chicane, a kink up into the long right-hander, and a kink before the line
  main: new Track(26, 14, 9, 'main', [
    { line: 24, name: 'start' }, { r: 12, deg: 60, name: 'turn1' }, { line: 8 }, { r: 10, deg: 120, name: 'hairpin' }, { line: 6, name: 'exit' },
    { r: 14, deg: 35, name: 'chic1' }, { r: 14, deg: -70, name: 'chic2' }, { r: 14, deg: 35, name: 'chic3' }, { line: null, name: 'back' },
    { r: 16, deg: -25, name: 'kink' }, { line: 2 }, { r: 10, deg: 115, name: 'sweep' }, { line: null, name: 'east' }, { r: 11, deg: 90, name: 'final' },
    { line: 4 }, { r: 22, deg: -18 }, { r: 22, deg: 18 }, { line: 12, name: 'home' },
  ]),
  // a left flick into an icy hairpin, the back straight with its jump, the esses, and a two-part final bend
  snow: new Track(16, 15, 9, 'snow', [
    { line: 12, name: 'start' }, { r: 11, deg: 75, name: 'turn1' }, { r: 12, deg: -35, name: 'flick' }, { line: 3 }, { r: 9, deg: 140, name: 'hairpin' },
    { line: null, name: 'back' }, { r: 12, deg: 30, name: 'esses1' }, { r: 12, deg: -30, name: 'esses2' }, { line: 4 }, { r: 10, deg: 95, name: 'east' },
    { line: null, name: 'east2' }, { r: 13, deg: 85, name: 'final' }, { line: 20, name: 'home' },
  ]),
  // long straights through the dunes: a hairpin, a kink on the long back straight, two quick bends and a kink before the line
  desert: new Track(32, 11, 9, 'desert', [
    { line: 30, name: 'start' }, { r: 10, deg: 90, name: 'turn1' }, { line: 3 }, { r: 10, deg: 90, name: 'turn2' }, { line: 6 },
    { r: 16, deg: 25, name: 'kink1' }, { r: 16, deg: -25, name: 'kink2' }, { line: null, name: 'back' }, { r: 9, deg: 90, name: 'east1' },
    { line: null, name: 'east' }, { r: 9, deg: 90, name: 'east2' }, { line: 6 }, { r: 20, deg: 20 }, { r: 20, deg: -20 }, { line: 14, name: 'home' },
  ]),
};

// the big circuit (the landmark that builds it and the tests use these)
const MAIN = TRACKS.main;
/** half the ground's length, its depth and the track's width (the big circuit) */
export const TRACK = { half: MAIN.half, R: MAIN.R, W: MAIN.W };
export const LAP = MAIN.LAP;
export const BOOSTS = MAIN.boosts;
export const laneOf = (dx: number, dz: number) => MAIN.laneOf(dx, dz);
export const onBoost = (s: number, lane: number) => MAIN.onBoost(s, lane);
export const coinPlan = (lap: number) => MAIN.coinPlan(lap);
export const cellKind = (dx: number, dz: number) => MAIN.cellKind(dx, dz);
export const pointAt = (s: number, lane = 0) => MAIN.pointAt(s, lane);
export const progressOf = (dx: number, dz: number) => MAIN.progressOf(dx, dz);

/** the finishing order: further along (laps and metres) is ahead */
export function ranking(progress: number[]): number[] {
  return progress.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
}

// ---------- mystery boxes ----------
export type PowerUp = 'rocket' | 'star' | 'shield' | 'magnet' | 'banana';
export const POWER_ICON: Record<PowerUp, string> = { rocket: '🚀', star: '⭐', shield: '🫧', magnet: '🧲', banana: '🍌' };
export const POWER_NAME: Record<PowerUp, [string, string]> = {
  rocket: ['Roket turbo', 'Rocket boost'], star: ['Kekuatan bintang', 'Star power'], shield: ['Gelembung pelindung', 'Bubble shield'],
  magnet: ['Magnet koin', 'Coin magnet'], banana: ['Kulit pisang', 'Banana peel'],
};
/**
 * What a mystery box gives: drivers further back get the speedier things more often, so a child who
 * falls behind can catch up (place 1 = in front, of = how many karts). `r` is a random number 0…1.
 */
export function rollPower(place: number, of: number, r: number): PowerUp {
  const back = of > 1 ? (place - 1) / (of - 1) : 0; // 0 in front … 1 last
  const w: [PowerUp, number][] = [
    ['banana', 3 - 2.5 * back], ['magnet', 2.5], ['shield', 2], ['rocket', 1.5 + 3 * back], ['star', 0.4 + 2.6 * back],
  ];
  const sum = w.reduce((a, [, x]) => a + x, 0);
  let t = r * sum;
  for (const [p, x] of w) { if ((t -= x) < 0) return p; }
  return w[w.length - 1][0];
}

// ---------- hijaiyah letters on the track ----------
/** laps for each track: a race of about 45 seconds (fewer laps, so it doesn't feel like going round and round) */
export const LAPS_FOR: Record<TrackKind, number> = { main: 3, snow: 4, desert: 3 };
/**
 * The four letters for race number k: race 0 is ا ب ت ث, race 1 is ج ح خ د … and after ي it starts
 * again from ا. `n` is how many letters are open (28 with Full BabyMo Craft, 7 in the free part).
 */
export function letterSet(k: number, n = 28): number[] {
  return [0, 1, 2, 3].map(j => (((k * 4 + j) % n) + n) % n);
}
/** where the letters lie on a lap: each of the race's four letters once, well apart */
export function letterSpots(tk: Track, lap: number): LetterSpot[] { return tk.letterSpots(lap); }
