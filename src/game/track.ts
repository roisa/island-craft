// The race track's shape: a "stadium" oval (two straights joined by two
// half circles), the same for the landmark that builds it and the race that
// runs on it. Coordinates are relative to the track's middle (x east, z
// south). The start line is the middle of the south straight; karts drive
// west from it, round the west bend, east along the north straight, and
// back round the east bend.
/** half the straight's length, the bends' radius and the track's width (the big circuit) */
export const TRACK = { half: 26, R: 14, W: 9 };
const { half: HALF, R } = TRACK;
const ARC = Math.PI * R;
export const LAP = 4 * HALF + 2 * ARC;

/** how far a point is from the centre line, sideways (+ towards the outside) */
export function laneOf(dx: number, dz: number): number {
  const cx = Math.max(-HALF, Math.min(HALF, dx));
  return Math.hypot(dx - cx, dz) - R;
}

/** the boost pads: where they start along the lap (s), and how long they are */
export const BOOSTS: { s: number; len: number }[] = [
  { s: 2 * HALF + ARC - 3, len: 5 },             // the middle of the north straight
  { s: 4 * HALF + 2 * ARC - HALF / 2 - 2, len: 5 }, // the run back to the line on the south straight
];
/** is this spot on a boost pad? (pads cover the middle of the track) */
export function onBoost(s: number, lane: number) {
  if (Math.abs(lane) > 2.2) return false;
  return BOOSTS.some(b => s >= b.s && s <= b.s + b.len);
}

/** the coins on the track for a lap: little groups to count and add up */
export interface Coin { s: number; lane: number; group: number }
export function coinPlan(lap: number): Coin[] {
  const sizes = lap % 2 ? [1, 2, 1, 3, 2, 2] : [2, 1, 3, 1, 2, 3];
  const lanes = lap % 2 ? [0, -2.4, 2.4, 0, 2.4, -2.4] : [2.4, 0, -2.4, 2.4, 0, -2.4];
  const out: Coin[] = [];
  sizes.forEach((n, gi) => {
    const s0 = LAP * (0.1 + gi * 0.15);
    for (let i = 0; i < n; i++) out.push({ s: s0 + i * 2.6, lane: lanes[gi], group: gi });
  });
  return out;
}

/** what a cell is, by its distance from the centre line: the track, the kerb, the tyre wall, or neither */
export function cellKind(dx: number, dz: number): 'track' | 'kerb' | 'wall' | 'in' | 'out' {
  const cx = Math.max(-HALF, Math.min(HALF, dx)), d = Math.hypot(dx - cx, dz) - R;
  if (Math.abs(d) <= TRACK.W / 2) return 'track';
  if (Math.abs(d) <= TRACK.W / 2 + 1) return 'kerb';
  if (d > 0 && d <= TRACK.W / 2 + 2) return 'wall';
  return d < 0 ? 'in' : 'out';
}

/** the point s metres after the start line, `lane` metres towards the outside, and the heading there (yaw: 0 faces +z) */
export function pointAt(s: number, lane = 0): { x: number; z: number; yaw: number } {
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
export function progressOf(dx: number, dz: number): number {
  if (dx <= -HALF) { const vx = dx + HALF; return HALF + Math.atan2(-vx, dz) * R; }
  if (dx >= HALF) { const vx = dx - HALF; return 3 * HALF + ARC + Math.atan2(vx, -dz) * R; }
  if (dz > 0) return dx <= 0 ? -dx : LAP - dx;
  return HALF + ARC + (dx + HALF);
}

/** the finishing order: further along (laps and metres) is ahead */
export function ranking(progress: number[]): number[] {
  return progress.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
}
