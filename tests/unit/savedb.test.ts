// The save storage: it reconnects when iOS drops the IndexedDB connection, and falls back to memory
// (and says so) when storage can't be opened at all. Uses a tiny in-memory stand-in for IndexedDB.
import { describe, it, expect, beforeEach } from 'vitest';
import * as Save from '../../src/game/save';

type Fn = (() => void) | null;
let opens = 0, failOpen = false;
const data = new Map<string, unknown>();
const conns: { dead: boolean; onclose: Fn }[] = [];

function fakeIDB() {
  return {
    open() {
      opens++;
      const req: { result?: unknown; onsuccess: Fn; onerror: Fn; onupgradeneeded: Fn; onblocked: Fn } = { onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null };
      setTimeout(() => {
        if (failOpen) { req.onerror?.(); return; }
        const conn = {
          dead: false, onclose: null as Fn, onversionchange: null as Fn,
          close() { conn.dead = true; },
          createObjectStore() { /* one store */ },
          transaction() {
            if (conn.dead) throw new Error('InvalidStateError: the database connection is closing');
            const tx = { oncomplete: null as Fn, onerror: null as Fn, onabort: null as Fn };
            const done = () => setTimeout(() => tx.oncomplete?.(), 0);
            return Object.assign(tx, {
              objectStore: () => ({
                put(v: unknown, k: string) { data.set(k, v); done(); },
                delete(k: string) { data.delete(k); done(); },
                get(k: string) { const r = { result: undefined as unknown, onsuccess: null as Fn, onerror: null as Fn }; setTimeout(() => { r.result = data.get(k); r.onsuccess?.(); }, 0); return r; },
              }),
            });
          },
        };
        conns.push(conn);
        req.result = conn; req.onsuccess?.();
      }, 0);
      return req;
    },
  };
}

beforeEach(() => { opens = 0; failOpen = false; data.clear(); conns.length = 0; (globalThis as any).indexedDB = fakeIDB(); Save._reset(); });

describe('save storage', () => {
  it('writes and reads back', async () => {
    expect(await Save.putMany([['meta', { a: 1 }], ['edits', { b: 2 }]])).toBe(true);
    expect(await Save.get('meta')).toEqual({ a: 1 });
    expect(opens).toBe(1);
  });
  it('reconnects when the connection was dropped (iOS after the app was in the background)', async () => {
    await Save.put('meta', { v: 1 });
    conns[0].dead = true; // the system closed it; nobody told us
    expect(await Save.putMany([['meta', { v: 2 }], ['edits', {}]])).toBe(true);
    expect(opens).toBe(2);
    expect(await Save.get('meta')).toEqual({ v: 2 });
  });
  it('reconnects after an announced close too', async () => {
    await Save.put('k', 1);
    conns[0].dead = true; conns[0].onclose?.();
    expect(await Save.get('k')).toBe(1);
    expect(opens).toBe(2);
  });
  it('falls back to memory (and flags it) when storage cannot be opened', async () => {
    failOpen = true;
    expect(await Save.put('meta', { m: 1 })).toBe(true);
    expect(Save.memoryOnly).toBe(true);
    expect(await Save.get('meta')).toEqual({ m: 1 });
    expect(await Save.del('meta')).toBe(true);
    expect(await Save.get('meta')).toBeUndefined();
  });
});
