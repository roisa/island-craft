// Full Mo Craft: whether it's unlocked, and buying or restoring it in the
// iPhone/iPad app (our own StoreKit plugin, ios/App/App/StoreKitPlugin.swift).
// The website has no purchase: it is the free part.
import { FULL_ID } from './game/unlock';

const native = () => typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
const KEY = 'mocraft-full';

interface StoreKitPlugin {
  product(o: { id: string }): Promise<{ price?: string }>;
  buy(o: { id: string }): Promise<{ owned: boolean; pending?: boolean }>;
  restore(o: { id: string }): Promise<{ owned: boolean }>;
  owned(o: { id: string }): Promise<{ owned: boolean }>;
  addListener(ev: 'owned', fn: (d: { id: string; owned: boolean }) => void): Promise<unknown>;
}
let plugin: Promise<StoreKitPlugin> | null = null;
const kit = () => (plugin ??= import('@capacitor/core').then(({ registerPlugin }) => registerPlugin<StoreKitPlugin>('StoreKit')));

export const store = {
  /** in the app: true once bought (remembered for offline starts); on the website: always false */
  full: false,
  /** the price in the shopper's own currency (e.g. "Rp 49.000"), once the App Store answers */
  price: '' as string,
  canBuy: native,
  listeners: [] as ((full: boolean) => void)[],
  set(v: boolean) {
    if (this.full === v) return;
    this.full = v;
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private mode */ }
    for (const f of this.listeners) f(v);
  },
  /** at start: the remembered answer first, then ask the App Store */
  async init() {
    if (!native()) return;
    try { this.full = localStorage.getItem(KEY) === '1'; } catch { /* private mode */ }
    try {
      const k = await kit();
      k.addListener('owned', d => { if (d.id === FULL_ID) this.set(d.owned); });
      this.set((await k.owned({ id: FULL_ID })).owned);
      this.price = (await k.product({ id: FULL_ID })).price || '';
    } catch { /* offline or not set up yet: keep the remembered answer */ }
  },
  /** 'owned' | 'pending' (Ask to Buy) | 'cancelled' | 'error' */
  async buy(): Promise<'owned' | 'pending' | 'cancelled' | 'error'> {
    if (!native()) return 'error';
    try {
      const r = await (await kit()).buy({ id: FULL_ID });
      if (r.owned) { this.set(true); return 'owned'; }
      return r.pending ? 'pending' : 'cancelled';
    } catch { return 'error'; }
  },
  async restore(): Promise<boolean> {
    if (!native()) return false;
    try { const r = await (await kit()).restore({ id: FULL_ID }); this.set(r.owned); return r.owned; } catch { return false; }
  },
};
