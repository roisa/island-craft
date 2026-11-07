// Save format, migrations and repair. Pure functions (no DOM, no IndexedDB)
// so every rule here is unit tested in tests/unit/persist.test.ts.
//
// Versions
//   1  V1 game: { v:1, seed, hour, day, lang, player, inv, stats, questsDone, claimed, saplings, settings }
//   2  V2: adds `savedAt` (ms) and `saves` (count). Old flags in `settings`
//      (outfitV2/outfitV3) are kept: they still drive one-time outfit updates.
//
// To add version 3: write `migrate2to3`, add it to MIGRATIONS, bump SAVE_VERSION.

export const SAVE_VERSION = 2;

export interface SavedPlayer { x: number; y: number; z: number; yaw: number; pitch: number; flying: boolean }
export interface SaveMeta {
  v: number; seed: number; hour: number; day: number; lang?: 'id' | 'en';
  player?: SavedPlayer; inv?: { slots?: unknown[]; sel?: number };
  stats?: Record<string, unknown>; questsDone: string[]; claimed: number[];
  saplings: unknown[]; settings: Record<string, unknown>;
  savedAt: number; saves: number;
}
export type Edits = Record<string, number[]>;

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

type Migration = (m: Record<string, unknown>) => Record<string, unknown>;
const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2: only new bookkeeping fields; nothing is renamed or dropped.
  1: m => ({ ...m, v: 2, savedAt: num(m.savedAt) ? m.savedAt : 0, saves: num(m.saves) ? m.saves : 0 }),
};

export interface LoadResult {
  meta: SaveMeta | null;
  /** version found in storage (0 when missing or not a save) */
  from: number;
  /** what had to be fixed, for the log and the tests */
  repaired: string[];
  /** a reason when the save could not be used at all */
  error?: string;
}

/** Bring any stored meta up to the current version and repair bad fields. */
export function loadMeta(raw: unknown): LoadResult {
  if (raw === undefined || raw === null) return { meta: null, from: 0, repaired: [] };
  if (!obj(raw)) return { meta: null, from: 0, repaired: [], error: 'not an object' };
  if (!num(raw.seed)) return { meta: null, from: num(raw.v) ? raw.v : 0, repaired: [], error: 'no world seed' };
  const from = num(raw.v) && raw.v >= 1 ? Math.floor(raw.v) : 1; // V1 saves before the field existed count as v1
  if (from > SAVE_VERSION) return { meta: null, from, repaired: [], error: `made by a newer version (v${from})` };
  let m: Record<string, unknown> = { ...raw, v: from };
  for (let v = from; v < SAVE_VERSION; v++) m = MIGRATIONS[v](m);
  const repaired: string[] = [];
  const fix = (what: string) => repaired.push(what);

  if (!num(m.hour) || m.hour < 0 || m.hour >= 24) { fix('hour'); m.hour = 7.5; }
  if (!num(m.day) || m.day < 1) { fix('day'); m.day = 1; } else m.day = Math.floor(m.day as number);
  if (m.lang !== 'id' && m.lang !== 'en') { if (m.lang !== undefined) fix('lang'); delete m.lang; }
  if (m.player !== undefined) {
    const p = m.player as Record<string, unknown>;
    const ok = obj(p) && num(p.x) && num(p.y) && num(p.z) && Math.abs(p.x) < 1e6 && Math.abs(p.z) < 1e6 && p.y > -64 && p.y < 400;
    if (!ok) { fix('player'); delete m.player; }
    else m.player = { x: p.x, y: p.y, z: p.z, yaw: num(p.yaw) ? p.yaw : 0, pitch: num(p.pitch) ? Math.max(-1.55, Math.min(1.55, p.pitch)) : 0, flying: !!p.flying };
  }
  if (m.inv !== undefined) {
    const inv = m.inv as Record<string, unknown>;
    if (!obj(inv) || !Array.isArray(inv.slots)) { fix('inv'); delete m.inv; }
    else {
      const slots = inv.slots.map(s => (obj(s) && num(s.id) && num(s.n) && s.n > 0 ? { id: Math.floor(s.id), n: Math.floor(s.n) } : null));
      if (slots.some((s, i) => s === null && inv.slots && (inv.slots as unknown[])[i] !== null)) fix('inv slots');
      const sel = num(inv.sel) && inv.sel >= 0 && inv.sel < 9 ? Math.floor(inv.sel) : 0;
      m.inv = { slots, sel };
    }
  }
  if (m.stats !== undefined && !obj(m.stats)) { fix('stats'); delete m.stats; }
  for (const [k, type] of [['questsDone', 'string'], ['claimed', 'number']] as const) {
    const a = m[k];
    if (!Array.isArray(a)) { if (a !== undefined) fix(k); m[k] = []; }
    else m[k] = a.filter(x => typeof x === type);
  }
  if (!Array.isArray(m.saplings)) { if (m.saplings !== undefined) fix('saplings'); m.saplings = []; }
  if (!obj(m.settings)) { if (m.settings !== undefined) fix('settings'); m.settings = {}; }
  if (!num(m.savedAt)) m.savedAt = 0;
  if (!num(m.saves)) m.saves = 0;
  return { meta: m as unknown as SaveMeta, from, repaired };
}

/** Keep only well-formed per-chunk edit lists: "cx,cz" → [index, id, index, id, …]. */
export function cleanEdits(raw: unknown, chunkCells: number): { edits: Edits; dropped: number } {
  const edits: Edits = {};
  let dropped = 0;
  if (!obj(raw)) return { edits, dropped: raw === undefined || raw === null ? 0 : 1 };
  for (const k in raw) {
    const a = raw[k];
    if (!/^-?\d+,-?\d+$/.test(k) || !Array.isArray(a)) { dropped++; continue; }
    const out: number[] = [];
    for (let i = 0; i + 1 < a.length; i += 2) {
      const cell = a[i], id = a[i + 1];
      if (Number.isInteger(cell) && cell >= 0 && cell < chunkCells && Number.isInteger(id) && id >= 0 && id < 256) out.push(cell, id);
      else dropped++;
    }
    if (a.length % 2) dropped++;
    if (out.length) edits[k] = out;
  }
  return { edits, dropped };
}

export interface Backup { meta: SaveMeta; edits: Edits; at: number }

/** Decide what to load: the main save, or the backup when the main one is unusable. */
export function chooseSave(main: unknown, backup: unknown): LoadResult & { source: 'main' | 'backup' | 'none' } {
  const m = loadMeta(main);
  if (m.meta) return { ...m, source: 'main' };
  // no save at all is a new player (or "New world"): never resurrect the backup then
  if (m.error && obj(backup)) {
    const b = loadMeta(backup.meta);
    if (b.meta) return { ...b, source: 'backup', error: m.error };
  }
  return { ...m, source: 'none' };
}

// ---------- save file (parents: back up to a file / restore on any device) ----------
export const FILE_FORMAT = 'babymo-island-craft-save';
export function makeExport(meta: unknown, edits: unknown, now = Date.now()): string {
  return JSON.stringify({ format: FILE_FORMAT, exportedAt: now, meta, edits });
}
export function parseExport(text: string, chunkCells: number): { meta: SaveMeta; edits: Edits } | { error: string } {
  let o: unknown;
  try { o = JSON.parse(text); } catch { return { error: 'not a save file' }; }
  if (!obj(o) || o.format !== FILE_FORMAT) return { error: 'not a save file' };
  const r = loadMeta(o.meta);
  if (!r.meta) return { error: r.error || 'empty save' };
  return { meta: r.meta, edits: cleanEdits(o.edits, chunkCells).edits };
}
