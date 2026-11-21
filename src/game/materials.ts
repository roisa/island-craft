// What a block is made of decides how it sounds and what flies off it.
// Pure data + lookup (no audio, no three.js) so it is unit tested.
import { B, BLOCKS, isLetter } from '../world/blocks';

export type Mat = 'wood' | 'stone' | 'ore' | 'dirt' | 'grass' | 'sand' | 'gravel' | 'snow' | 'ice' | 'glass'
  | 'leaves' | 'plant' | 'wool' | 'metal' | 'clay' | 'water' | 'magic';

export interface MatInfo {
  /** particle colours (picked at random); the block's own colour is added too */
  colors: number[];
  /** debris pieces on break and chips per hit */
  pieces: number; chips: number;
  /** debris size multiplier and gravity (leaves drift, stone drops) */
  size: number; grav: number;
}

export const MATS: Record<Mat, MatInfo> = {
  wood:   { colors: [0x8a5a2b, 0xb07a43, 0x5e3b1a], pieces: 10, chips: 3, size: 1, grav: 14 },
  stone:  { colors: [0x8d8d8d, 0x6f6f6f, 0xa9a9a9], pieces: 10, chips: 3, size: 0.9, grav: 16 },
  ore:    { colors: [0x8d8d8d, 0x6f6f6f], pieces: 12, chips: 3, size: 0.9, grav: 16 },
  dirt:   { colors: [0x7a5230, 0x5e3d22, 0x8f6440], pieces: 9, chips: 2, size: 0.85, grav: 13 },
  grass:  { colors: [0x6fbf4a, 0x7a5230, 0x5aa83a], pieces: 9, chips: 2, size: 0.85, grav: 13 },
  sand:   { colors: [0xe8d39a, 0xd8c07f, 0xf2e2b3], pieces: 12, chips: 3, size: 0.6, grav: 15 },
  gravel: { colors: [0x8a8580, 0x6d6964, 0xa59f98], pieces: 10, chips: 2, size: 0.7, grav: 16 },
  snow:   { colors: [0xffffff, 0xe8f2fb], pieces: 12, chips: 3, size: 0.7, grav: 8 },
  ice:    { colors: [0xbfe6ff, 0xe6f6ff], pieces: 10, chips: 2, size: 0.7, grav: 14 },
  glass:  { colors: [0xd9f3ff, 0xffffff], pieces: 12, chips: 2, size: 0.55, grav: 15 },
  leaves: { colors: [0x4f9d3a, 0x6cbf4f, 0x3f8030], pieces: 10, chips: 3, size: 0.8, grav: 3 },
  plant:  { colors: [0x6cbf4f, 0x4f9d3a], pieces: 5, chips: 0, size: 0.6, grav: 4 },
  wool:   { colors: [], pieces: 8, chips: 2, size: 1, grav: 7 },
  metal:  { colors: [0xffd874, 0xe0b84d], pieces: 10, chips: 3, size: 0.8, grav: 15 },
  clay:   { colors: [0xa7aebb, 0x8e95a3], pieces: 9, chips: 2, size: 0.85, grav: 14 },
  water:  { colors: [0x5bb8e8], pieces: 0, chips: 0, size: 1, grav: 10 },
  magic:  { colors: [0xffd874, 0xfff1b8], pieces: 10, chips: 3, size: 0.7, grav: 2 },
};

const BY_ID: Partial<Record<number, Mat>> = {
  [B.GRASS]: 'grass', [B.SNOW_GRASS]: 'snow', [B.DIRT]: 'dirt', [B.STONE]: 'stone', [B.COBBLE]: 'stone', [B.BEDROCK]: 'stone',
  [B.SAND]: 'sand', [B.SANDSTONE]: 'stone', [B.GRAVEL]: 'gravel', [B.SNOW]: 'snow', [B.ICE]: 'ice', [B.WATER]: 'water', [B.CLAY]: 'clay',
  [B.OAK_LOG]: 'wood', [B.PINE_LOG]: 'wood', [B.PALM_LOG]: 'wood', [B.PLANKS]: 'wood', [B.WORKBENCH]: 'wood', [B.BOOKSHELF]: 'wood',
  [B.CHEST]: 'wood', [B.BEDUG]: 'wood', [B.BED]: 'wool',
  [B.OAK_LEAVES]: 'leaves', [B.PINE_LEAVES]: 'leaves', [B.PALM_LEAVES]: 'leaves', [B.CACTUS]: 'leaves',
  [B.GLASS]: 'glass', [B.LANTERN]: 'glass',
  [B.BRICK]: 'stone', [B.MARBLE]: 'stone', [B.MOSAIC]: 'stone', [B.FURNACE]: 'stone',
  [B.GOLD_TILE]: 'metal',
  [B.COAL_ORE]: 'ore', [B.IRON_ORE]: 'ore', [B.GOLD_ORE]: 'ore', [B.CRYSTAL_ORE]: 'ore',
  [B.TORCH]: 'wood',
  [B.FLOWER_RED]: 'plant', [B.FLOWER_YELLOW]: 'plant', [B.FLOWER_BLUE]: 'plant', [B.FLOWER_PURPLE]: 'plant',
  [B.TALL_GRASS]: 'plant', [B.DEAD_BUSH]: 'plant', [B.SAPLING]: 'plant', [B.PALM_SAPLING]: 'plant', [B.PINE_SAPLING]: 'plant',
  [B.WOOL_WHITE]: 'wool', [B.WOOL_RED]: 'wool', [B.WOOL_YELLOW]: 'wool', [B.WOOL_BLUE]: 'wool', [B.WOOL_PURPLE]: 'wool', [B.WOOL_GREEN]: 'wool',
};

export function matOf(id: number): Mat {
  if (isLetter(id)) return 'magic';
  const m = BY_ID[id];
  if (m) return m;
  const d = BLOCKS[id];
  if (!d) return 'stone';
  if (d.render === 'cross') return 'plant';
  if (d.tool === 'axe') return 'wood';
  if (d.tool === 'shovel') return 'dirt';
  return 'stone';
}

/** Particle colours for a block: the block's own colour plus its material's. */
export function debrisColors(id: number): number[] {
  const own = BLOCKS[id]?.color;
  const mat = MATS[matOf(id)].colors;
  return own !== undefined ? [own, own, ...mat] : mat.length ? mat : [0x999999];
}

/** Which material a footstep on this ground block sounds like. */
export const stepMat = (groundId: number): Mat => matOf(groundId);
