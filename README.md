# Lastander

A hero survival game for the browser. You choose a hero, who has a name, a weapon of their own, a quirk and one great move, and a companion to go with them, and the waves come. You steer; what you carry strikes by itself. Between waves you level and trade in the camp. You hold out for as long as you can.

It is being reworked: `docs/design.md` says into what, and `docs/journal.md` how far that has come.

It is the third game drawn with the Legion art (after Legion Battles, an auto battler, and Legion Idle), and uses the same kit: every picture is drawn in code as SVG, nothing has a face, and its cast is the kit's.

It was made in one sitting, in a cloud session with no screen and no sound. The end of this file says what nobody has looked at yet.

## How it plays

- **Move.** WASD or the arrow keys, or hold the mouse or a finger down anywhere and drag: that is a stick wherever it was put down. P pauses.
- **The move.** Kills fill a bar. When it is full the hero's one great deed is let loose: by the space bar, the other button of the mouse, or its button in the corner under a thumb. For a new player it goes off by itself when it is full and there is a crowd for it (AUTO MOVE, in the pause panel).
- **A wave** lasts from twenty seconds to a minute. Enemies are marked on the ground a moment before they stand there, and come from every side. Stay alive until the clock runs out and whoever is left leaves the field. Every coin on the ground comes to you then.
- **What you carry** strikes whoever is nearest and in reach, each thing in its own time. A hero has a weapon of their own, which nobody else can have: it takes no hand, is never sold, and grows a tier by itself at levels 5, 10 and 15. Besides it there are sixteen weapons to buy, of three kinds (blades and the like, things shot and thrown, magic), and six hands to carry them in.
- **Coins** are left by the fallen. They are what the camp takes, and they are experience too.
- **The camp**, between waves. For every level made, one of four things to raise; now and then one of them is a bond with a companion who is along, three steps each. Then four wares: weapons and things. Two weapons of a kind and a tier can be joined into one of the next tier, up to the fourth. A ware can be locked, to be there next time. Other wares can be asked for, at a price that rises.
- **Enemies** do different things, and each warns of it. Some walk at you. Some keep off and shoot what can be stepped out of. Some stop, turn and charge down a line shown on the ground. Some run in and burst in a ring shown on the ground. Some call others up, and some drum the rest on faster.
- **A boss** leads the seventh, the fourteenth and the twentieth wave. Beat it and the wave is won at once. It leaves a pack, which holds a thing for nothing.
- **After the twentieth wave** the same twenty come round again, far harder each time. How many waves a hero came through is the score.
- **Heroes.** Ten, each with a name, of whom two are open at the start. Each has a weapon of their own, numbers of their own, a quirk that asks to be played round, and a move. Bram Oakenhold sets his shield when he stands still. Wren Fallowmere hits harder every second nothing touches her. Every third spell of Orrin Quillon's is cast twice. Fenn Two-Coins hits harder the more coins he holds. What dies burning by Old Nan Cinderwick bursts and lights its neighbors. Isaura Vane hits harder the longer she keeps moving. Hroth gets up once from a killing blow. Brother Aldous Bell brings one companion more. What Ysolde Rimeheart has slowed, struck again, freezes. Maren Dawnguard's hammer leaves holy ground. `docs/design.md` has them all, with their moves. The rest are opened by feats: coming through a wave, beating a boss, gathering coins in one run, felling enemies over all runs. One who is not open is a dark shape with no name, and what opens them is said.
- **Companions.** Eight, opened by feats as the heroes are; the first, Biscuit the war hound, comes when the first run ends. One goes on a run (two once the Hold opens a second place, which is not built yet; Aldous brings one more). Each fights by itself and has a quirk of its own: Biscuit fetches coins, Pip the wisp flashes when the hero is struck, enemies go for Mossback the turtle, Quill the eagle hunts those who shoot, Greta the bear roars, Ember the salamander leaves fire where it runs, everyone strikes faster by Tam's banner and once in a run he gets a fallen hero up, and Thistle the stag charges through the line. A companion has health: struck down, it sits out for a few seconds and gets up, and it is whole again at each camp. It grows with the hero's level.
- **A run left in its camp** is kept: shut the page there and it can be carried on.

A new player lands in the field at once, as Bram, with the keys shown. The list of heroes comes after the first fall, and Biscuit with it.

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
| `npm run pace -- [--runs=12] [--hero=bram] [--band=biscuit,pip] [--friends] [--waves=40] [--brief] [--why]` | Plays runs with a plain computer player and says how many come through each wave, with how much health, how many coins and kills, how much of the wave the band was on its feet, and how many moves were let loose. `--band` names who goes along; `--friends` plays one hero alone and with each companion in turn; `--brief` is one line to a hero; `--why` says who hurt the hero on each wave; `--nomove`, `--noquirk` and `--nogrow` take a part of the hero away, to find what it is worth. The numbers in `src/game` are set by it. |
| `npm run walk [state ...] [--size=frame,small,full,phone-wide,phone-tall]` | With `npm run dev` running: pictures of every state of the game to `build/walk`, at a portal's frame sizes and on a phone. |
| `npm run smoke` | With `npm run dev` running: plays the game through its own buttons, with keys and mouse and then by touch, and fails if a press does not do what it says. |
| `npm run film` | With `npm run dev` running: films the game frame by frame to `build/film`, and says how to make a clip of it. It is how the game is seen moving where there is no screen. |
| `npm run cover` | Draws the three covers a portal asks for to `docs/covers`. |
| `npm run build:crazygames` | The copy to upload to CrazyGames, into `dist-crazygames`. `npm run package:crazygames` zips it to `build/lastander-crazygames.zip`. |

## Where things are

| Path | What is there |
| --- | --- |
| `src/game/data.ts` | Every number but the heroes' and companions': weapons, wares, what a level can raise, enemies, waves, prices. Each says what it is for. |
| `src/game/heroes.ts` | The ten heroes: who each is, the weapon that is theirs alone, and the numbers of every quirk and every move. |
| `src/game/companions.ts` | The eight companions, the numbers of each one's quirk, and what every companion shares. |
| `src/game/world.ts` | One wave as it is fought, with no screen: the hero with their quirk and their move, the companions steering themselves, the enemies, what flies, what lies on the ground. The same seed and the same steering give the same wave. |
| `src/game/run.ts` | A run: who goes on it, what a wave leaves it with, levels and bonds, the camp's wares, buying, joining, selling. |
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

**A hero.** An entry in `HEROES` in `src/game/heroes.ts`: who they are, the kit's unit that draws them, their numbers, and what opens them; a weapon of their own in `SIGNATURES`; a quirk (a name in `Quirk`, its numbers in `QUIRKS`, its lines in `world.ts`, what the screen can read of it in `World.trait`); and a move (a line in `MOVES`, its case in `deed` in `world.ts`). A test for each, in `tests/heroes.test.ts`. Then `npm run art`, and `npm run pace -- --hero=<id>`, with `--nomove` and `--noquirk` to see what each part is worth.

**A companion.** An entry in `COMPANIONS` in `src/game/companions.ts` with the kit's unit that draws it, the way it fights (`Does`, a case in `actAs` in `world.ts`), its quirk (`AllyQuirk`, its numbers in `ALLY_QUIRKS`) and the feat that opens it. A test in `tests/band.test.ts`. Then `npm run art`, and `npm run pace -- --friends`.

**A weapon.** A line in `WEAPONS`, and its drawing in `ARMS` in `src/art/holdout.ts`, which is one of the kit's eighty. A test fails until both are there.

**A ware.** A line in `ITEMS`, and its picture's name in `src/view/icons.ts`.

**An enemy.** A line in `ENEMIES` with the way it fights, and its name in the waves it comes on (`MIXES`). Any unit in `docs/art/roster.md` can be one.

**A way of fighting.** A name in `Ai`, its case in `think` and `loose` in `world.ts`, its warning in `warn` in `ArenaScene.ts`, and a test.

## The pace

`npm run pace` is how the numbers were set. Its player steers away from what would hurt and toward what lies about, a fifth of a second late and never quite true, lets the move loose when there is a crowd for it, stands as Bram and keeps moving as Isaura, and buys what it can afford with no plan.

As last measured, with sixteen runs to a hero, alone, each stopped at the twenty-second wave. "Mean" is the mean of the waves come through with every run stopped at the twentieth:

| Hero | Half come through | Mean of the written 20 | Fewest | Won, of 16 |
| --- | --- | --- | --- | --- |
| Bram Oakenhold | 11 | 12.7 | 5 | 4 |
| Wren Fallowmere | 17 | 14.3 | 5 | 6 |
| Orrin Quillon | 11 | 12.8 | 4 | 2 |
| Fenn Two-Coins | 12 | 13.0 | 4 | 4 |
| Old Nan Cinderwick | 12 | 13.4 | 7 | 4 |
| Isaura Vane | 12 | 12.9 | 5 | 5 |
| Hroth | 17 | 14.9 | 8 | 6 |
| Brother Aldous Bell | 11 | 10.3 | 7 | 1 |
| Ysolde Rimeheart | 10 | 11.6 | 8 | 3 |
| Maren Dawnguard | 11 | 13.8 | 8 | 5 |

A run either stops at a wall (the ninth to the twelfth wave, most often) or gets its hands full of good weapons and goes on to the end, with little between: "half" jumps from 11 to 17 when one run more gets past the wall, so the mean says more. Before the heroes had names, half of each hero's runs came through 7 to 10 waves. They come about two waves further now: a hero's own weapon grows by itself and takes no hand, and there is the move. Without the move, the quirk and the growing weapon a hero comes through 8, as before. The move alone is worth the most: let loose every ten seconds, as it first was, it took half of the runs past the thirtieth wave.

Aldous alone is the weakest, as he is meant to be: he hits softly, and is never alone in the game.

What a companion is worth, with twenty-four runs each (sixteen for Aldous), as the mean of the written 20 beside the hero alone:

| With | Bram (10.8 alone) | Wren (13.0 alone) | Aldous (10.1 alone) |
| --- | --- | --- | --- |
| Biscuit | 12.5 | 13.3 | 11.9 |
| Pip | 14.2 | 14.1 | 15.1 |
| Mossback | 12.9 | 15.3 | 15.6 |
| Quill | 12.7 | 13.1 | 13.1 |
| Greta | 14.6 | 14.4 | 14.8 |
| Ember | 12.6 | 13.5 | 12.4 |
| Tam | 12.6 | 15.0 | 13.6 |
| Thistle | 13.2 | 14.0 | 15.9 |

A companion is worth between nothing and four waves, two on the whole. Biscuit, who is the first, is worth the least in waves; he is the one who makes the first runs gentler (more health left at the end of each of the first five waves) and brings coins in. These were measured before the last small change to how often a move fills, which moved the heroes by less than the dice do.

Twelve runs are few, twenty-four are not many, and that player is not a person. A person plans what to buy, which it does not, and sees less of the field at once than it does. Two measures of the same thing with other dice differ by a wave or more: a difference smaller than that between two heroes or two companions says nothing.

## For a portal

- It lands in play: a new player is in the field on the first frame after loading, and anyone else is one press away.
- It fits any frame with no bars, and was looked at in 907 by 510, 821 by 462, 1920 by 1080 and on a phone both ways.
- Keys are read by where they are on the keyboard, so the same four steer on a keyboard laid out another way. Escape is not used. The arrow keys, the space bar and the wheel do not scroll the page it is in.
- It has no full screen button of its own, no links out, and nothing in it but its own drawings and the recorded sounds it credits.
- The build is 4.0 MB.
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
- The named heroes, their quirks and moves, and the companions are rules that were tested and measured, and shown only plainly: a hero's own weapon still floats beside them with the rest, a move is a ring and a line of words, a companion is its figure and nothing more, and what a quirk is doing is not shown on the screen at all. The proper screens for all of it are the next piece of work. What was looked at: the list of heroes with the companion's button at the small frame and on a phone, and a wave with a band at a portal's frame.
- Whether a quirk is fun to play round is not known: Bram's standing still, Isaura's never stopping and Wren's not being touched were only ever played by the computer.
- A companion's worth was measured with twenty-four runs to a companion and two heroes, which tells a companion worth nothing from one worth three waves and little finer than that.
- A save from before the heroes had names keeps its bests and who was open, and loses a run that was left in its camp.
- Past the twentieth wave the game is the same twenty waves again, harder. It has not been played that far by anyone but the computer.
- This game added three things to the art kit (whole pictures at a pose in the art build and on the sheet, a bare hand on a figure, two letters for the logo). They are here and not yet in the copy of the art skill that the other two games carry.
