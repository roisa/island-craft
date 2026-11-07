# Dunia Baby Mo — Island Craft 🌙

A cozy block-building adventure for children, built for Ramadhan. It's a whole
world to explore, build in and learn from, with no timers, no losing and no
pressure. It runs in the browser first (play.babymo.id), and the same code can
later be wrapped for iOS/Android with Capacitor (as `babymo-app` already does).

## What's in the game

**A real voxel world (endless, generated from a seed)**
- Biomes: flower meadows, forests, **date-palm deserts with oases**, snowy hills,
  tall snow-capped mountains, beaches and oceans
- Caves with glowing crystals, ores (coal, iron, gold), clay and gravel
- Ambient occlusion, soft sky light, warm lantern/torch light, water, clouds,
  rain/snow, rainbows, stars and a crescent moon
- **Baby Mo's village**: a masjid with dome, minaret, mihrab and prayer rows,
  houses, a market stall, a well, lantern posts and date palms

**Gameplay like a classic block-building survival game, minus the scary parts**
- Mine (hold) and place blocks, 36-slot inventory, hotbar
- Simple recipe crafting with a workbench and furnace: planks, sticks, tools
  (wood/stone/iron pickaxe, axe, shovel), glass, bricks, marble, mosaic and gold tiles,
  Ramadhan lanterns, beds, bookshelves, dyed wool
- Tool tiers (ores need the right pickaxe), saplings that grow into trees
- Friendly animals: sheep (wool), cows/camels/goats (milk), chickens (eggs), cats
- Chop the bottom of a tree and the whole trunk comes down; its leaves drift away and drop dates, apples and saplings
- Adventure mode, or Creative mode (all blocks and flying)
- Third-person (default) or first-person camera, with the held item shown in hand
- Touch: joystick to walk, swipe to look, **tap a block to place/use, hold a finger on a block to mine** (buttons too).
  Keyboard/mouse: WASD, Space, left/right click, E bag, R craft, M map, V camera
- World map, crafting list that shows what you can make right now, item pick-up pop-ups

**Learning, woven into play**
- **28 hijaiyah letters** hidden in shrines around the world; a golden compass
  leads to the nearest one. Each letter card plays its sound with fathah/kasrah/dhammah.
  Collected letters become blocks you can build with. There's a **Letter Book** and a **Letter Quiz**.
- **Prayer times**: real times for the player's city, calculated offline with the
  `adhan` library (Kemenag/JAKIM 20°/18° default, plus MWL, Umm al-Qura, ISNA, Egypt).
  The in-game sun follows the same schedule: dawn at Subuh, sunset at Maghrib.
  At each in-game prayer the villagers walk to the masjid, and you can join them.
- **Gentle real-time reminders** when a real prayer time arrives ("take a break and pray with
  your family"). Parents can switch these off.
- **Ramadhan**: Hijri date (Umm al-Qura), countdown to Ramadhan, a 30-day calendar of
  good-deed cards with small gifts, iftar at Maghrib (dates & milk → *takjil*), suhoor
  before Subuh, sharing food with villagers (sedekah), and du'a cards for eating, breaking
  the fast, sleeping and waking.
- 24 relaxed quests with good-deed stickers. Baby Mo the companion follows you, cheers
  you on and gives hints.

**Other**
- Indonesian and English: a language switch on the start screen and in Settings (first visit follows the device language); shared with the Baby Mo hub via `localStorage.bm_lang`
- Fonts (Nunito, Scheherazade New for Arabic) are bundled, so the game works offline inside the app
- Uses the hub's saved city (`mo_manual_city` / `mo_cached_loc`) when served from the same site
- Saves automatically to IndexedDB. No ads, no accounts, no chat.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static files in dist/
```

The build uses relative paths, so `dist/` can be dropped into any folder, e.g.
`babymo-app/www/island-craft/`, and linked from the hub.

## Project layout

```
src/world/   blocks, procedural textures, terrain/biome generator, chunks, mesher + shader
src/game/    player physics, input, inventory & recipes, sky/day-night, animals & villagers,
             models, particles, audio, prayer times & Hijri, save
src/content.ts  quests, 30-day Ramadhan calendar, du'a texts
src/ui.ts       HUD, menus, dialogs
src/main.ts     game loop and rules
```

## Before release, please

- Have a teacher review the Arabic du'a texts, letter names and religious wording (`src/content.ts`, `src/world/blocks.ts`).
- Add recorded letter audio in `public/audio/hijaiyah/` (see the README there).
  Until then the device's text-to-speech is used.
- Prayer times are computed on the device and can differ a few minutes from the local masjid.
