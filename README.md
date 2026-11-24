# Legion Battles

A 2D fantasy autobattler for the browser. You open packs to get cards, field a team of them, and battles start by themselves: your units fight on their own, a win moves you on to the next stage, and you step in to change the team, open packs or go into a dungeon.

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
| `npm run build` | Type check, then build to `dist/`. Paths are relative, so `dist/` runs from any subfolder. The build is 4.5 MB. |
| `npm test` | Every test: the simulation, the rules, the data, the line of stages, dungeons and raids, the sheets, the sounds, the build's pictures. |
| `npm run art` | Writes every picture as SVG under `public/assets`, and the manifest. |
| `npm run art:sheet` | The same, then draws the contact sheets into `docs/art` and checks colors and line widths. |
| `npm run balance` | Plays 400 skirmishes and says how long they last and who wins. |
| `npm run journey` | Plays new players along the line of stages and says where they stall. |

Six scripts play the game in a headless browser. They need the dev server running, and Playwright. Their pictures go to `docs/screens`.

```bash
node scripts/newplayer.mjs
```

```bash
node scripts/tour.mjs
```

```bash
node scripts/venture.mjs
```

```bash
node scripts/screens.mjs
```

```bash
node scripts/touch.mjs
```

```bash
node scripts/perf.mjs
```

`newplayer.mjs` starts from an empty save, watches the first battle start by itself and presses whatever the tutorial points at until it is over; with `TOUCH=1` in front it does that on a phone held sideways, with touches only. `tour.mjs` loads a save that is well into the game and visits the map, the units, the forge, the index, the packs and two bosses. `venture.mjs` walks a dungeon floor by floor and then a raid. `screens.mjs` and `touch.mjs` walk a skirmish with a mouse and with touches. `perf.mjs` measures a full battle: script time a frame with the processor slowed, draw calls, and where the time goes.

## Play it without installing anything

`.github/workflows/pages.yml` builds the game and publishes it to GitHub Pages on every push. It needs one setting, once: in the repository, Settings, Pages, Source: GitHub Actions. The game is then at `https://<owner>.github.io/LegionBattles/`.

## How the game works

**Cards.** A unit is a card. A card has a tier (Common to Legendary), which says how rare it is in its own set, a grade (F to S), which its pack rolls and which never changes, and a level, which it earns. Grade and level multiply its health and damage. A grade is always shown as its badge, which grows grander as grades rise.

**Every card is its own.** A pack always turns over a card, and a copy of a unit you already hold is another card with its own grade and level. You can field it beside the first (a team can have two Knights) or combine it away.

**Combining.** COMBINE, on a card in UNITS, turns the screen into a forge. The card you chose grows, each card you mark is given up, and the panel says what level that makes before COMBINE asks once. Any card can be given up to any other. A copy of the card's own unit gives twice what another unit does, and a better grade, a rarer unit and a higher level give more. A card gives a fifth less than the experience it holds, so passing levels from card to card makes nothing. A card in the team is kept.

**UNITS and the INDEX.** UNITS lists only the cards you hold. SORT steps through unit, power, grade, level, rarity, health and damage. FILL TEAM fields the strongest team with a mix of roles. INDEX, on that screen, is the page of every unit there is.

**Packs.** Every pack holds one card. A pack names its set and the grades it can hand out, and holds every unit of its set from the start: nothing in it has to be unlocked.

**Battles.** The board is 8 by 4 tiles: yours are the left half. Units walk to the nearest enemy, attack on their own rhythm, and use their skill whenever it is ready. Over each unit is its plate: its level on the color of its tier, its health, and its grade. A battle lasts about 15 to 30 seconds.

**Battles start by themselves.** BATTLE counts down two seconds and presses itself. A first win moves on to the next stage. A win at a stage already cleared stays there, so a team left alone earns from a stage it can beat. A loss steps back one stage, and a changed team goes back to the stage it lost at. AUTO stops battles starting by themselves; the count also waits while a screen is open or a unit is being dragged.

**The line of stages.** There is one line of 185 stages, numbered from 1, and that number says how far you have got. A world is a stretch of it in one land: World 1 is Thornwood, stages 1 to 10, World 2 Sunscar Dunes, 11 to 22, World 3 Frostholt, 23 to 37. Then the line runs through the three lands again, four more times, each harder: World 4 is Thornwood II. Enemies grow stronger with the stage's number, and so do what a win pays, what it teaches and the price of the pack it drops. Each land has minibosses and ends in a boss.

**The map.** The main screen shows only the stage you are on, under the banner of its world. Pressing it opens the map of that world: a painted land with a road from stage to stage, a camp at each, a watchtower where a miniboss waits and a stronghold for the boss. Press an open stage to go there. The arrows turn to the worlds on either side that you have reached.

**The team** starts at four and grows at stages 5, 10, 22 and 37, up to eight.

**Dungeons.** A dungeon is a run of floors fought one after another with one roster: your team and two reserves. Nothing heals between floors and the fallen stay fallen, so the camp between floors shows what each card has left, and pressing a card sends it in or rests it. A floor lost ends the run. Only clearing the last floor pays: coins and two of the land's pack one lap better than the line is dropping there.

**Raids.** A raid is one long battle against a land's lord, grown huge, who calls up more of his own for as long as he stands. Every win pays, more than a dungeon, and it can be fought again at once.

There is one dungeon and one raid to a land. The dungeons open at stages 10, 22 and 37 and the raids at 22, 37 and 47. Each has five tiers, each opened by clearing the one before. DUNGEONS, on the main screen, opens their hall.

**The tutorial.** A new player is shown the first battle, a pack, the team and the stage's plate. Which step is up is worked out from the save, so a reload in the middle carries on.

**What you have not met is dark.** A unit you have never held or beaten is a black outline named "???". So is a pack that is not sold yet, and a dungeon or raid that is not open. A stage that is not open is a lock on the map.

**Skirmish.** SKIRMISH on the map, or `?seed=N` in the address, plays the first four units against four random enemies. The same seed and the same placement always give the same battle.

Press `D` in a battle for the debug overlay: tiles, ranges, targets, frame rate, and how full the art sheet is.

## Where things are

| Folder | What is in it |
| --- | --- |
| `src/sim` | The battle. Pure TypeScript, no Phaser. Fixed 50 ms steps, a seeded generator, events for the view. |
| `src/data` | The numbers: units, the lands and their stages, the laps, the line of stages, packs, dungeons and raids. |
| `src/game` | The rules around the battles: cards and combining, sorting, packs, progress, the run of battles, dungeons and raids, the tutorial, the save. Pure TypeScript. |
| `src/art` | The art, as code. `kit/` is the palette and the reusable parts, `units/` is one file to a unit, `scenery.ts` and `backdrop.ts` are the painted scenes. |
| `src/audio` | The sounds, as code. |
| `src/view` | Phaser: the scenes, the board, the unit rig, effects, the interface. |
| `src/platform` | The ads interface a portal's SDK will plug into. It does nothing yet. |
| `scripts` | Art generation, contact sheets, balance and journey reports, browser walks. |
| `tests` | Vitest. |
| `art/overrides` | Hand-edited SVGs that take the place of generated ones. |
| `docs/art`, `docs/screens` | The contact sheets and the screenshots. |

## Tuning

**A unit's numbers** are in `src/data/units.ts`. They are written at the strength of the first set; a set's `power` multiplies them, which is how later lands outdo earlier ones. After a change:

```bash
npm run balance
```

That prints the spread of skirmish lengths (84% fall between 15 and 30 seconds) and a table of every unit against every other.

**A stage** is one line in `src/data/lands.ts`: who stands where, and the grade and level they stand at the first time the line comes through. **The line** is built from the lands in `src/data/stages.ts`: after the first lap, a troop's strength climbs from a step above the first lap's last boss to `TOP` at stage 185, and each stage's grade and level are worked out from that. **A lap** (`src/data/laps.ts`) says the fewest enemies a stage fields and how much of a land's `weight` counts. After changing any of these, a pack, what a win pays, or anything a player's growth depends on:

```bash
npm run journey 12 --worlds=15 --losses
```

It plays twelve new players along the line by the game's own rules and prints, for each world, how many battles it took, how many were lost, and how strong the team was when the boss fell. `--losses` lists the stages that beat players most often, which is where the walls are. Without `--worlds` it plays the first three. As tuned now, all twelve finish the line: half of them in under about 730 battles, the slowest in 939.

| World | Stages | Battles, half took under | Lost |
| --- | --- | --- | --- |
| 1 Thornwood | 1 to 10 | 32 | 34% |
| 2 Sunscar Dunes | 11 to 22 | 70 | 46% |
| 3 Frostholt | 23 to 37 | 50 | 35% |
| 4 to 6, the second lap | 38 to 74 | 20, 23, 17 | 24%, 33%, 16% |
| 7 to 9, the third lap | 75 to 111 | 54, 81, 29 | 41%, 48%, 30% |
| 10 to 12, the fourth lap | 112 to 148 | 18, 22, 75 | 30%, 38%, 41% |
| 13 to 15, the fifth lap | 149 to 185 | 12, 12, 17 | 13%, 20%, 31% |

The simulated players are plain: they buy the dearest pack on sale, combine every copy into the best card of its unit and every idle card into their team, and press FILL TEAM. Twelve of them is few: read what half of them took before the average. One of the twelve took 419 battles over World 8, which is the nearest thing to a wall on the line. The last lap is gentler than the fourth, because by then cards are at their last level.

**Grades, levels and tiers** are in `src/game/rarity.ts`. **Combining** is in `src/game/cards.ts`. **Team size and drop chance** are in `src/game/rules.ts`. **Packs** are in `src/data/packs.ts`. **Dungeons and raids** are in `src/data/expeditions.ts`, and what they pay at the top of `src/game/expeditions.ts`. Nobody has measured how hard each tier of a dungeon or a raid is for the team a player has when it opens: they stand a little above the land's own boss on that lap, and that is all.

## Adding things

**A unit.** Add its numbers to `src/data/units.ts` and its art to `src/art/units` (see `ART_GUIDE.md`). Run `npm run art:sheet` and look at the sheets. Run `npm test`: it fails if a unit has numbers and no art, or art and no numbers, or if the sheets the game packs its art onto are full.

**A land.** Add an entry to `LANDS` in `src/data/lands.ts` with a `weight`, a set to `SETS` and its units in `units.ts`, and a pack in `packs.ts` with a look in `src/art/packs.ts`. If its kind of ground is new, add its colors to `src/art/board.ts`, its scenery to `src/art/scenery.ts` and its look to `LOOKS` in `src/art/backdrop.ts`, and an emblem to `src/art/icons.ts`. The line grows by itself: every lap gets the new land's stages. The tests hold a land to the rules: 10 to 25 stages, never fewer than the land before and never more than 5 more; one boss, at the end; a miniboss before it; only its own set's units. Then run the journey report and set the grades, levels and weight by what it says.

**A dungeon or a raid.** An entry in `src/data/expeditions.ts`: its land, the stage it opens at, and its floors written as stages are, or its lord, his guard and who he calls up. The tests go through every floor of every dungeon and every raid.

**A skill.** A skill is data on a unit: a kind (`strike`, `cleave`, `blast`, `volley`, `drain`, `mend`, `boon`, `hex`), a cooldown, and the kind's numbers. A new kind is a case in `useSkill` in `src/sim/battle.ts`, with a test.

**A sound.** A recipe in `src/audio/sfx.ts`: a few tones and bursts of noise. The test builds every one.

## Regenerating art, and editing it by hand

```bash
npm run art
```

writes `public/assets/units/<team>/<unit>/<part>.svg` for both teams, a whole-unit `full.svg` for the menus, the effects, the icons, the packs, the grade badges, the painted ground of a battle in each kind of land (`board/`), the map of each land (`maps/`), and `public/assets/manifest.json`, which lists each unit's parts in draw order with their pivots.

To change a picture by hand, copy it to the same path under `art/overrides` and edit it there, in Inkscape or anything else. For example `art/overrides/units/blue/knight/head.svg` replaces `public/assets/units/blue/knight/head.svg`. The dev server serves your file straight away. `npm run art` never writes under `art/overrides`; run it after adding or changing an override so that the manifest measures your file, and a build copies overrides over the generated files.

Every part of a unit is drawn on the same 192 by 192 canvas with the feet at (96, 180), so stacking the parts at one place assembles the unit. A unit's file has 40 px of page round that canvas, because a long spear held level reaches past it: keep an override on the same page (`viewBox="-40 -40 272 272"`). The art build fails on a part that reaches the edge of the page.

The files in the repository are written to be read: every shape has an id that says what it is. A build makes its own copies small (unused ids gone, spaces gone), which is a third of their size. A test draws both and compares every pixel.

## How it is built

**Determinism.** The simulation's only randomness is a seeded generator, and its only arithmetic is addition, subtraction, multiplication, division and square roots, which every engine rounds alike. The tests run battles twice and compare every event. The line of stages is worked out with the same arithmetic, so every machine has the same line.

**Animation.** A unit is a rig of sprites, one to a part. Every movement is a pose, a set of offsets for the parts, blended in and out from the battle's own clock (`src/view/UnitView.ts`, `src/art/poses.ts`). A blow's swing is timed from the simulation's `attackStart` event to arrive on its `impact` event, at any speed. The contact sheet draws every unit at the far end of every pose with the same code the game uses.

**One sheet, and one picture under it.** Every unit part, effect and icon is rasterized at 2x by Phaser's loader, cut to its own corners and packed onto one canvas texture (`src/view/Sheet.ts`). The ground of a battle is one painted picture the size of the screen (`src/view/Scenes.ts`), loaded when its land is come to; one is held at a time. The game holds itself to one texture a batch (`maxTextures: 1` in `src/main.ts`). A battle with sixteen units is 30 to 35 draw calls a frame, most of them the interface's text.

**Frame rate.** The canvas is not multisampled on a dense screen, the faster of two graphics chips is asked for, and the board is not drawn while a screen is open over it. The game watches its own frames: when most of them are slower than 45 a second for four seconds, it draws at half a step less resolution from then on and remembers that for the next visit. `?res=2` in the address fixes the resolution.

**Sharpness.** The game is laid out on 1280 by 720. On a dense screen the canvas is up to twice that and the cameras zoom to match (`src/view/config.ts`).

**Nothing allocated per frame.** Effects, damage numbers and shots come from pools. Damage numbers, and the level and grade on a unit's plate, are bitmap text from characters drawn once at start.

**Sound.** `src/audio/sfx.ts` builds each sound from oscillators and filtered noise when it is asked for. A browser makes no sound until the page has been touched, so the first sound follows the first press. The speaker button mutes, and the choice is saved.

**The save** is one JSON object in the browser's local storage (`src/game/state.ts`, `src/game/storage.ts`). It is at its fourth version, and each of the three before it is carried over when it is loaded: one card to a unit became cards of their own, and worlds with difficulties became the line. A run of a dungeon is not saved: leaving the game in the middle of one gives it up. If storage is blocked, the game plays and forgets.

**Ads.** `src/platform/ads.ts` is an interface with `interstitial()`, `rewardedAd()`, `gameplayStart()`, `gameplayStop()` and `loadingDone()`, and an implementation that does nothing. The game already calls them in the right places. A portal's SDK is one new class and one call to `setAds`.

## Left out of what the Roblox game has

Dungeons and raids are modelled on the owner's Roblox autobattler, and are smaller than its: a raid is fought on the same 8 by 4 board with the same team, not on a bigger field with three times the team; no unit raises the fallen or stands still as a spawner; and a dungeon's enemies are its land's own units, not a set met nowhere else, so its prize is a better pack of that land and not a pack of its own.

## Not yet looked at

- The game has only been run in a headless Chromium with a software renderer. It has not been played on a real phone or a real graphics chip. What was measured is the script side (about 5 ms a frame in a full battle on this machine, 17 ms with the processor slowed four times, both with the software renderer's own work in them) and the draw calls (30 to 35). What a real chip does with it nobody has seen, and the changes made for the frame rate are the usual ones, not ones measured on a device.
- Nobody has listened to the sounds. They are built and they play without error, and a test checks each is short and not silent. Whether they sound good is unknown.
- The dungeons and raids were walked once each in the browser at their first tier with a strong team. How hard each tier is for a real player's team is not measured.
- The line was tuned with simulated players who are cruder than people. A real player may find the second lap too easy or the fourth too slow.
- With more than one texture in a batch, the software renderer drew half of some sprites. One texture a batch avoids it. Whether real graphics chips show the same was not tested.
- A unit that faces left is its picture mirrored, so its light comes from the top right instead of the top left.
