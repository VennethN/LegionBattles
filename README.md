# Legion Idle

An idle game for the browser. A legion marches a road that never ends and fights whoever bars it. The player hires heroes, levels them, builds a camp behind them, and comes back later to a fuller purse. It is drawn in the same art as Legion Battles, by the same code: every picture is an SVG written by a program, and nothing in it was drawn by hand or by a model.

It runs on a wide screen and on a phone held upright, and fills either with no bars.

This branch is a temporary home for it, beside Legion Battles in the same repository. The two share no files. It is meant to move to a repository of its own.

## Run it

```sh
npm install
npm run dev        # the game, on http://127.0.0.1:5174/
npm run check      # the type check, every test, and a build
```

Other things to run:

| Command | What it does |
| --- | --- |
| `npm test` | The tests of the rules, the fight, the save, the sound and the art. A second or two. |
| `npm run art` | Writes every picture the game uses to `public/assets`, and the manifest that says how figures are put together. Run it after changing anything under `src/art`. |
| `npm run art:sheet` | Draws the contact sheets to `docs/art` (every unit, part, pose and silhouette, the grounds, the logo) and fails on a color off the palette or a line of the wrong width. Look at them after drawing anything: no program can see a face. |
| `npm run art:preview [unit ...]` | Draws units side by side to `build/preview.png`, to look at while drawing one. |
| `npm run pace -- --hours=3 [--taps=4] [--each]` | Plays the game by its own rules in seconds and says how long each stretch of the road takes. The numbers in `src/game/data.ts` are set by what it prints. |
| `npm run walk [state ...]` | With `npm run dev` running: pictures of the game in every state a player meets, on a wide screen and a phone, to `build/walk`. |
| `npm run cover` | Draws the three covers a portal asks for to `docs/covers`. |
| `npm run build` | The game, built to `dist`. |
| `npm run package:crazygames` | The build that is uploaded to CrazyGames, to `dist-crazygames`, and a zip of it in `build`. |

## How it plays

**The road.** Stages are numbered from 1 and have no end. Ten stages are a land. In a plain stage ten enemies come one after another. The fifth stage of a land is its captain and the tenth is its boss: one enemy each, much stronger, and to be brought down before a clock runs out. A legion that fails is set back a stage and holds there until it is strong enough, or until the player presses FIGHT. There are three lands, Thornwood, the Sunscar Dunes and Frostholt, each with its own enemies, ground and music. After the third the road goes through them again, harder: Thornwood II, and on.

**Heroes.** They are hired in order, each dearer and stronger than the one before. A hero strikes by itself, on its own beat. Each level costs a little more than the last. A hero's own damage doubles at levels 10, 25, 50, 75 and 100, and every 25 levels after. At level 25 each gives something to the whole legion (damage, gold, or the strength of a tap), and twice that at level 100. Who has not been hired yet is shown dark, as "???".

**Taps.** A press on the fight is a blow. It is worth a little by itself and a share of what the legion does in a second, so it never stops mattering. One in ten is a telling blow.

**The camp.** Eight things are built behind the legion and raised level by level: more damage, more gold, stronger taps, a tower that shoots, cheaper heroes, more earned while away, more time against bosses, a quicker march.

**Abilities.** Three, each given the first time a stage is reached: Rally (double damage for a while), Volley (many seconds of the legion's damage at once) and Plunder (triple gold for a while). Each rests before it can be used again.

**Supply packs.** One lands on the field every few minutes and waits a while to be pressed. It holds gold, or a while of an ability.

**Away.** With the game shut, or its tab hidden, the legion earns a share of what it would have, for a number of hours. A card says what it earned when the player comes back.

**Rebirth.** From stage 30 a run can be given up for laurels: the further it went, the more. The road, the purse, the heroes' levels and the camp go. Laurels stay: each one ever won is more damage for good, and they are spent on eight honors that last through every rebirth. A rebirth is how a legion that has stopped gets going again.

**Feats.** Things done once: a stage reached, heroes hired, bosses felled. Each is a little more damage and gold, for good.

## Where things are

| Path | What is there |
| --- | --- |
| `src/game/data.ts` | Every number and name: the lands, the heroes, the camp, the abilities, the honors, the feats. |
| `src/game/rules.ts` | What everything is worth, given a save. Pure arithmetic. |
| `src/game/battle.ts` | The fight: it moves on by a tick and says what happened. It draws nothing. |
| `src/game/state.ts` | The save, and how one read from storage is made safe to use. |
| `src/game/format.ts` | How a number is written: 999, 1.23K, 7.70aa. |
| `src/game/storage.ts` | Where the save is kept. |
| `src/art` | The art kit and everything drawn with it. `march.ts` is the ground the legion marches over, `icons-idle.ts` this game's icons, `logo.ts` its title. |
| `src/view/StageView.ts` | The fight as it is seen: the ground, the legion in ranks, the camp, the enemy, coins and packs. |
| `src/view/scenes` | `BootScene` loads, `GameScene` is the one screen, `ListScene` is the scrolling lists, `ModalScene` the cards that come up over everything, `AssetsScene` loads pictures while the game runs. |
| `src/view/art` | The art's runtime: `Sheet` packs pictures onto one texture, `Figure` moves a figure's parts by the rig. |
| `src/view/config.ts`, `src/view/app.ts` | How the screen is fitted to a window, and how it is cut into the fight and the lists. |
| `src/audio` | The sounds and the music, which is written as notes and played on recorded instruments. |
| `src/platform` | The portal: CrazyGames' SDK for the save, the player's name and ads. |
| `scripts` | `art` and `sheet` are the kit's and the same for every game; `art.game.ts` says what this game shows of the kit. `pace`, `walk` and `cover` are this game's. |
| `tests` | Vitest. |
| `.claude/skills/legion-art` | The art style as a skill: its rules, the kit, and how to draw with it. |

## Adding to it

**A hero.** A line in `HEROES` in `data.ts`: its unit (a figure the kit draws), its name, how often it strikes, whether it shoots, where it stands in the ranks (file from the front, rank from the top), and what it gives the legion at level 25. A hero that shoots or casts gets a line in `SHOTS` in `StageView.ts`. Then `npm run art`, and `npm run pace` to see what it did to the road. `tests/sheet.test.ts` fails if the art no longer fits its sheet.

**A land.** An entry in `LANDS`: its name, its kind of ground, four or five troops from lightest to heaviest, a captain and a boss. A new kind of ground needs its colors in `src/art/ground.ts`, its scenery in `LOOKS` in `src/art/march.ts`, an emblem icon named `land-` and the ground, a pack in `PACKS` in `StageView.ts`, and a tune in `THEMES` in `src/audio/music.ts`. `tests/art.test.ts` says which of those is missing.

**Something for the camp, an honor, a feat.** A line in `CAMP`, `HONORS` or `FEATS`. A new kind of effect also needs its rule in `rules.ts` and its words in `src/view/ui/texts.ts`.

**A picture.** Read `.claude/skills/legion-art/SKILL.md` first. The style has hard rules that a program can only partly check, the first being that nothing has a face. A new icon has to be named in `scripts/art.game.ts` to be written. After changing anything under `src/art`, take it back into the skill, which a test holds to: `node .claude/skills/legion-art/scripts/sync.mjs .`

## The pace

`npm run pace` is how the numbers were set. As it stands, a player who never taps and buys what is best reaches the first boss in about three and a half minutes and stage 30 in about ten. The first run slows to a stop near stage 80 after thirty to forty minutes, and its rebirth is worth a few dozen laurels. Each run after goes faster and further. Tapping roughly halves the early times.

What moves the pace most: `HP_GROWTH` (how much harder each stage is), `HERO_COST_STEP` against `HERO_DPS_STEP` (what a new hero costs against what it adds), `GOLD_SHARE`, and what laurels and honors are worth. Run the report before and after changing any of them.

## CrazyGames

`npm run package:crazygames` makes the upload. The portal takes the files, not a zip: unzip it and drag `index.html`, `assets` and `bundle` in. That build asks for their SDK when it starts; the save is then kept with the player's account through it. The plain build keeps the save in the browser.

The covers are in `docs/covers`: 1920 by 1080, 800 by 1200 and 800 by 800. Orientation is set in their form: the game plays in both.

## Not yet looked at

This was built in a cloud session with no screen and no sound.

- Nobody has played it on a real device. Every picture of it was taken in a headless browser that draws with software, at a few frames a second, so how smoothly it runs is not known. The first game ran well on phones with the same art runtime, which is a reason for hope and not a measurement.
- Nobody has heard it. The sounds and instruments are the first game's, which its owner has heard; which sound plays when is new here and was chosen by reading.
- Touch has not been tried on a phone: dragging the lists, and tapping the fight with more than one finger.
- The CrazyGames build has not been run on their page. Its code is the first game's, which has.
- The pace is measured by a program that buys perfectly. A person does not.
