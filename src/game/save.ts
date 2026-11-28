// Persistence in IndexedDB (falls back to memory if unavailable, e.g. private mode).
const DB = 'babymo-island-craft', STORE = 'kv';
let dbp: Promise<IDBDatabase | null> | null = null;
/** true when IndexedDB could not be opened and saves only live in memory (lost when the app closes) */
export let memoryOnly = false;

function open(): Promise<IDBDatabase | null> {
  return dbp ??= new Promise(res => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => {
        const db = r.result;
        // iOS can drop the connection while the app is in the background: forget it so the next
        // save opens a fresh one instead of failing on a dead connection for the rest of the day
        db.onclose = () => { if (dbp) dbp = null; };
        db.onversionchange = () => { try { db.close(); } catch { /* ignore */ } dbp = null; };
        memoryOnly = false; res(db);
      };
      r.onerror = () => { memoryOnly = true; res(null); };
      r.onblocked = () => { /* another tab holds an old version: keep waiting */ };
    } catch { memoryOnly = true; res(null); }
  });
}
/** Forget the cached connection (used after a failed write, so the retry reconnects). */
export function reconnect() { const old = dbp; dbp = null; void old?.then(db => { try { db?.close(); } catch { /* ignore */ } }); }
const mem = new Map<string, unknown>();

/** run one write transaction; on a dead connection reconnect once and try again */
async function write(fill: (st: IDBObjectStore) => void, memFill: () => void): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const db = await open();
    if (!db) { memFill(); return true; }
    const ok = await new Promise<boolean>(res => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        fill(tx.objectStore(STORE));
        tx.oncomplete = () => res(true); tx.onerror = () => res(false); tx.onabort = () => res(false);
      } catch { res(false); }
    });
    if (ok) return true;
    reconnect();
  }
  return false;
}

export async function put(key: string, value: unknown): Promise<boolean> {
  return write(st => { st.put(value, key); }, () => { mem.set(key, value); });
}
/** Write several keys in ONE transaction: either all of them land or none do. */
export async function putMany(entries: [string, unknown][]): Promise<boolean> {
  return write(st => { for (const [k, v] of entries) st.put(v, k); }, () => { for (const [k, v] of entries) mem.set(k, v); });
}
/** Ask the browser not to clear our storage under pressure (Safari, Chrome). */
export async function requestPersist(): Promise<boolean> {
  try { return (await navigator.storage?.persisted?.()) || (await navigator.storage?.persist?.()) || false; } catch { return false; }
}
export async function get<T>(key: string): Promise<T | undefined> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const db = await open();
    if (!db) return mem.get(key) as T | undefined;
    const r = await new Promise<{ ok: boolean; v?: T }>(res => {
      try {
        const q = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        q.onsuccess = () => res({ ok: true, v: q.result as T }); q.onerror = () => res({ ok: false });
      } catch { res({ ok: false }); }
    });
    if (r.ok) return r.v;
    reconnect();
  }
  return undefined;
}
export async function del(key: string): Promise<boolean> {
  return write(st => { st.delete(key); }, () => { mem.delete(key); });
}
/** for tests: forget the connection and the memory fallback */
export function _reset() { dbp = null; mem.clear(); memoryOnly = false; }

export function serializeEdits(edits: Map<string, Map<number, number>>) {
  const out: Record<string, number[]> = {};
  for (const [k, m] of edits) { const a: number[] = []; for (const [i, id] of m) a.push(i, id); out[k] = a; }
  return out;
}
export function deserializeEdits(o: Record<string, number[]> | undefined) {
  const m = new Map<string, Map<number, number>>();
  if (!o) return m;
  for (const k in o) { const a = o[k], mm = new Map<number, number>(); for (let i = 0; i < a.length; i += 2) mm.set(a[i], a[i + 1]); m.set(k, mm); }
  return m;
}
