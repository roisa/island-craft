// Original line icons in the style of modern iOS (rounded strokes, 24×24 grid).
// Drawn for this game — not Apple's SF Symbols, which may only be used in
// Apple's own platforms' apps. `ic('home')` returns inline SVG markup.
const P: Record<string, string> = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  home: '<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.8 9.6V19a1 1 0 0 0 1 1h3.7v-5h3v5h3.7a1 1 0 0 0 1-1V9.6"/>',
  bag: '<rect x="4.5" y="7" width="15" height="13.5" rx="4"/><path d="M9 7V5.8a3 3 0 0 1 6 0V7M4.5 13h15M10 13v2.2h4V13"/>',
  book: '<path d="M12 6.6C9.8 5 7 4.6 3.8 5v13.4c3.2-.4 6 0 8.2 1.6 2.2-1.6 5-2 8.2-1.6V5C17 4.6 14.2 5 12 6.6Z"/><path d="M12 6.6V20"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  up: '<path d="M12 19.5V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 4.5V19M6 13l6 6 6-6"/>',
  pickaxe: '<path d="M5 19.5 13.6 10.9"/><path d="M6.5 7.6C9.6 4.6 14.8 3.8 19.6 4.4c.6 4.8-.2 10-3.2 13.1"/><path d="m11.4 8.7 3.9 3.9"/>',
  hand: '<path d="M8.5 12.5V6.4a1.4 1.4 0 0 1 2.8 0v5"/><path d="M11.3 11V4.9a1.4 1.4 0 0 1 2.8 0V11"/><path d="M14.1 11V6.4a1.4 1.4 0 0 1 2.8 0v7.2c0 4-2.6 7.4-6.6 7.4-2.7 0-4.4-1.4-5.8-3.8l-2-3.4a1.5 1.5 0 0 1 2.5-1.6l2.1 2.6"/>',
  xmark: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  speaker: '<path d="M4 9.4h3.4L12 5.6v12.8l-4.6-3.8H4Z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.4a7.8 7.8 0 0 1 0 11.2"/>',
  undo: '<path d="M8.5 14 4 9.5 8.5 5"/><path d="M4 9.5h10.2a5.3 5.3 0 0 1 0 10.5H10"/>',
  map: '<path d="M9 4.2 3.5 6.5v13.3L9 17.5l6 2.5 5.5-2.3V4.4L15 6.7Z"/><path d="M9 4.2v13.3M15 6.7V20"/>',
  hammer: '<path d="M13.6 6.4 17 3l4 4-3.4 3.4"/><path d="m13.6 6.4 4 4"/><path d="M15.6 8.4 5.3 18.7a1.9 1.9 0 0 1-2.7-2.7L12.9 5.7"/>',
  star: '<path class="f" d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9Z"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.2 2"/>',
  sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.6v2.2M12 19.2v2.2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2.6 12h2.2M19.2 12h2.2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/>',
  sunrise: '<path d="M3 18.5h18M6.8 18.5a5.2 5.2 0 0 1 10.4 0"/><path d="M12 3.5v6M9.5 6 12 3.5 14.5 6M4.6 11.3l1.5 1.2M19.4 11.3l-1.5 1.2"/>',
  sunset: '<path d="M3 18.5h18M6.8 18.5a5.2 5.2 0 0 1 10.4 0"/><path d="M12 3.5v6M9.5 7 12 9.5 14.5 7M4.6 11.3l1.5 1.2M19.4 11.3l-1.5 1.2"/>',
  cloudsun: '<path d="M8.6 3.4v1.5M3.4 8.6h1.5M4.9 4.9l1 1M12.4 4.9l-1 1"/><path d="M6.2 10.4a3 3 0 0 1 5.2-2.6"/><path d="M17.6 19.5H8.4a3.8 3.8 0 1 1 .9-7.5 5 5 0 0 1 9.4 1.8 2.9 2.9 0 0 1-1.1 5.7Z"/>',
  moon: '<path d="M19.8 14.6A8.4 8.4 0 1 1 9.4 4.2a6.8 6.8 0 0 0 10.4 10.4Z"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4.2" rx="1.2"/><path d="M5.2 12.2V20h13.6v-7.8M12 8v12"/><path d="M12 8C10.4 4.6 6.6 4.4 6.6 6.6 6.6 8 9 8 12 8Zm0 0c1.6-3.4 5.4-3.6 5.4-1.4C17.4 8 15 8 12 8Z"/>',
  gear: '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.8l1.6 2.2 2.7-.6.7 2.7 2.4 1.4-1 2.5 1 2.5-2.4 1.4-.7 2.7-2.7-.6L12 21.2 10.4 19l-2.7.6-.7-2.7-2.4-1.4 1-2.5-1-2.5L7 8.1l.7-2.7 2.7.6Z"/>',
  mosque: '<path d="M3.5 20.5h17M5.5 20.5v-8.2a6.5 6.5 0 0 1 13 0v8.2M12 3.2v2.6"/><path d="M10 20.5v-3.6a2 2 0 0 1 4 0v3.6"/>',
  shirt: '<path d="M8.4 4 4 6.8l1.9 4 2.1-1V20h8V9.8l2.1 1 1.9-4L15.6 4c-.6 1.6-2 2.6-3.6 2.6S9 5.6 8.4 4Z"/>',
  blueprint: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M3.5 9.5h17M9.5 9.5v11"/>',
  lock: '<rect x="5" y="10.6" width="14" height="10" rx="2.6"/><path d="M8.2 10.6V8a3.8 3.8 0 0 1 7.6 0v2.6"/>',
  check: '<path d="m5 12.6 4.4 4.4L19 7.4"/>',
  rotate: '<path d="M19.6 12a7.6 7.6 0 1 1-2.2-5.4"/><path d="M19.6 4v4.2h-4.2"/>',
  play: '<path class="f" d="M8 5.4v13.2c0 .8.9 1.3 1.6.9l10.4-6.6a1 1 0 0 0 0-1.8L9.6 4.5C8.9 4.1 8 4.6 8 5.4Z"/>',
  globe: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6S14.4 18.2 12 20.6M12 3.4C9.6 5.8 8.4 8.7 8.4 12s1.2 6.2 3.6 8.6"/>',
  family: '<circle cx="9" cy="8" r="3"/><path d="M3.6 19.5a5.4 5.4 0 0 1 10.8 0"/><circle cx="16.6" cy="9.2" r="2.4"/><path d="M15.2 14.3a4.4 4.4 0 0 1 5.6 4.2"/>',
  music: '<path d="M9 17.8V5.4l10.5-2v12.4"/><circle cx="6.6" cy="17.8" r="2.4"/><circle cx="17.1" cy="15.8" r="2.4"/>',
  bubble: '<path d="M4.5 5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9.5l-4.5 3.6V16H4.5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>',
  game: '<rect x="2.8" y="7.5" width="18.4" height="10" rx="5"/><path d="M7.8 10.6v3.8M5.9 12.5h3.8"/><circle class="f" cx="15.4" cy="11.6" r="1"/><circle class="f" cx="17.6" cy="13.6" r="1"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  bell: '<path d="M6 16.5v-5a6 6 0 0 1 12 0v5l1.6 1.8H4.4Z"/><path d="M10 20.4a2 2 0 0 0 4 0"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="m8.2 7 1.4-2.6h4.8L15.8 7"/><circle cx="12" cy="13.5" r="3.4"/>',
  arrow: '<path class="f" d="M12 3.2 19 20l-7-3.8L5 20Z"/>',
  sparkles: '<path d="M12 3.5 13.9 9 19.5 11 13.9 13 12 18.5 10.1 13 4.5 11 10.1 9Z"/><path d="M18.5 3.5v3M17 5h3"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  chart: '<path d="M5 20v-8M12 20V5M19 20v-6"/>',
  leaf: '<path d="M5 19C5 10.8 10.8 5 19 5c0 8.2-5.8 14-14 14Z"/><path d="m5 19 8.5-8.5"/>',
  shield: '<path d="M12 3 19 6v5.8c0 4.4-3 7.6-7 9.2-4-1.6-7-4.8-7-9.2V6Z"/>',
  timer: '<circle cx="12" cy="13" r="7.6"/><path d="M12 9v4l2.6 1.8M9.5 2.8h5"/>',
  ruler: '<path d="M3.5 15.5 15.5 3.5l5 5-12 12Z"/><path d="m7.5 11.5 2 2M10.5 8.5l2 2M13.5 5.5l2 2"/>',
  paw: '<circle class="f" cx="7" cy="9.5" r="1.8"/><circle class="f" cx="10.6" cy="6.4" r="1.8"/><circle class="f" cx="14.6" cy="6.6" r="1.8"/><circle class="f" cx="17.8" cy="10" r="1.8"/><path class="f" d="M12.2 11.2c-2.8 0-5.2 3.4-5.2 5.8 0 1.9 1.6 2.6 3 2.2.8-.2 1.4-.6 2.2-.6s1.4.4 2.2.6c1.4.4 3-.3 3-2.2 0-2.4-2.4-5.8-5.2-5.8Z"/>',
  trophy: '<path d="M8 4.5h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6.5H5a2.5 2.5 0 0 0 3 3.6M16 6.5h3a2.5 2.5 0 0 1-3 3.6M12 13.5V17M8.5 20h7M9.5 17h5v3h-5Z"/>',
  door: '<path d="M14 4.5H7a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h7"/><path d="M14 8.5 18 12l-4 3.5M18 12H10"/>',
};

export function ic(name: keyof typeof P | string, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] ?? ''}</svg>`;
}
/** iOS Settings-style icon: white glyph on a coloured rounded square */
export function tile(name: string, color: string) {
  return `<span class="tile" style="background:${color}">${ic(name)}</span>`;
}
export const COLORS = { green: '#34C759', blue: '#0A84FF', orange: '#FF9F0A', red: '#FF453A', purple: '#BF5AF2', teal: '#30B0C7', pink: '#FF375F', indigo: '#5E5CE6', gray: '#8E8E93', yellow: '#FFCC00', brown: '#A2845E', mint: '#00C7BE' };
