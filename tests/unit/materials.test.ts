import { describe, it, expect } from 'vitest';
import { matOf, MATS, debrisColors } from '../../src/game/materials';
import { B, BLOCKS } from '../../src/world/blocks';

describe('block materials', () => {
  it('every block has a material with particles to show', () => {
    for (const b of BLOCKS) {
      if (!b) continue;
      const m = matOf(b.id);
      expect(MATS[m], `${b.id}`).toBeTruthy();
      expect(debrisColors(b.id).length, `${b.id}`).toBeGreaterThan(0);
    }
  });
  it('sorts the common blocks sensibly', () => {
    expect(matOf(B.OAK_LOG)).toBe('wood'); expect(matOf(B.PLANKS)).toBe('wood');
    expect(matOf(B.STONE)).toBe('stone'); expect(matOf(B.IRON_ORE)).toBe('ore');
    expect(matOf(B.SAND)).toBe('sand'); expect(matOf(B.DIRT)).toBe('dirt'); expect(matOf(B.GRASS)).toBe('grass');
    expect(matOf(B.OAK_LEAVES)).toBe('leaves'); expect(matOf(B.FLOWER_RED)).toBe('plant');
    expect(matOf(B.GLASS)).toBe('glass'); expect(matOf(B.WOOL_RED)).toBe('wool'); expect(matOf(B.SNOW)).toBe('snow');
    expect(matOf(B.LETTER_0 + 5)).toBe('magic');
  });
  it('leaves and snow drift down slower than stone', () => {
    expect(MATS.leaves.grav).toBeLessThan(MATS.stone.grav);
    expect(MATS.snow.grav).toBeLessThan(MATS.stone.grav);
  });
  it('uses the block colour for its debris', () => {
    expect(debrisColors(B.WOOL_RED)).toContain(BLOCKS[B.WOOL_RED]!.color);
  });
  it('unknown ids fall back to stone instead of crashing', () => { expect(matOf(199)).toBe('stone'); });
});
