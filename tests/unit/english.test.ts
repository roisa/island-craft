import { describe, it, expect } from 'vitest';
import { PRAISE, ANIMAL_WORDS, FRUIT_WORDS, nextPraise } from '../../src/game/english';

describe('English words while playing', () => {
  it('every word has its English, its Indonesian meaning and a picture', () => {
    for (const w of [...PRAISE, ...Object.values(ANIMAL_WORDS), ...Object.values(FRUIT_WORDS)]) expect(w.en && w.id && w.icon, w.en).toBeTruthy();
    expect(PRAISE.length).toBeGreaterThanOrEqual(12);
    expect(new Set(PRAISE.map(w => w.en)).size).toBe(PRAISE.length);
  });
  it('the praise word changes each time', () => {
    for (let r = 0; r < 1; r += 0.05) expect(nextPraise('Awesome!', r).en).not.toBe('Awesome!');
  });
  it('each animal tells what it says', () => {
    expect(ANIMAL_WORDS.cow.say).toContain('moo');
    expect(ANIMAL_WORDS.cat.id).toBe('Kucing');
  });
});

import { countWord, dayPart, phraseFor, PHRASES, BODY_WORDS, COLOR_BLOCK, COLOR_WORDS } from '../../src/game/english';
import { WUDU } from '../../src/game/deeds';
import { I, B } from '../../src/world/blocks';
describe('more English while playing', () => {
  it('counts things from two to ten', () => {
    expect(countWord(3, I.APPLE)?.en).toBe('Three apples!');
    expect(countWord(3, I.APPLE)?.id).toBe('Tiga apel!');
    expect(countWord(2, I.MANGO)?.en).toBe('Two mangoes!');
    expect(countWord(1, I.APPLE)).toBeNull();
    expect(countWord(11, I.APPLE)).toBeNull();
    expect(countWord(3, I.WOOD_PICK)).toBeNull();
  });
  it('every wudu step after the intention has its body part', () => {
    expect(BODY_WORDS.length).toBe(WUDU.length);
    expect(BODY_WORDS[0]).toBeNull();
    for (let i = 1; i < WUDU.length; i++) expect(BODY_WORDS[i]?.en).toBeTruthy();
  });
  it('coloured wool and flowers have colour words', () => {
    expect(COLOR_WORDS[COLOR_BLOCK[B.WOOL_BLUE]].en).toBe('Blue');
    expect(COLOR_WORDS[COLOR_BLOCK[B.FLOWER_RED]].id).toBe('Merah');
  });
  it('good morning, afternoon, evening and night at the right hours', () => {
    const s = { sunrise: 6, dhuhr: 12, asr: 15, maghrib: 18, isha: 19.5 };
    expect(dayPart(7, s)).toBe('morning');
    expect(dayPart(13, s)).toBe('afternoon');
    expect(dayPart(18.5, s)).toBe('evening');
    expect(dayPart(20, s)).toBe('night');
    expect(dayPart(3, s)).toBeNull();
  });
  it('the sentence of the day stays the same all day and changes from day to day', () => {
    expect(phraseFor(new Date(2026, 10, 9, 8))).toBe(phraseFor(new Date(2026, 10, 9, 20)));
    expect(phraseFor(new Date(2026, 10, 9))).not.toBe(phraseFor(new Date(2026, 10, 10)));
    expect(new Set(PHRASES.map(p => p.en)).size).toBe(PHRASES.length);
  });
});
