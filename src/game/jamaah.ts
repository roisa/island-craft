// Praying together (jama'ah): the villagers wait in the row until you take
// your place, then everyone prays the same movements together, led by Ayah
// Ibrahim as imam, for the real number of rakaat: Fajr 2, Maghrib 3, the rest 4.
// One rakaat is shortened to about twelve seconds so a child can follow it.
import type { T2 } from '../i18n';
import type { PrayerPose } from './models';
import type { Prayer } from './prayer';

export const RAKAAT: Record<Prayer, number> = { fajr: 2, dhuhr: 4, asr: 4, maghrib: 3, isha: 4 };

export interface Step { pose: PrayerPose; dur: number; name: T2; rakaat: number; head?: number }

/** every movement of the prayer, in order */
export function jamaahPlan(prayer: Prayer): Step[] {
  const n = RAKAAT[prayer], out: Step[] = [];
  out.push({ pose: 'qiyam', dur: 1.8, name: ['Allahu Akbar', 'Allahu Akbar'], rakaat: 1 });
  for (let r = 1; r <= n; r++) {
    out.push({ pose: 'qiyam', dur: 3.2, name: ['Berdiri', 'Standing'], rakaat: r });
    out.push({ pose: 'ruku', dur: 2.2, name: ['Rukuk', 'Bowing'], rakaat: r });
    out.push({ pose: 'qiyam', dur: 1.4, name: ['I’tidal', 'Standing up'], rakaat: r });
    out.push({ pose: 'sujud', dur: 2.2, name: ['Sujud', 'Prostrating'], rakaat: r });
    out.push({ pose: 'julus', dur: 1.4, name: ['Duduk', 'Sitting'], rakaat: r });
    out.push({ pose: 'sujud', dur: 2.2, name: ['Sujud', 'Prostrating'], rakaat: r });
    if (r === 2 && n > 2) out.push({ pose: 'julus', dur: 2.6, name: ['Tasyahud awal', 'First tashahhud'], rakaat: r });
  }
  out.push({ pose: 'julus', dur: 3.2, name: ['Tasyahud akhir', 'Final tashahhud'], rakaat: n });
  out.push({ pose: 'julus', dur: 1.4, name: ['Salam', 'Salam'], rakaat: n, head: 0.9 });
  out.push({ pose: 'julus', dur: 1.4, name: ['Salam', 'Salam'], rakaat: n, head: -0.9 });
  return out;
}
export const planLength = (p: Step[]) => p.reduce((a, s) => a + s.dur, 0);

/** what everyone in the row does right now (read by the villagers, Baby Mo and you) */
export const rowPose: { pose: PrayerPose; head: number } = { pose: 'qiyam', head: 0 };

export class Jamaah {
  plan: Step[]; t = 0; i = 0; joined = true;
  constructor(public prayer: Prayer) { this.plan = jamaahPlan(prayer); }
  get step() { return this.plan[Math.min(this.i, this.plan.length - 1)]; }
  get total() { return RAKAAT[this.prayer]; }
  /** move on; true once the salam is done */
  update(dt: number): boolean {
    this.t += dt;
    while (this.i < this.plan.length && this.t >= this.plan[this.i].dur) { this.t -= this.plan[this.i].dur; this.i++; }
    if (this.i >= this.plan.length) { rowPose.pose = 'qiyam'; rowPose.head = 0; return true; }
    rowPose.pose = this.step.pose; rowPose.head = this.step.head ?? 0;
    return false;
  }
}
