# Legion Holdout

A hero survival game for the browser. You choose a hero, and the waves come. You steer; what you carry strikes by itself. Between waves you level and trade in the camp. You hold out for as long as you can.

It is the third game drawn with the Legion art (after Legion Battles, an auto battler, and Legion Idle), and uses the same kit: every picture is drawn in code as SVG, nothing has a face, and its cast is the kit's.

It was made in one sitting, in a cloud session with no screen and no sound. The end of this file says what nobody has looked at yet.

## How it plays

- **Move.** WASD or the arrow keys, or hold the mouse or a finger down anywhere and drag: that is a stick wherever it was put down. P pauses. Nothing else is pressed while a wave is fought.
- **A wave** lasts from twenty seconds to a minute. Enemies are marked on the ground a moment before they stand there, and come from every side. Stay alive until the clock runs out and whoever is left leaves the field. Every coin on the ground comes to you then.
- **What you carry** strikes whoever is nearest and in reach, each thing in its own time. There are sixteen weapons of three kinds (blades and the like, things shot and thrown, magic) and six hands to carry them in.
- **Coins** are left by the fallen. They are what the camp takes, and they are experience too.
- **The camp**, between waves. For every level made, one of four things to raise. Then four wares: weapons and things. Two weapons of a kind and a tier can be joined into one of the next tier, up to the fourth. A ware can be locked, to be there next time. Other wares can be asked for, at a price that rises.
- **Enemies** do different things, and each warns of it. Some walk at you. Some keep off and shoot what can be stepped out of. Some stop, turn and charge down a line shown on the ground. Some run in and burst in a ring shown on the ground. Some call others up, and some drum the rest on faster.
- **A boss** leads the seventh, the fourteenth and the twentieth wave. Beat it and the wave is won at once. It leaves a pack, which holds a thing for nothing.
- **After the twentieth wave** the same twenty come round again, far harder each time. How many waves a hero came through is the score.
- **Heroes.** Ten, of whom two are open at the start. Each has a weapon of their own, numbers of their own, and one rule that is theirs alone. The rest are opened by feats: coming through a wave, beating a boss, gathering coins in one run, felling enemies over all runs. One who is not open is a dark shape with no name, and what opens them is said.
- **A run left in its camp** is kept: shut the page there and it can be carried on.

A new player lands in the field at once, as the Knight, with the keys shown. The list of heroes comes after the first fall.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open `http://127.0.0.1:5175/`.

```bash
npm run check
```

That is the type check, every test and a build. All three have to pass before a commit.

| Command | What it does |
| --- | --- |
| `npm test` | The tests: a wave's rules, a run and the camp, the save, the art, the sounds, the portal. A few seconds. |
| `npm run art` | Writes every picture the game uses to `public/assets`, and the manifest. Run it after changing anything under `src/art`, or a hero, an enemy, a weapon or a ware in `src/game/data.ts`. |
| `npm run art:sheet` | Draws the contact sheets to `docs/art` and fails on a color off the palette or a line of the wrong width. Look at them after drawing anything. |
| `npm run art:roster -- [unit, set or role ...]` | Draws any of the kit's 202 units to `build/roster.png`. `-- check` holds every one to the style. |
| `npm run pace -- [--runs=12] [--hero=knight] [--waves=40] [--why]` | Plays runs with a plain computer player, in seconds, and says how many come through each wave, with how much health, how many coins and how many kills. `--why` says who hurt the hero on each wave. The numbers in `src/game/data.ts` are set by it. |
| `npm run walk [state ...] [--size=frame,small,full,phone-wide,phone-tall]` | With `npm run dev` running: pictures of every state of the game to `build/walk`, at a portal's frame sizes and on a phone. |
| `npm run smoke` | With `npm run dev` running: plays the game through its own buttons, with keys and mouse and then by touch, and fails if a press does not do what it says. |
| `npm run film` | With `npm run dev` running: films the game frame by frame to `build/film`, and says how to make a clip of it. It is how the game is seen moving where there is no screen. |
| `npm run cover` | Draws the three covers a portal asks for to `docs/covers`. |
| `npm run build:crazygames` | The copy to upload to CrazyGames, into `dist-crazygames`. `npm run package:crazygames` zips it to `build/legion-holdout-crazygames.zip`. |

## Where things are

| Path | What is there |
| --- | --- |
| `src/game/data.ts` | Every number: heroes, weapons, wares, what a level can raise, enemies, waves, prices. Each says what it is for. |
| `src/game/world.ts` | One wave as it is fought, with no screen: the hero, the enemies, what flies, what lies on the ground. The same seed and the same steering give the same wave. |
| `src/game/run.ts` | A run: what a wave leaves it with, levels, the camp's wares, buying, joining, selling. |
| `src/game/stats.ts` | What a hero is, as numbers, and how lines of them add up. |
| `src/game/state.ts`, `storage.ts` | What is kept between visits, and where. |
| `src/game/bot.ts` | The plain computer player the pace report and the tests use. The game never does. |
| `src/art` | The art kit and everything drawn with it. `holdout.ts` is this game's own: the weapons as pictures, the wares, the marks of the stats, the arena's ground. |
| `src/view/scenes` | `BootScene` loads. `ArenaScene` is the field. `HudScene` lies over it and takes the steering. `CampScene` is the camp, `TitleScene` the list of heroes, `ResultScene` the end of a run. `AssetsScene` loads pictures while the game runs. |
| `src/view/art` | The art's runtime: `Sheet` packs pictures onto one texture, `Figure` moves a figure's parts by the rig. |
| `src/view/config.ts` | How the screen is fitted to a window. |
| `src/view/input.ts` | The keys and the stick. |
| `src/audio` | The sounds and the music, which are the first game's. `public/assets/audio/CREDITS.txt` names where the recordings came from and is shipped with the game. |
| `src/platform` | The portal: CrazyGames' SDK for the save, the player's name and ads. |
| `scripts` | `art`, `sheet` and `roster` are the kit's. `art.game.ts` says what this game shows of the kit. The rest are this game's. |

## How it is put together

**The wave is pure.** `World` is stepped sixty times a second with which way the hero is steered, and knows nothing of the screen. The field shows what it finds there and plays what it is told has happened (a blow, a fall, a burst). That is what lets a test fight a wave and the pace report play a thousand.

**The horde is one picture each.** A hero and a boss are figures moved part by part by the kit's rig. An enemy of the horde is two whole pictures, a step and standing, changed in turn: there can be a hundred of them on the field. The art build writes those pictures (`stills` in `scripts/art.game.ts`), which the kit's build could not do before this game.

**What a hero carries is drawn beside them.** Each weapon is the kit's own drawing of it, by itself, with the hand that holds it. The hero's own picture has a bare hand in place of what it held.

**Everything on the field is on one sheet**, 2048 by 4096, and a field's pictures are brought onto it together as the wave begins. A test packs it as the game does and fails when a field no longer fits.

**The screen has no fixed shape.** A wide window is 600 of the layout's units high, a tall one 600 wide. That is fewer than the sister games have, so that the smallest words are still eleven pixels tall in the smallest frame a portal shows a game in (821 by 462). The arena lies down in a wide window and stands on end in a tall one.

## Adding to it

**A hero.** A line in `HEROES`: the kit's unit that draws them, their weapon, their numbers, their one rule, and what opens them. A new rule is a name in `Flag` and its few lines in `world.ts` or `run.ts`, with a test. Then `npm run art`, and `npm run pace -- --hero=<id>`.

**A weapon.** A line in `WEAPONS`, and its drawing in `ARMS` in `src/art/holdout.ts`, which is one of the kit's eighty. A test fails until both are there.

**A ware.** A line in `ITEMS`, and its picture's name in `src/view/icons.ts`.

**An enemy.** A line in `ENEMIES` with the way it fights, and its name in the waves it comes on (`MIXES`). Any unit in `docs/art/roster.md` can be one.

**A way of fighting.** A name in `Ai`, its case in `think` and `loose` in `world.ts`, its warning in `warn` in `ArenaScene.ts`, and a test.

## The pace

`npm run pace` is how the numbers were set. Its player steers away from what would hurt and toward what lies about, a fifth of a second late and never quite true, and buys what it can afford with no plan. As last measured, with twelve runs to a hero:

| Hero | Half come through | Fewest | Most |
| --- | --- | --- | --- |
| Knight | 10 | 7 | 17 |
| Archer | 8 | 3 | 17 |
| Mage | 9 | 5 | 13 |
| Cutpurse | 8 | 5 | 27 |
| Pyromancer | 8 | 5 | 12 |
| Lancer | 10 | 6 | 31 |
| Berserker | 10 | 8 | 30 |
| Cleric | 7 | 6 | 9 |
| Frost Witch | 8 | 5 | 27 |
| Paladin | 8 | 4 | 32 |

The first five waves cost it a tenth of its health or so each, the sixth half, and the first boss a quarter. What stops it most often is the eleventh wave and the second boss. A run that gets its hands full of good weapons early goes on past the thirtieth.

Twelve runs are few, and that player is not a person. A person plans what to buy, which it does not, and sees less of the field at once than it does.

## For a portal

- It lands in play: a new player is in the field on the first frame after loading, and anyone else is one press away.
- It fits any frame with no bars, and was looked at in 907 by 510, 821 by 462, 1920 by 1080 and on a phone both ways.
- Keys are read by where they are on the keyboard, so the same four steer on a keyboard laid out another way. Escape is not used. The arrow keys, the space bar and the wheel do not scroll the page it is in.
- It has no full screen button of its own, no links out, and nothing in it but its own drawings and the recorded sounds it credits.
- The build is 3.3 MB.
- On CrazyGames it keeps the save with the player's account, says when play starts and stops, and may show something between waves. Its code for that is the first game's.

## Not yet looked at

This was built in a cloud session with no screen and no sound.

- Nobody has played it. Every picture of it was taken in a headless browser on a clock stepped by a script, and the clip was made of those pictures. How it feels to steer, whether a wave is too long or the first minute too slow, is not known.
- Nobody has heard it. The sounds and the music are the first game's, which its owner has heard. Which sound plays when is new here and was chosen by reading: a crowded wave may be too loud or too busy.
- The difficulty was set with a computer player. Whether a person's first run ends on the third wave or the tenth, nobody knows.
- How fast it runs on a real device is not known. A hundred enemies are a hundred sprites and their numbers, which the headless browser's software drawing says nothing about.
- Touch was tried only as a headless browser makes it: a finger dragged, a button tapped. Two fingers at once were not.
- The CrazyGames copy has not been run on their page. Its code is the first game's, which has.
- A boss is only told from another by its picture and its numbers: all three fight the same way.
- Past the twentieth wave the game is the same twenty waves again, harder. It has not been played that far by anyone but the computer.
- This game added three things to the art kit (whole pictures at a pose in the art build and on the sheet, a bare hand on a figure, two letters for the logo). They are here and not yet in the copy of the art skill that the other two games carry.
