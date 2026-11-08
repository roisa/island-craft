// The race track's shape: a "stadium" oval (two straights joined by two
// half circles), the same for the landmark that builds it and the race that
// runs on it. Coordinates are relative to the track's middle (x east, z
// south). The start line is the middle of the south straight; karts drive
// west from it, round the west bend, east along the north straight, and
// back round the east bend.
export const TRACK = { half: 18, R: 11, W: 7 };
const { half: HALF, R } = TRACK;
const ARC = Math.PI * R;
export const LAP = 4 * HALF + 2 * ARC;

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
