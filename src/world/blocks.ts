import type { T2 } from '../i18n';

export enum B {
  AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, COBBLE = 4, SAND = 5, SANDSTONE = 6, GRAVEL = 7,
  SNOW_GRASS = 8, SNOW = 9, ICE = 10, WATER = 11, BEDROCK = 12, CLAY = 13,
  OAK_LOG = 14, OAK_LEAVES = 15, PINE_LOG = 16, PINE_LEAVES = 17, PALM_LOG = 18, PALM_LEAVES = 19,
  PLANKS = 20, GLASS = 21, BRICK = 22, MARBLE = 23, MOSAIC = 24, GOLD_TILE = 25,
  COAL_ORE = 26, IRON_ORE = 27, GOLD_ORE = 28, CRYSTAL_ORE = 29, CACTUS = 30,
  WORKBENCH = 31, FURNACE = 32, LANTERN = 33, TORCH = 34,
  FLOWER_RED = 35, FLOWER_YELLOW = 36, FLOWER_BLUE = 37, FLOWER_PURPLE = 38,
  TALL_GRASS = 39, DEAD_BUSH = 40, SAPLING = 41, PALM_SAPLING = 42, BED = 43, BOOKSHELF = 44,
  WOOL_WHITE = 45, WOOL_RED = 46, WOOL_YELLOW = 47, WOOL_BLUE = 48, WOOL_PURPLE = 49, WOOL_GREEN = 50,
  PINE_SAPLING = 51, CHEST = 52, BEDUG = 53,
  // the reef, the stargazing hill
  CORAL_PINK = 54, CORAL_ORANGE = 55, CORAL_PURPLE = 56, SEA_GRASS = 57, CORAL_FAN = 58, CLAM = 59, TELESCOPE = 60,
  // the volcano island
  BASALT = 61, MAGMA = 62, OBSIDIAN = 63,
  // the river
  RAFT_DOCK = 64, LETTER_0 = 100, // 100..127 = the 28 hijaiyah letters
}

/** Non-block items share the same id space (200+). */
export enum I {
  STICK = 200, WOOD_PICK = 201, STONE_PICK = 202, IRON_PICK = 203,
  WOOD_AXE = 204, STONE_AXE = 205, IRON_AXE = 206,
  WOOD_SHOVEL = 207, STONE_SHOVEL = 208, IRON_SHOVEL = 209,
  COAL = 210, IRON_INGOT = 211, GOLD_INGOT = 212, CRYSTAL = 213,
  DATES = 214, MILK = 215, EGG = 216, APPLE = 217, TAKJIL = 218, KOLAK = 219, BOAT = 220,
  // furniture & decorations (placed as objects, see game/deco.ts)
  PRAYER_MAT = 230, TABLE = 231, CHAIR = 232, CUSHION = 233, PLANT_POT = 234, LAMP = 235, DATES_BOWL = 236, KETUPAT = 237, RUG = 238, BOOK_STAND = 239, CRESCENT = 240,
  // toy swords (for shooing naughty beetles), fishing and cooking
  WOOD_SWORD = 241, STONE_SWORD = 242, IRON_SWORD = 243, FISHING_ROD = 244,
  SMALL_FISH = 245, BIG_FISH = 246, GOLDEN_FISH = 247, MEAT = 248, GRILLED_FISH = 249, FRIED_EGG = 250, STEAK = 251,
  // the pearl cave and the Eid bazaar
  PEARL = 252, KETUPAT_OPOR = 253, NASTAR = 254, ANGPAO = 255, FIREWORK = 256,
  KITE_RED = 257, KITE_BLUE = 258, KITE_YELLOW = 259,
}

export type ToolKind = 'pick' | 'axe' | 'shovel' | 'sword';
export type Render = 'cube' | 'cross' | 'water' | 'none';

export interface BlockDef {
  id: number;
  name: T2;
  top: string; side: string; bottom: string; front?: string;
  render: Render;
  solid: boolean;      // collides with player
  opaque: boolean;     // hides neighbour faces, blocks sky light
  cutout?: boolean;    // leaves: alpha-tested, faces between same block skipped
  glassy?: boolean;    // faces between same block skipped, see-through
  light?: number;      // 0..1 light emission
  hardness: number;    // seconds by hand (before tool bonus)
  tool?: ToolKind;
  tier?: number;       // minimum pickaxe tier (1 wood, 2 stone, 3 iron)
  drops?: (r: number) => [number, number][];
  color: number;       // particle colour
  letter?: number;     // hijaiyah letter index
  /** sea plants: they live inside water, so the water around them stays whole */
  aquatic?: boolean;
}

export interface ItemDef {
  id: number;
  name: T2;
  icon: string;        // tile/icon name drawn by the atlas
  tool?: { kind: ToolKind; tier: number; speed: number };
  food?: boolean;
  /** furniture / decoration placed as an object */
  deco?: boolean;
  stack: number;
}

export const BLOCKS: (BlockDef | undefined)[] = [];
export const ITEMS = new Map<number, ItemDef>();

function blk(id: number, name: T2, tiles: string | [string, string, string] | [string, string, string, string],
  opts: Partial<BlockDef> & { color: number; hardness: number }) {
  const [top, side, bottom, front] = typeof tiles === 'string' ? [tiles, tiles, tiles, undefined] : tiles;
  BLOCKS[id] = { id, name, top, side, bottom, front, render: 'cube', solid: true, opaque: true, ...opts };
}

const self = (id: number) => () => [[id, 1]] as [number, number][];

blk(B.GRASS, ['Rumput', 'Grass'], ['grass_top', 'grass_side', 'dirt'], { color: 0x6cbf4f, hardness: 0.7, tool: 'shovel', drops: self(B.DIRT) });
blk(B.DIRT, ['Tanah', 'Dirt'], 'dirt', { color: 0x9a6b44, hardness: 0.6, tool: 'shovel' });
blk(B.STONE, ['Batu', 'Stone'], 'stone', { color: 0x8d949b, hardness: 2.2, tool: 'pick', drops: self(B.COBBLE) });
blk(B.COBBLE, ['Batu Kali', 'Cobblestone'], 'cobble', { color: 0x7e858c, hardness: 2.2, tool: 'pick' });
blk(B.SAND, ['Pasir', 'Sand'], 'sand', { color: 0xe6d3a2, hardness: 0.5, tool: 'shovel' });
blk(B.SANDSTONE, ['Batu Pasir', 'Sandstone'], ['sandstone_top', 'sandstone_side', 'sandstone_top'], { color: 0xdcc58e, hardness: 1.6, tool: 'pick' });
blk(B.GRAVEL, ['Kerikil', 'Gravel'], 'gravel', { color: 0x9a9590, hardness: 0.7, tool: 'shovel' });
blk(B.SNOW_GRASS, ['Rumput Salju', 'Snowy Grass'], ['snow', 'snow_side', 'dirt'], { color: 0xf4f8ff, hardness: 0.7, tool: 'shovel', drops: self(B.DIRT) });
blk(B.SNOW, ['Salju', 'Snow'], 'snow', { color: 0xf4f8ff, hardness: 0.4, tool: 'shovel' });
blk(B.ICE, ['Es', 'Ice'], 'ice', { color: 0xa8d8f0, hardness: 0.6, tool: 'pick', glassy: true, opaque: false });
blk(B.WATER, ['Air', 'Water'], 'water', { color: 0x3b9fd1, hardness: 0, render: 'water', solid: false, opaque: false, drops: () => [] });
blk(B.BEDROCK, ['Batu Dasar', 'Bedrock'], 'bedrock', { color: 0x444444, hardness: Infinity });
blk(B.CLAY, ['Tanah Liat', 'Clay'], 'clay', { color: 0xa9b3c4, hardness: 0.6, tool: 'shovel' });
blk(B.OAK_LOG, ['Kayu Pohon', 'Oak Log'], ['oak_top', 'oak_log', 'oak_top'], { color: 0x8a5c38, hardness: 1.6, tool: 'axe' });
blk(B.OAK_LEAVES, ['Daun', 'Leaves'], 'oak_leaves', {
  color: 0x4f9e48, hardness: 0.25, cutout: true, opaque: false,
  drops: r => (r < 0.08 ? [[B.SAPLING, 1]] : r < 0.16 ? [[I.APPLE, 1]] : []),
});
blk(B.PINE_LOG, ['Kayu Cemara', 'Pine Log'], ['pine_top', 'pine_log', 'pine_top'], { color: 0x5e4129, hardness: 1.6, tool: 'axe' });
blk(B.PINE_LEAVES, ['Daun Cemara', 'Pine Needles'], 'pine_leaves', {
  color: 0x2f6b45, hardness: 0.25, cutout: true, opaque: false, drops: r => (r < 0.1 ? [[B.PINE_SAPLING, 1]] : []),
});
blk(B.PALM_LOG, ['Batang Kurma', 'Date Palm Log'], ['palm_top', 'palm_log', 'palm_top'], { color: 0xa98457, hardness: 1.6, tool: 'axe' });
blk(B.PALM_LEAVES, ['Daun Kurma', 'Date Palm Leaves'], 'palm_leaves', {
  color: 0x6aa84f, hardness: 0.25, cutout: true, opaque: false,
  drops: r => (r < 0.55 ? [[I.DATES, r < 0.2 ? 2 : 1]] : r < 0.65 ? [[B.PALM_SAPLING, 1]] : []),
});
blk(B.PLANKS, ['Papan Kayu', 'Planks'], 'planks', { color: 0xc49a62, hardness: 1.2, tool: 'axe' });
blk(B.GLASS, ['Kaca', 'Glass'], 'glass', { color: 0xd8f0ff, hardness: 0.4, glassy: true, opaque: false });
blk(B.BRICK, ['Bata', 'Bricks'], 'brick', { color: 0xb5553c, hardness: 2, tool: 'pick' });
blk(B.MARBLE, ['Pualam Putih', 'White Marble'], 'marble', { color: 0xf2efe8, hardness: 2, tool: 'pick' });
blk(B.MOSAIC, ['Ubin Mozaik', 'Mosaic Tile'], 'mosaic', { color: 0x2aa198, hardness: 1.5, tool: 'pick' });
blk(B.GOLD_TILE, ['Ubin Emas', 'Gold Tile'], 'gold_tile', { color: 0xf1c232, hardness: 2, tool: 'pick' });
blk(B.COAL_ORE, ['Bijih Batu Bara', 'Coal Ore'], 'coal_ore', { color: 0x333333, hardness: 2.4, tool: 'pick', tier: 1, drops: r => [[I.COAL, r < 0.3 ? 2 : 1]] });
blk(B.IRON_ORE, ['Bijih Besi', 'Iron Ore'], 'iron_ore', { color: 0xd8a47f, hardness: 2.8, tool: 'pick', tier: 2 });
blk(B.GOLD_ORE, ['Bijih Emas', 'Gold Ore'], 'gold_ore', { color: 0xf1c232, hardness: 2.8, tool: 'pick', tier: 3 });
blk(B.CRYSTAL_ORE, ['Kristal Gua', 'Cave Crystal'], 'crystal_ore', { color: 0x8be9fd, hardness: 3, tool: 'pick', tier: 3, light: 0.45, drops: () => [[I.CRYSTAL, 1]] });
blk(B.CACTUS, ['Kaktus', 'Cactus'], ['cactus_top', 'cactus_side', 'cactus_top'], { color: 0x4c8c3a, hardness: 0.5 });
blk(B.WORKBENCH, ['Meja Kerja', 'Workbench'], ['bench_top', 'bench_side', 'planks'], { color: 0xc49a62, hardness: 1.2, tool: 'axe' });
blk(B.FURNACE, ['Tungku', 'Furnace'], ['furnace_top', 'furnace_side', 'furnace_top', 'furnace_front'], { color: 0x7e858c, hardness: 2.2, tool: 'pick' });
blk(B.LANTERN, ['Lentera Ramadhan', 'Ramadan Lantern'], ['lantern_top', 'lantern', 'lantern_top'], { color: 0xffc94d, hardness: 0.4, light: 1, opaque: false, glassy: true });
blk(B.TORCH, ['Obor', 'Torch'], 'torch', { color: 0xffb347, hardness: 0.1, light: 0.85, render: 'cross', solid: false, opaque: false });
const plant = { hardness: 0.05, render: 'cross' as Render, solid: false, opaque: false };
blk(B.FLOWER_RED, ['Bunga Merah', 'Red Flower'], 'flower_red', { ...plant, color: 0xe4423a });
blk(B.FLOWER_YELLOW, ['Bunga Kuning', 'Yellow Flower'], 'flower_yellow', { ...plant, color: 0xf4c430 });
blk(B.FLOWER_BLUE, ['Bunga Biru', 'Blue Flower'], 'flower_blue', { ...plant, color: 0x2e6fe0 });
blk(B.FLOWER_PURPLE, ['Bunga Ungu', 'Purple Flower'], 'flower_purple', { ...plant, color: 0x9b59b6 });
blk(B.TALL_GRASS, ['Rumput Tinggi', 'Tall Grass'], 'tall_grass', { ...plant, color: 0x6cbf4f, drops: () => [] });
blk(B.DEAD_BUSH, ['Semak Kering', 'Dry Bush'], 'dead_bush', { ...plant, color: 0x9a7b4f, drops: () => [[I.STICK, 1]] });
blk(B.SAPLING, ['Bibit Pohon', 'Tree Sapling'], 'sapling', { ...plant, color: 0x4f9e48 });
blk(B.PALM_SAPLING, ['Bibit Kurma', 'Date Palm Sapling'], 'palm_sapling', { ...plant, color: 0x6aa84f });
blk(B.PINE_SAPLING, ['Bibit Cemara', 'Pine Sapling'], 'pine_sapling', { ...plant, color: 0x2f6b45 });
blk(B.BED, ['Kasur', 'Bed'], ['bed_top', 'bed_side', 'planks'], { color: 0xe4423a, hardness: 0.6 });
blk(B.BEDUG, ['Bedug', 'Bedug Drum'], ['bedug_face', 'bedug_side', 'bedug_face'], { color: 0x8a5c38, hardness: Infinity });
blk(B.CHEST, ['Peti Harta Karun', 'Treasure Chest'], ['chest_top', 'chest_side', 'chest_top', 'chest_front'], { color: 0xc49a62, hardness: Infinity });
blk(B.BOOKSHELF, ['Rak Buku', 'Bookshelf'], ['planks', 'bookshelf', 'planks'], { color: 0xc49a62, hardness: 1.2, tool: 'axe' });
blk(B.CORAL_PINK, ['Karang Merah Muda', 'Pink Coral'], 'coral_pink', { color: 0xff7aa8, hardness: 0.8, tool: 'pick' });
blk(B.CORAL_ORANGE, ['Karang Jingga', 'Orange Coral'], 'coral_orange', { color: 0xff9a3c, hardness: 0.8, tool: 'pick' });
blk(B.CORAL_PURPLE, ['Karang Ungu', 'Purple Coral'], 'coral_purple', { color: 0xa66bd3, hardness: 0.8, tool: 'pick' });
blk(B.SEA_GRASS, ['Rumput Laut', 'Seagrass'], 'sea_grass', { ...plant, color: 0x3fa36b, aquatic: true, drops: () => [] });
blk(B.CORAL_FAN, ['Kipas Karang', 'Coral Fan'], 'coral_fan', { ...plant, color: 0xff6f91, aquatic: true });
blk(B.CLAM, ['Kerang', 'Clam'], ['clam_top', 'clam_side', 'sand'], { color: 0xd9c3e8, hardness: 0.6, tool: 'shovel', drops: r => (r < 0.45 ? [[I.PEARL, 1]] : [[B.SAND, 1]]) });
blk(B.TELESCOPE, ['Teropong Bintang', 'Telescope'], 'telescope', { ...plant, color: 0xc9a227, hardness: Infinity });
blk(B.BASALT, ['Batu Gunung Api', 'Basalt'], 'basalt', { color: 0x4a4a52, hardness: 2.4, tool: 'pick' });
blk(B.MAGMA, ['Batu Magma Hangat', 'Warm Magma Rock'], 'magma', { color: 0xff7a1a, hardness: Infinity, light: 1 });
blk(B.OBSIDIAN, ['Obsidian', 'Obsidian'], 'obsidian', { color: 0x2a1f3d, hardness: 4, tool: 'pick', tier: 3 });
blk(B.RAFT_DOCK, ['Rakit Sungai', 'River Raft'], ['raft_top', 'raft_side', 'raft_side'], { color: 0xb08a55, hardness: Infinity });
const wool: [number, string, T2, number][] = [
  [B.WOOL_WHITE, 'wool_white', ['Wol Putih', 'White Wool'], 0xf2f2f2],
  [B.WOOL_RED, 'wool_red', ['Wol Merah', 'Red Wool'], 0xe4423a],
  [B.WOOL_YELLOW, 'wool_yellow', ['Wol Kuning', 'Yellow Wool'], 0xf4c430],
  [B.WOOL_BLUE, 'wool_blue', ['Wol Biru', 'Blue Wool'], 0x2e6fe0],
  [B.WOOL_PURPLE, 'wool_purple', ['Wol Ungu', 'Purple Wool'], 0x9b59b6],
  [B.WOOL_GREEN, 'wool_green', ['Wol Hijau', 'Green Wool'], 0x3fa34d],
];
for (const [id, tile, name, color] of wool) blk(id, name, tile, { color, hardness: 0.6 });

// ---- items -------------------------------------------------------------
function item(id: number, name: T2, icon: string, opts: Partial<ItemDef> = {}) {
  ITEMS.set(id, { id, name, icon, stack: 64, ...opts });
}
item(I.STICK, ['Tongkat', 'Stick'], 'i_stick');
item(I.WOOD_PICK, ['Beliung Kayu', 'Wooden Pickaxe'], 'i_pick_wood', { tool: { kind: 'pick', tier: 1, speed: 2 }, stack: 1 });
item(I.STONE_PICK, ['Beliung Batu', 'Stone Pickaxe'], 'i_pick_stone', { tool: { kind: 'pick', tier: 2, speed: 3.5 }, stack: 1 });
item(I.IRON_PICK, ['Beliung Besi', 'Iron Pickaxe'], 'i_pick_iron', { tool: { kind: 'pick', tier: 3, speed: 6 }, stack: 1 });
item(I.WOOD_AXE, ['Kapak Kayu', 'Wooden Axe'], 'i_axe_wood', { tool: { kind: 'axe', tier: 1, speed: 2 }, stack: 1 });
item(I.STONE_AXE, ['Kapak Batu', 'Stone Axe'], 'i_axe_stone', { tool: { kind: 'axe', tier: 2, speed: 3.5 }, stack: 1 });
item(I.IRON_AXE, ['Kapak Besi', 'Iron Axe'], 'i_axe_iron', { tool: { kind: 'axe', tier: 3, speed: 6 }, stack: 1 });
item(I.WOOD_SHOVEL, ['Sekop Kayu', 'Wooden Shovel'], 'i_shovel_wood', { tool: { kind: 'shovel', tier: 1, speed: 2 }, stack: 1 });
item(I.STONE_SHOVEL, ['Sekop Batu', 'Stone Shovel'], 'i_shovel_stone', { tool: { kind: 'shovel', tier: 2, speed: 3.5 }, stack: 1 });
item(I.IRON_SHOVEL, ['Sekop Besi', 'Iron Shovel'], 'i_shovel_iron', { tool: { kind: 'shovel', tier: 3, speed: 6 }, stack: 1 });
item(I.COAL, ['Batu Bara', 'Coal'], 'i_coal');
item(I.IRON_INGOT, ['Batang Besi', 'Iron Ingot'], 'i_iron');
item(I.GOLD_INGOT, ['Batang Emas', 'Gold Ingot'], 'i_gold');
item(I.CRYSTAL, ['Kristal', 'Crystal'], 'i_crystal');
item(I.DATES, ['Kurma', 'Dates'], 'i_dates', { food: true });
item(I.MILK, ['Susu', 'Milk'], 'i_milk', { food: true });
item(I.EGG, ['Telur', 'Egg'], 'i_egg');
item(I.APPLE, ['Apel', 'Apple'], 'i_apple', { food: true });
item(I.TAKJIL, ['Takjil Kurma & Susu', 'Dates & Milk Iftar Plate'], 'i_takjil', { food: true });
item(I.KOLAK, ['Kue Ramadhan', 'Ramadan Cake'], 'i_kolak', { food: true });
item(I.BOAT, ['Perahu', 'Boat'], 'i_boat', { stack: 1 });
item(I.PRAYER_MAT, ['Sajadah', 'Prayer Mat'], 'i_prayer_mat', { stack: 16, deco: true });
item(I.TABLE, ['Meja', 'Table'], 'i_table', { stack: 16, deco: true });
item(I.CHAIR, ['Kursi', 'Chair'], 'i_chair', { stack: 16, deco: true });
item(I.CUSHION, ['Bantal Duduk', 'Floor Cushion'], 'i_cushion', { stack: 16, deco: true });
item(I.PLANT_POT, ['Pot Tanaman', 'Potted Plant'], 'i_plant_pot', { stack: 16, deco: true });
item(I.LAMP, ['Lampu Hias', 'Standing Lamp'], 'i_lamp', { stack: 16, deco: true });
item(I.DATES_BOWL, ['Mangkuk Kurma', 'Bowl of Dates'], 'i_dates_bowl', { stack: 16, deco: true });
item(I.KETUPAT, ['Hiasan Ketupat', 'Ketupat Decoration'], 'i_ketupat', { stack: 16, deco: true });
item(I.RUG, ['Karpet', 'Rug'], 'i_rug', { stack: 16, deco: true });
item(I.BOOK_STAND, ['Rehal (Tempat Buku)', 'Book Stand'], 'i_book_stand', { stack: 16, deco: true });
item(I.CRESCENT, ['Hiasan Bulan Sabit', 'Crescent Decoration'], 'i_crescent', { stack: 16, deco: true });
item(I.WOOD_SWORD, ['Pedang Kayu Mainan', 'Toy Wooden Sword'], 'i_sword_wood', { tool: { kind: 'sword', tier: 1, speed: 1 }, stack: 1 });
item(I.STONE_SWORD, ['Pedang Batu Mainan', 'Toy Stone Sword'], 'i_sword_stone', { tool: { kind: 'sword', tier: 2, speed: 1 }, stack: 1 });
item(I.IRON_SWORD, ['Pedang Besi Mainan', 'Toy Iron Sword'], 'i_sword_iron', { tool: { kind: 'sword', tier: 3, speed: 1 }, stack: 1 });
item(I.FISHING_ROD, ['Pancingan', 'Fishing Rod'], 'i_rod', { stack: 1 });
item(I.SMALL_FISH, ['Ikan Kecil', 'Small Fish'], 'i_fish_small');
item(I.BIG_FISH, ['Ikan Besar', 'Big Fish'], 'i_fish_big');
item(I.GOLDEN_FISH, ['Ikan Emas', 'Golden Fish'], 'i_fish_gold', { stack: 16 });
item(I.MEAT, ['Daging Halal', 'Halal Meat'], 'i_meat');
item(I.GRILLED_FISH, ['Ikan Bakar', 'Grilled Fish'], 'i_fish_grilled', { food: true });
item(I.FRIED_EGG, ['Telur Ceplok', 'Fried Egg'], 'i_egg_fried', { food: true });
item(I.STEAK, ['Steak', 'Steak'], 'i_steak', { food: true });
item(I.PEARL, ['Mutiara', 'Pearl'], 'i_pearl');
item(I.KETUPAT_OPOR, ['Ketupat & Opor', 'Ketupat & Opor'], 'i_ketupat_opor', { food: true });
item(I.NASTAR, ['Kue Nastar', 'Pineapple Tarts'], 'i_nastar', { food: true });
item(I.ANGPAO, ['Amplop Lebaran', 'Eid Envelope'], 'i_angpao', { stack: 16 });
item(I.FIREWORK, ['Kembang Api', 'Firework'], 'i_firework', { stack: 16 });
item(I.KITE_RED, ['Layang-layang Merah', 'Red Kite'], 'i_kite_red', { stack: 1 });
item(I.KITE_BLUE, ['Layang-layang Biru', 'Blue Kite'], 'i_kite_blue', { stack: 1 });
item(I.KITE_YELLOW, ['Layang-layang Kuning', 'Yellow Kite'], 'i_kite_yellow', { stack: 1 });

// ---- hijaiyah letters ---------------------------------------------------
export interface Letter { g: string; ar: string; name: string; lat: string; }
export const LETTERS: Letter[] = ([
  ['ا', 'أَلِف', 'Alif', 'a'], ['ب', 'بَاء', 'Ba', 'b'], ['ت', 'تَاء', 'Ta', 't'], ['ث', 'ثَاء', 'Tsa', 'ts'],
  ['ج', 'جِيم', 'Jim', 'j'], ['ح', 'حَاء', 'Ḥa', 'ḥ'], ['خ', 'خَاء', 'Kha', 'kh'], ['د', 'دَال', 'Dal', 'd'],
  ['ذ', 'ذَال', 'Dzal', 'dz'], ['ر', 'رَاء', 'Ra', 'r'], ['ز', 'زَاي', 'Zai', 'z'], ['س', 'سِين', 'Sin', 's'],
  ['ش', 'شِين', 'Syin', 'sy'], ['ص', 'صَاد', 'Shad', 'sh'], ['ض', 'ضَاد', 'Dhad', 'dh'], ['ط', 'طَاء', 'Tha', 'th'],
  ['ظ', 'ظَاء', 'Zha', 'zh'], ['ع', 'عَيْن', 'Ain', "'"], ['غ', 'غَيْن', 'Ghain', 'gh'], ['ف', 'فَاء', 'Fa', 'f'],
  ['ق', 'قَاف', 'Qaf', 'q'], ['ك', 'كَاف', 'Kaf', 'k'], ['ل', 'لَام', 'Lam', 'l'], ['م', 'مِيم', 'Mim', 'm'],
  ['ن', 'نُون', 'Nun', 'n'], ['و', 'وَاو', 'Wau', 'w'], ['ه', 'هَاء', 'Ha', 'h'], ['ي', 'يَاء', 'Ya', 'y'],
] as const).map(r => ({ g: r[0], ar: r[1], name: r[2], lat: r[3] }));

LETTERS.forEach((L, i) => {
  blk(B.LETTER_0 + i, ['Huruf ' + L.name, 'Letter ' + L.name], 'letter_' + i, {
    color: 0xffd874, hardness: 0.3, letter: i, light: 0.5,
  });
});

export const isDeco = (id: number) => !!ITEMS.get(id)?.deco;
export const isLetter = (id: number) => id >= B.LETTER_0 && id < B.LETTER_0 + 28;
export const isBlockId = (id: number) => id > 0 && id < 200 && !!BLOCKS[id];

export function nameOf(id: number): T2 {
  const b = BLOCKS[id];
  if (b && id < 200) return b.name;
  return ITEMS.get(id)?.name ?? ['?', '?'];
}
export function maxStack(id: number) {
  return id >= 200 ? ITEMS.get(id)?.stack ?? 64 : 64;
}
