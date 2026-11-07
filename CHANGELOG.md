# Changelog

All notable changes to Baby Mo Island Craft. V2 work follows the plan in
[`docs/V2_PLAN.md`](docs/V2_PLAN.md). Each entry says what was tested and how.

## V2 — The Living Island (in progress)

### M2 · Save v2

- **Versioned saves with migrations** (`src/game/persist.ts`). The save is now
  version 2. Version 1 saves (and older ones with no version field) are
  migrated on load; nothing is renamed or dropped. Adding a later version
  is one migration function.
- **Repair instead of loss.** On load, bad values are fixed one field at a
  time: a broken clock, day, player position, inventory slot, quest list or
  settings object. The rest of the save is kept. Bad block-edit entries are
  dropped one by one.
- **Atomic writes.** World info (`meta`) and block edits (`edits`) are
  written in one IndexedDB transaction, so they can no longer get out of
  step if the tab closes mid-save. A failed write is retried at the next
  save tick.
- **Automatic backup and recovery.** At the start of each session the loaded
  save is copied to `backup`. If the main save can't be read, the game loads
  the backup and tells the player. The unreadable save is kept under
  `broken`, never thrown away.
- **Persistent storage.** The game asks the browser to keep its storage
  (`navigator.storage.persist()`). This lowers the risk of Safari or Chrome
  clearing it.
- **Parents panel → Saved game:**
  - *Save to a file* downloads the whole save as JSON.
  - *Open a save file* restores one, on any device.
  - *Bring back the previous world* appears after "New world" and swaps the
    old world back in, keeping the current one in its place.
- **Fixed a V1 bug:** "New world" deleted the save and reloaded, but the
  page-hide save handler could write the old world straight back. The game
  now stops before deleting.
- Tests: 15 unit tests for migration, repair, edit cleaning, backup choice and
  save files, using the exact V1 save shape. The smoke test covers save
  and reload in the browser on all four profiles.

### M1 · QA foundation

- **Unit tests** (`npm test`, vitest, `tests/unit/`):
  - World generation is deterministic per seed.
  - Every seed gets the village and all 28 letter shrines, with the first
    four in the village.
  - Only known block ids are generated.
  - Inventory stacking, removing, swapping, saving and creative mode.
  - Every recipe uses real items, and the station rules hold.
  - Quests have real rewards and progress maths.
  - Each word-game word is spelled with exactly the letters it lists.
  - The Ramadhan calendar has 30 days.
  - Du'a cards are complete.
  - Prayer times come in the right order for every city and method.
  - Hijri date and Ramadhan countdown are correct.
  - Stars and levels maths.
  - Block-edit serialisation.
- **Browser smoke test** (`npm run smoke`, `tests/smoke/smoke.mjs`). It plays
  the built game in headless Chromium on four profiles: desktop, iPhone 13,
  iPad and Pixel 7. Steps:
  1. Boot and start a world.
  2. Check touch controls appear only on touch devices.
  3. Walk with the keyboard, or with the on-screen stick by real touch events.
  4. Dig a block by holding mine.
  5. Place a block.
  6. Collect a letter.
  7. Open all ten book tabs.
  8. Check prayer times are shown.
  9. Save, reload and check the progress kept.
  10. Play a few seconds with no console errors.
- **Publishing is gated.** The GitHub Pages workflow runs the unit tests,
  the build and the smoke test before it publishes. A failing check leaves
  the live game as it was.
- The stars-and-levels maths moved from `kid.ts` to `levels.ts`, so it can be
  tested without a browser. `kid.ts` re-exports it, and behaviour is
  unchanged.
- `docs/V2_PLAN.md` holds the audit, the baseline numbers and the milestone
  plan.

## V1

The first complete game: voxel world with eight biomes, Baby Mo, Adam and
Ais, Ayah Ibrahim, 28 hijaiyah letter shrines, quests, crafting,
blueprints, pets, the Ramadhan calendar and village, prayer times, du'a,
bedtime stories, the parents panel and bilingual ID/EN. See the git
history up to commit `8ebfc83`.
