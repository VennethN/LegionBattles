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
- **The numbers are in `src/game/data.ts`, `heroes.ts` and `companions.ts`,** each with a comment that says what it is for.
- **A change to a number is measured.** `npm run pace` before and after, twelve runs at the least, and say what moved. `--why` finds a wall, `--friends` measures the companions, and `--nomove`, `--noquirk` and `--nogrow` say what a part of a hero is worth. Two measures with other dice differ by a wave or more: believe a bigger difference than that, or play more runs.
- **The screens show and ask.** A scene never works out what something costs or does: it asks `run.ts`.
- **What the screens show of a hero's quirk, their move and the band, the wave tells them:** `World.trait`, `World.fury`, the companions in `World.band`, and the events. A screen never works a quirk out for itself.
- **Everything an enemy is about to do is shown before it does it:** a mark where it will stand, a line it will run down, a ring it will burst in. A new way of fighting comes with its warning.
- **The art is drawn in code, in the kit's style.** No image files, no AI pictures, no art copied from another game. Nothing has a face: no eyes, mouths, noses or brows, and no two dark openings side by side that could be read as eyes. A pale ring round a dark middle is an eye too: an orb with a halo was, and is a cut stone now.
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
