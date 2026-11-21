// The tennis court's measurements, in blocks from its middle (1 block ≈ 1 m),
// shared by the landmark that builds it and the game played on it. Close to a
// real court (23.8 m × 11 m, singles 8.2 m wide, service line 6.4 m from the
// net), rounded to whole blocks.
export const COURT = {
  /** baseline: this many blocks from the net */
  half: 12,
  /** singles sideline */
  singles: 4,
  /** doubles sideline (the tramlines are between the two) */
  doubles: 6,
  /** service line, from the net */
  service: 6,
};

/** what a court cell is: a white line, the blue court, or the green outside */
export function courtCell(dx: number, dz: number): 'line' | 'court' | 'out' {
  const ax = Math.abs(dx), az = Math.abs(dz), { half, singles, doubles, service } = COURT;
  if (ax > doubles || az > half) return 'out';
  if (az === half || ax === doubles || ax === singles) return 'line';            // baselines and both sidelines
  if (az === service && ax <= singles) return 'line';                             // service lines
  if (dx === 0 && (az <= service || az === half - 1)) return 'line';              // centre service line, centre marks
  return 'court';
}
