// A race track's shape: a "stadium" oval (two straights joined by two half
// circles), shared by the landmark that builds it and the race that runs on it.
// Coordinates are relative to the track's middle (x east, z south). The start
// line is the middle of the south straight; karts drive west from it, round the
// west bend, east along the north straight, and back round the east bend.
//
// There are three tracks: the big circuit (green fields), the Snow track (icy
// patches on the bends) and the Desert track (soft sand on the bends, long
// straights). Each has boost pads, mystery-box rows and a jump ramp.

export type TrackKind = 'main' | 'snow' | 'desert';
export interface Span { s: number; len: number }
/** a patch of ice (slippery) or soft sand (slow) across part of the track */
export interface Patch { s: number; len: number; lane0: number; lane1: number }
/** the coins on the track for a lap: little groups to count and add up */
export interface Coin { s: number; lane: number; group: number }

export class Track {
  readonly ARC: number;
  readonly LAP: number;
  readonly boosts: Span[];
  /** rows of mystery boxes (across the whole track) */
  readonly boxRows: number[];
  /** jump ramps (in the middle of a straight, across the track) */
  readonly ramps: Span[];
  /** ice (snow track) or sand (desert track) */
  readonly patches: Patch[];
  constructor(readonly half: number, readonly R: number, readonly W: number, readonly kind: TrackKind = 'main') {
    const ARC = this.ARC = Math.PI * R, H = half;
    this.LAP = 4 * H + 2 * ARC;
    const north = H + ARC, south = 3 * H + 2 * ARC; // where the north straight starts; the run back to the line
    this.boosts = kind === 'main'
      ? [{ s: 2 * H + ARC - 3, len: 5 }, { s: 4 * H + 2 * ARC - H / 2 - 2, len: 5 }] // (the big circuit's pads stay where they were)
      : [{ s: north + H + 4, len: 5 }, { s: south + H / 2 - 2, len: 5 }, { s: H * 0.45, len: 4 }];
    this.boxRows = [north + H * 0.55, south + 3, H * 0.75];
    this.ramps = [{ s: north + Math.max(H * 1.45, H + 10.5), len: 2 }]; // (after the north straight's boost pad: zoom, then fly!)
    // the hazards sit on the bends, leaving a clear line (the inside or the outside) to drive round them
    this.patches = kind === 'snow'
      ? [{ s: H + ARC * 0.25, len: ARC * 0.45, lane0: -0.5, lane1: W / 2 }, { s: 3 * H + ARC * 1.3, len: ARC * 0.45, lane0: -W / 2, lane1: 0.5 }, { s: north + H * 0.55 + 2.5, len: 6, lane0: -1.5, lane1: 1.5 }]
      : kind === 'desert'
        ? [{ s: H + ARC * 0.3, len: ARC * 0.4, lane0: -W / 2, lane1: 0.5 }, { s: 3 * H + ARC * 1.25, len: ARC * 0.5, lane0: -0.5, lane1: W / 2 }, { s: H * 0.2, len: 5, lane0: 1.2, lane1: W / 2 }]
        : [];
  }
  /** how far a point is from the centre line, sideways (+ towards the outside) */
  laneOf(dx: number, dz: number): number {
    const cx = Math.max(-this.half, Math.min(this.half, dx));
    return Math.hypot(dx - cx, dz) - this.R;
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
  coinPlan(lap: number): Coin[] {
    const sizes = lap % 2 ? [1, 2, 1, 3, 2, 2] : [2, 1, 3, 1, 2, 3];
    const lanes = lap % 2 ? [0, -2.4, 2.4, 0, 2.4, -2.4] : [2.4, 0, -2.4, 2.4, 0, -2.4];
    const out: Coin[] = [];
    sizes.forEach((n, gi) => {
      const s0 = this.LAP * (0.1 + gi * 0.15);
      for (let i = 0; i < n; i++) out.push({ s: s0 + i * 2.6, lane: lanes[gi], group: gi });
    });
    return out;
  }
  /** what a cell is, by its distance from the centre line: the track, the kerb, the tyre wall, or neither */
  cellKind(dx: number, dz: number): 'track' | 'kerb' | 'wall' | 'in' | 'out' {
    const d = this.laneOf(dx, dz), W = this.W;
    if (Math.abs(d) <= W / 2) return 'track';
    if (Math.abs(d) <= W / 2 + 1) return 'kerb';
    if (d > 0 && d <= W / 2 + 2) return 'wall';
    return d < 0 ? 'in' : 'out';
  }
  /** the point s metres after the start line, `lane` metres towards the outside, and the heading there (yaw: 0 faces +z) */
  pointAt(s: number, lane = 0): { x: number; z: number; yaw: number } {
    const { half: HALF, R, ARC, LAP } = this;
    s = ((s % LAP) + LAP) % LAP;
    const r = R + lane;
    if (s < HALF) return { x: -s, z: r, yaw: -Math.PI / 2 };                       // south straight, going west
    s -= HALF;
    if (s < ARC) { const t = s / R; return { x: -HALF - r * Math.sin(t), z: r * Math.cos(t), yaw: Math.atan2(-Math.cos(t), -Math.sin(t)) }; } // west bend
    s -= ARC;
    if (s < 2 * HALF) return { x: -HALF + s, z: -r, yaw: Math.PI / 2 };            // north straight, going east
    s -= 2 * HALF;
    if (s < ARC) { const t = s / R; return { x: HALF + r * Math.sin(t), z: -r * Math.cos(t), yaw: Math.atan2(Math.cos(t), Math.sin(t)) }; } // east bend
    s -= ARC;
    return { x: HALF - s, z: r, yaw: -Math.PI / 2 };                                // back along the south straight to the line
  }
  /** how far along the lap a point is (0 … LAP), measured on the centre line */
  progressOf(dx: number, dz: number): number {
    const { half: HALF, R, ARC, LAP } = this;
    if (dx <= -HALF) { const vx = dx + HALF; return HALF + Math.atan2(-vx, dz) * R; }
    if (dx >= HALF) { const vx = dx - HALF; return 3 * HALF + ARC + Math.atan2(vx, -dz) * R; }
    if (dz > 0) return dx <= 0 ? -dx : LAP - dx;
    return HALF + ARC + (dx + HALF);
  }
}

/** the three tracks: the big circuit, the Snow track (round, tight bends) and the Desert track (long straights) */
export const TRACKS: Record<TrackKind, Track> = {
  main: new Track(26, 14, 9, 'main'),
  snow: new Track(16, 15, 9, 'snow'),
  desert: new Track(32, 11, 9, 'desert'),
};

// the big circuit, as before (the landmark that builds it and the tests use these)
const MAIN = TRACKS.main;
/** half the straight's length, the bends' radius and the track's width (the big circuit) */
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
/** laps for each track: about a minute of racing on each */
export const LAPS_FOR: Record<TrackKind, number> = { main: 4, snow: 5, desert: 4 };
/**
 * The four letters for race number k: race 0 is ا ب ت ث, race 1 is ج ح خ د … and after ي it starts
 * again from ا. `n` is how many letters are open (28 with Full BabyMo Craft, 7 in the free part).
 */
export function letterSet(k: number, n = 28): number[] {
  return [0, 1, 2, 3].map(j => (((k * 4 + j) % n) + n) % n);
}
/**
 * Where the letters lie on one lap: `count` spots spread round the lap (a little randomness
 * so they're never in the same places twice), each one of the four letters in turn, and never
 * on the start line, a row of mystery boxes or the jump ramp. `rnd` gives numbers 0…1.
 */
export function letterSpots(tk: Track, count: number, rnd: () => number): { s: number; lane: number; slot: number }[] {
  const out: { s: number; lane: number; slot: number }[] = [];
  const clear = (s: number) => s > 6 && s < tk.LAP - 4 && !tk.boxRows.some(b => Math.abs(b - s) < 3.5) && !tk.ramps.some(r => s > r.s - 3 && s < r.s + r.len + 3);
  const step = tk.LAP / count;
  for (let i = 0; i < count; i++) {
    for (let tries = 0; tries < 12; tries++) {
      const s = i * step + (0.15 + rnd() * 0.7) * step;
      if (!clear(s)) continue;
      out.push({ s, lane: Math.round((rnd() * 6 - 3) * 10) / 10, slot: out.length % 4 });
      break;
    }
  }
  return out;
}
