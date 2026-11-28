// The grown-ups check: a multiplication a young child can't do in their head.
/** 12–19 × 6–9, answers 72–171 */
export function adultSum(r = Math.random) {
  const a = 12 + Math.floor(r() * 8), b = 6 + Math.floor(r() * 4);
  return { a, b, ans: a * b };
}
