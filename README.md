# Legion Battles

A 2D fantasy autobattler for the browser. You open packs to get units, stand them on your half of a board, press FIGHT, and watch the battle play out by itself. Three worlds of stages lead to three bosses.

Everything on screen is drawn in code as SVG, and every sound is made in code. There are no bought assets and nothing is fetched from the network when the game runs.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://127.0.0.1:5173/. Add `?seed=123` to go straight to a skirmish with that seed.

| Command | What it does |
| --- | --- |
| `npm run dev` | The game, with reload on change. |
| `npm run build` | Type check, then build to `dist/`. Paths are relative, so `dist/` runs from any subfolder. |
| `npm test` | Every test: the simulation, the game's rules, the data, the sheets, the sounds. |
| `npm run art` | Writes every picture as SVG under `public/assets`, and the manifest. |
| `npm run art:sheet` | The same, then draws the contact sheets into `docs/art` and checks colors and line widths. |
| `npm run balance` | Plays 400 skirmishes and says how long they last and who wins. |
| `npm run journey` | Plays new players through all three worlds and says where they stall. |

Four scripts play the game in a headless browser and take the pictures in `docs/screens`. They need the dev server running, and Playwright:

```bash
node scripts/screens.mjs
```

```bash
node scripts/touch.mjs
```

```bash
node scripts/phone.mjs
```

```bash
node scripts/tour.mjs
```

`screens.mjs` walks a skirmish with a mouse. `touch.mjs` does the same on a phone-sized screen with touches, and fails if a drag or a tap does not do what a click would. `phone.mjs` is a new player on a phone, with touches only: a pack, a card, the first stage, the next. `tour.mjs` loads a save that is well into the game and visits the map, the team, the packs and the two later bosses.

## How the game works

**Cards.** A unit is a card. A card has a tier (Common to Legendary), which says how rare it is in its own set, a grade (F to S), which is rolled when it is pulled, and a level, which it earns by fighting. Grade and level multiply its health and damage. A grade is always shown as its badge, which grows grander as grades rise.

**Packs.** Every pack holds one card. A pack names its set and the grades it can hand out. A world's pack only turns over units you have already beaten in that world. Pulling a unit you hold at a better grade raises its grade; pulling it at the same or a worse one gives it experience.

**Battles.** The board is 8 by 4 tiles: yours are the left half. Units walk to the nearest enemy, attack on their own rhythm, and use their skill whenever it is ready. A battle lasts about 15 to 30 seconds.

**Worlds.** Thornwood (10 stages), Sunscar Dunes (12) and Frostholt (15). Each has minibosses and ends in a boss. A win pays coins and experience, and may drop a pack. The first win at a stage pays double. Your team starts at four and grows as bosses fall, up to eight.

**What you have not met is dark.** A unit you have never beaten or held is a black outline named "???". So is a pack that is not sold yet. A stage that is not open is a lock.

**Skirmish.** The SKIRMISH button on the map, or `?seed=N` in the address, plays the first four units against four random enemies. The same seed and the same placement always give the same battle.

Press `D` in a battle for the debug overlay: tiles, ranges, targets, frame rate, and how full the art sheet is.

## Where things are

| Folder | What is in it |
| --- | --- |
| `src/sim` | The battle. Pure TypeScript, no Phaser. Fixed 50 ms steps, a seeded generator, events for the view. |
| `src/data` | Units, worlds and packs: the numbers. |
| `src/game` | The rules around the battles: cards, packs, progress, the save. Pure TypeScript. |
| `src/art` | The art, as code. `kit/` is the palette and the reusable parts, `units/` is one file to a unit. |
| `src/audio` | The sounds, as code. |
| `src/view` | Phaser: the scenes, the unit rig, effects, the interface. |
| `src/platform` | The ads interface a portal's SDK will plug into. It does nothing yet. |
| `scripts` | Art generation, contact sheets, balance and journey reports, browser walks. |
| `tests` | Vitest. |
| `art/overrides` | Hand-edited SVGs that take the place of generated ones. |
| `docs/art`, `docs/screens` | The contact sheets and the screenshots. |

## Tuning

**A unit's numbers** are in `src/data/units.ts`. They are written at the strength of the first set; a set's `power` multiplies them, which is how later worlds outdo earlier ones. After a change:

```bash
npm run balance
```

That prints the spread of skirmish lengths (they should mostly fall between 15 and 30 seconds) and a table of every unit against every other.

**A stage** is one line in `src/data/worlds.ts`: who stands where, and the grade and level they stand at. After changing stages, packs, what a win pays, or anything a player's growth depends on:

```bash
npm run journey 12 --losses
```

It plays twelve new players through the game by its own rules and prints, for each world, how many battles it took, how many were lost, and how strong the team was when the boss fell. `--losses` lists the stages that beat players most often, which is where the walls are. As tuned now, Thornwood takes about 24 battles and the other two about 75 each. Twelve players is few: read what half of them took before the average.

**Grades, levels and tiers** are in `src/game/rarity.ts`. **Team size, drop chance and what a duplicate is worth** are at the top of `src/game/rules.ts`. **Packs** are in `src/data/packs.ts`.

## Adding things

**A unit.** Add its numbers to `src/data/units.ts` and its art to `src/art/units` (see `ART_GUIDE.md`). Run `npm run art:sheet` and look at the sheets. Run `npm test`: it fails if a unit has numbers and no art, or art and no numbers, or if the sheets the game packs its art onto are full.

**A world.** Add an entry to `WORLDS` in `src/data/worlds.ts`, a set to `SETS` and its units in `units.ts`, and a pack in `packs.ts` with a look in `src/art/packs.ts`. If its land is new, add it to `src/art/board.ts`. The tests hold a world to the rules: 10 to 25 stages, never fewer than the world before and never more than 5 more; one boss, at the end; a miniboss before it; only its own set's units; no unit fielded before the stage its `from` names. Then run the journey report and set the grades and levels by what it says.

**A skill.** A skill is data on a unit: a kind (`strike`, `cleave`, `blast`, `volley`, `drain`, `mend`, `boon`, `hex`), a cooldown, and the kind's numbers. A new kind is a case in `useSkill` in `src/sim/battle.ts`, with a test.

**A sound.** A recipe in `src/audio/sfx.ts`: a few tones and bursts of noise. The test builds every one.

## Regenerating art, and editing it by hand

```bash
npm run art
```

writes `public/assets/units/<team>/<unit>/<part>.svg` for both teams, a whole-unit `full.svg` for the menus, the effects, the board, the icons, the packs and the grade badges, and `public/assets/manifest.json`, which lists each unit's parts in draw order with their pivots.

To change a picture by hand, copy it to the same path under `art/overrides` and edit it there, in Inkscape or anything else. For example `art/overrides/units/blue/knight/head.svg` replaces `public/assets/units/blue/knight/head.svg`. The dev server serves your file straight away. `npm run art` never writes under `art/overrides`; run it after adding or changing an override so that the manifest measures your file, and a build copies overrides over the generated files.

Every part of a unit is drawn on the same 192 by 192 canvas with the feet at (96, 180), so stacking the parts at one place assembles the unit. Keep an override on that canvas.

## How it is built

**Determinism.** The simulation's only randomness is a seeded generator, and its only arithmetic is addition, subtraction, multiplication, division and square roots, which every engine rounds alike. The tests run battles twice and compare every event.

**Animation.** A unit is a rig of sprites, one to a part. Every movement is a pose, a set of offsets for the parts, blended in and out from the battle's own clock (`src/view/UnitView.ts`, `src/art/poses.ts`). A blow's swing is timed from the simulation's `attackStart` event to arrive on its `impact` event, at any speed. The contact sheet draws every unit at the far end of every pose with the same code the game uses.

**One sheet, one batch.** Every SVG is rasterized at 2x by Phaser's loader, cut to its own corners and packed onto one canvas texture (`src/view/Sheet.ts`). The whole board draws from that one texture. The game holds itself to one texture a batch (`maxTextures: 1` in `src/main.ts`), which is what Phaser gives phones anyway. A battle with sixteen units is about 7 draw calls a frame.

**Sharpness.** The game is laid out on 1280 by 720. On a dense screen the canvas is up to twice that and the cameras zoom to match (`src/view/config.ts`).

**Nothing allocated per frame.** Effects, damage numbers and shots come from pools. Damage numbers are bitmap text from digits drawn once at start.

**Sound.** `src/audio/sfx.ts` builds each sound from oscillators and filtered noise when it is asked for. A browser makes no sound until the page has been touched, so the first sound follows the first press. The speaker button mutes, and the choice is saved.

**The save** is one JSON object in the browser's local storage (`src/game/state.ts`, `src/game/storage.ts`). If storage is blocked, the game plays and forgets.

**Ads.** `src/platform/ads.ts` is an interface with `interstitial()`, `rewardedAd()`, `gameplayStart()`, `gameplayStop()` and `loadingDone()`, and an implementation that does nothing. The game already calls them in the right places. A portal's SDK is one new class and one call to `setAds`.

## Not yet looked at

- The game has only been run in a headless Chromium with a software renderer. It has not been played on a real phone or a real GPU. The frame rate measured there (about 30) says nothing about a device; the per-frame work measured (0.3 ms of update, 0.7 ms of render on this machine, 7 draw calls) suggests 60 on a mid-range phone, but nobody has seen it.
- Nobody has listened to the sounds. They are built and they play without error, and a test checks each is short and not silent. Whether they sound good is unknown.
- With more than one texture in a batch, the software renderer drew half of some sprites. One texture a batch avoids it. Whether real GPUs show the same was not tested, and with one sheet it does not matter.
- A unit that faces left is its picture mirrored, so its light comes from the top right instead of the top left.
