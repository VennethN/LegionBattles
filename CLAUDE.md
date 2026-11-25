# Notes for agents

Read `README.md` first: it says how the game plays and where everything is. Before drawing anything, read `.claude/skills/legion-art/SKILL.md`.

## Check

```sh
npm install
npm run check      # type check, tests, build: all three have to pass before a commit
```

Nothing after a push runs them for you.

## Look at it

There is no screen here, so look at pictures:

```sh
npm run dev &                       # http://127.0.0.1:5175/
npm run walk                        # every state at a portal's frame, to build/walk
npm run walk camp title --size=small,phone-tall
npm run smoke                       # plays it through its own buttons, with mouse and by touch
npm run film                        # films it frame by frame, to see it move
```

Read the PNGs with the Read tool. Do this after any change a player will see, at the small frame and on a phone as well: most of what goes wrong is layout. `scripts/walk.ts` sets a state up by standing a run up as described (`window.stage`), so add a state there for a new screen. The smoke finds a button by the words on it, so give a new one words.

The headless browser draws a few frames a second. The scripts take over the page's clock (`page.clock.install()`, then `pauseAt`), and from then on `runFor(1000 / 60)` is one frame of the game. Without the pause real time runs as well, and what is recorded is a timelapse.

## Rules of the project

- **The rules are pure, in `src/game`, with tests.** `world.ts` and `run.ts` know nothing of the screen. A new rule goes there with a test, not into a scene.
- **The numbers are in `src/game/data.ts`, `heroes.ts`, `companions.ts`, `kinds.ts`, `relics.ts`, `road.ts` and `holdData.ts`,** each with a comment that says what it is for.
- **A change to a number is measured.** `npm run pace` before and after, twelve runs at the least, and say what moved. `--why` finds a wall, `--friends` measures the companions, `--nomove`, `--noquirk` and `--nogrow` say what a part of a hero is worth, and `--quiet`, `--norelics` and `--nokinds` what the road, the relics and the kinds of weapon are. An early enemy's harm is 1 or 2: the smallest change to how harm grows is a half or a whole again on some wave, so look at where runs end, wave by wave, after any change to it. Two measures with other dice differ by a wave or more: believe a bigger difference than that, or play more runs.
- **The screens show and ask.** A scene never works out what something costs or does: it asks `run.ts`.
- **What the screens show of a hero's quirk, their move and the band, the wave tells them:** `World.trait`, `World.fury`, the companions in `World.band`, and the events. A screen never works a quirk out for itself.
- **What a road puts on the field and what a relic does, the wave tells the screens too:** `World.omen`, `night`, `shrine`, `risen`, `bones`, a foe's `champion` and `def.prop`, and the events `champion`, `wagon`, `bless`, `free`, `relic` and `risen`. `src/view/RoadField.ts` shows them.
- **The Hold's rules are functions on a save, in `src/game/hold.ts`.** A screen never works out a price, what is open, or what a run is paid: it asks. A run takes what the Hold gives it when it begins (`beginRun`: its vows, the weapons it may be offered and what else is shut, what the board gives, what the hero's oaths have opened) and keeps that to its end, so a crate opened in the middle of a run changes the next one.
- **A new weapon, ware or relic is in the armory from the start unless a crate in `holdData.ts` names it.** Put a new one in a crate whose theme it fits, or make a new crate with a deed of its own and a price in `CRATE_PRICES`: `tests/hold.test.ts` holds the start to enough for a good first run, and every crate's deed to one a first run's armory can do.
- **The board makes a hero stronger for good, and the enemies are not made stronger to take it back.** The owner asked for it ("upgrades we can spend on to make permanent per run"). What keeps the game hard for whoever has bought it all is the vows. So after a change to the board, measure with nothing bought, with everything bought, and with everything bought under vows.
- **A vow is a rule that is felt, not a share more of everything.**
- **A new place on the board is a line in `BOARD` with a gift, a price, the place it needs and where it stands;** a new kind of gift is a line in `Gift`, in `giftSays`, in `Boons`, and wherever a run or a wave takes it.
- **`holdData.ts` names captains, kinds of weapon and relics through `REF`, at its top.** A deed, an oath or a crate that needs a name from another list takes it from there, so that one renamed is one line.
- **Every hero has three oaths** (`OATH_LINES`): a new hero needs a line there, and a relic in `REF.relic`.
- **What the Hold changes about how far a run gets is measured:** `npm run pace -- --board=all`, `--vows=3` or `--vows=march,wind`, `--pool=start`, and `--career` for how many runs it takes to open everything.
- **A relic bends a rule; it is not a line of stats.** A plain stat is a ware's or a kind's gift.
- **Everything an enemy is about to do is shown before it does it:** a mark where it will stand, a line it will run down, a ring it will burst in. A new way of fighting comes with its warning.
- **The art is drawn in code, in the kit's style.** No image files, no AI pictures, no art copied from another game. Nothing has a face: no eyes, mouths, noses or brows, and no two dark openings side by side that could be read as eyes. A pale ring round a dark middle is an eye too: an orb with a halo was, and is a cut stone now. So is a finger ring (the relic that was to be one is a shard on a cord), a wheel with a hub beside another, and a die's pips (the Bone Dice are scratched).
- **It is a game in a genre, not a copy of another game.** Its heroes, weapons, wares, enemies, names and looks are its own.
- **The art build writes only what the game shows,** which `scripts/art.game.ts` says from the game's own data. A picture a screen names has to be on the list in `src/view/icons.ts`: a test says so if it is not.
- **Everything on the field is on one sheet,** and a field's pictures always fit. `tests/art.test.ts` fails when they no longer do.
- **No words smaller than 15 of the layout's units.** That is eleven pixels in the smallest frame a portal shows.
- **What a player has not opened is dark, with "???".** What opens it is said, and nothing else.
- **The build stays under 5 MB.**
- **Comments say why,** in short plain sentences.
- **Text for the owner and for the docs is plain, and has no em dashes.**
- **Say what nobody has looked at.** The README ends with that list: keep it true.

## Git

Work on the branch you are given. Commit messages are in the imperative and say what the change does for the game. Commit and push only what was asked for.
