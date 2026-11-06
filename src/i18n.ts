// Tiny bilingual helper. Indonesian is the source language (like the Baby Mo hub);
// English on request. The choice is shared with the hub via localStorage "bm_lang".

export type Lang = 'id' | 'en';

function initialLang(): Lang {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'id') return q;
    const s = localStorage.getItem('bm_lang');
    if (s === 'en' || s === 'id') return s;
  } catch { /* ignore */ }
  return 'id';
}

let lang: Lang = initialLang();

export const getLang = () => lang;
export function setLang(l: Lang) {
  lang = l;
  try { localStorage.setItem('bm_lang', l); } catch { /* ignore */ }
  document.documentElement.lang = l;
}

/** tr('Indonesian', 'English') */
export const tr = (id: string, en: string) => (lang === 'en' ? en : id);

/** A bilingual pair stored in data tables. */
export type T2 = [string, string];
export const t2 = (p: T2) => (lang === 'en' ? p[1] : p[0]);
