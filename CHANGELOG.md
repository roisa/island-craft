# Changelog

All notable changes to Baby Mo Island Craft. V2 work follows the plan in
[`docs/V2_PLAN.md`](docs/V2_PLAN.md). Each entry says what was tested and how.

## V2 — The Living Island (in progress)

### M3 · Animation system

- **New animator** (`src/game/animator.ts`) for every humanoid: the player's
  avatar, Baby Mo and the villagers. It has two layers.
  - **Locomotion:** idle (breathing, looking around), walk, run (with a
    forward lean), jump, fall, land (a short crouch on landing), swim
    (breaststroke with flutter kicks), ride and fly. Every state change is
    cross-faded.
  - **Actions on top:**
    - *mine*: an overhead strike, shown while the mine button is held.
    - *chop*: a sideways swing with a body twist. It plays automatically
      when the target is a tree trunk.
    - *build*: a reach forward when a block is placed.
    - *collect*: a scoop when items are picked up away from mining, e.g.
      milk, eggs, chests and gifts.
    - *wave*: villagers waving.
    - *celebrate*: a hop with both arms up. It plays for a new letter, a
      level-up and a finished blueprint.

    Actions mask the upper body, so the character can chop while walking.
    Celebrate takes over the whole body.
- **No foot sliding:** the walk and run cycles advance with the distance
  actually travelled.
- **Smooth transitions:** a cross-fade always starts from the pose currently
  on screen, so an interrupted fade (jump straight into fall) can't snap.
  The unit tests found that snap in the first version.
- **Bending at the hip:** leaning (run, collect, swim) pivots at the hip, the
  same way the prayer poses do. The feet stay planted, and a test checks
  this.
- **Prayer poses unchanged:** villagers' jama'ah, the picnic sitting pose and
  the player praying in the masjid still override the animator, as before.
- **Honest scope:** the characters are rigid jointed blocks, not skinned
  meshes. The clips are parametric pose functions, not keyframe files.
- **Cost:** 1.6 µs per character per frame, measured in Node.
- Tests: 13 unit tests covering state transitions, a normal hop vs a real
  fall, joint continuity across every transition, distance-locked cadence,
  masks, one-shot and looping actions, and hip pivoting. The smoke test now
  checks the avatar is in the walk or run state while walking, and in the
  mine action while digging. Checked in game: walking, jumping, chopping the
  village palm, swimming in a pool, villagers praying in the masjid and
  waving.

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
