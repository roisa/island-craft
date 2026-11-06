// Persistence in IndexedDB (falls back to memory if unavailable, e.g. private mode).
const DB = 'babymo-island-craft', STORE = 'kv';
let dbp: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  return dbp ??= new Promise(res => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch { res(null); }
  });
}
const mem = new Map<string, unknown>();

export async function put(key: string, value: unknown) {
  const db = await open();
  if (!db) { mem.set(key, value); return; }
  await new Promise<void>(res => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => res(); tx.onerror = () => res(); tx.onabort = () => res();
    } catch { res(); }
  });
}
export async function get<T>(key: string): Promise<T | undefined> {
  const db = await open();
  if (!db) return mem.get(key) as T | undefined;
  return new Promise(res => {
    try {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      r.onsuccess = () => res(r.result as T); r.onerror = () => res(undefined);
    } catch { res(undefined); }
  });
}
export async function del(key: string) {
  const db = await open();
  if (!db) { mem.delete(key); return; }
  await new Promise<void>(res => {
    try { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = () => res(); tx.onerror = () => res(); } catch { res(); }
  });
}

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
