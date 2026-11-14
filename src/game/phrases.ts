// Good words for the moment, said the way a Muslim family says them: thanks
// to Allah when something good happens, praise when something is beautiful,
// "masha Allah" for something well done, "astaghfirullah" after a mistake,
// "bismillah" to begin and "insha Allah" for next time. A small pill shows the
// word and what it means, and Baby Mo says it (not too often).
import type { T2 } from '../i18n';

export type Moment = 'thanks' | 'beautiful' | 'welldone' | 'oops' | 'begin' | 'nexttime' | 'great';
export const DZIKIR: Record<Moment, { ar: string; say: string; mean: T2 }> = {
  thanks: { ar: 'الحمد لله', say: 'Alhamdulillah', mean: ['Segala puji bagi Allah', 'All praise is for Allah'] },
  beautiful: { ar: 'سبحان الله', say: 'Subhanallah', mean: ['Maha Suci Allah', 'Glory be to Allah'] },
  welldone: { ar: 'ما شاء الله', say: 'Masya Allah', mean: ['Begitulah yang Allah kehendaki', 'This is what Allah has willed'] },
  oops: { ar: 'أستغفر الله', say: 'Astaghfirullah', mean: ['Aku memohon ampun kepada Allah', 'I ask Allah to forgive me'] },
  begin: { ar: 'بسم الله', say: 'Bismillah', mean: ['Dengan nama Allah', 'In the name of Allah'] },
  nexttime: { ar: 'إن شاء الله', say: 'Insya Allah', mean: ['Jika Allah menghendaki', 'If Allah wills'] },
  great: { ar: 'الله أكبر', say: 'Allahu Akbar', mean: ['Allah Maha Besar', 'Allah is the Greatest'] },
};
/** which word fits what just happened */
export const MOMENTS: Record<string, Moment> = {
  ate: 'thanks', drank: 'thanks', gift: 'thanks', caught_fish: 'thanks', won: 'thanks', finished: 'thanks', woke: 'thanks',
  landmark: 'beautiful', rainbow: 'beautiful', sunset: 'beautiful', stars: 'beautiful', snow: 'beautiful',
  bullseye: 'welldone', goal: 'welldone', basket: 'welldone', level: 'welldone', clear_jump: 'welldone', other_won: 'welldone',
  fell: 'oops', bumped: 'oops', hurt_animal: 'oops', knocked: 'oops',
  start: 'begin', mount: 'begin',
  missed: 'nexttime', lost: 'nexttime',
  volcano: 'great', big_win: 'great',
};
/** can a word be said now? (not more than one every few seconds, the same one not again for a while) */
export function canSay(now: number, last: number, lastOf: number | undefined, gap = 8000, same = 30000) {
  return now - last >= gap && (lastOf === undefined || now - lastOf >= same);
}
