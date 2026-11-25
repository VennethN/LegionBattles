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
npm run dev &                       # http://127.0.0.1:5174/
npm run walk                        # every state on a wide screen and a phone, to build/walk
npm run walk boss feats             # only those
npm run smoke                       # plays it through its interface, wide and by touch, and fails if a press does nothing
```

Run the smoke after changing a screen or a rule a button leans on; a button it presses is found by what it says, so give a new one words. Read the PNGs with the Read tool. Do this after any change a player will see, at both sizes: most of what goes wrong is layout. `scripts/walk.ts` sets states up by writing the save in the page (`save()`, `battle()` and `game` are on `window`), so add a state there for a new screen.

The headless browser draws a few frames a second, and the fight caps a frame at a tenth of a second, so game time runs slow in it. To see a fight move, drive the page's clock: `page.clock.install()`, then `page.clock.pauseAt(Date.now() + 1000)` so that no time passes by itself, and from then on `page.clock.runFor(16)` is exactly one frame of the game. Without the pause real time runs as well, and what is recorded is a timelapse: the first clip of this game showed a stage a second for that reason, which looked like a fault in the pace and was not.

## Rules of the project

- **The rules are pure, in `src/game`, with tests.** `battle.ts` and `rules.ts` know nothing of the screen. A new rule goes there with a test, not into a scene.
- **The numbers are in `src/game/data.ts`,** each with a comment that says what it is for.
- **A change to a number is measured.** `npm run pace -- --hours=3` before and after, and say what moved.
- **The screens show and ask.** A scene never works out what something costs or does: it asks `rules.ts`.
- **The art is drawn in code, in the kit's style.** No image files, no AI pictures, no art copied from another game. Nothing has a face: no eyes, mouths, noses or brows, and no two dark openings side by side that could be read as eyes. One outline color and width, a fixed palette (`tests/art.test.ts` holds the palette).
- **The art build writes only what the game shows,** which `scripts/art.game.ts` says: the cast comes from the game's data, the icons are named. An icon used in a screen has to be named there; a test says so if it is not. `scripts/art.ts` and `scripts/sheet.ts` are the kit's and are not changed for this game.
- **The skill carries the kit.** After a change under `src/art` or `src/view/art`, run `node .claude/skills/legion-art/scripts/sync.mjs .`: a test fails until the two agree. After drawing, run `npm run art:sheet` and look at the sheets in `docs/art`.
- **Everything in the fight is on one sheet** (`src/view/art/Sheet.ts`), and all of it fits at once. `tests/sheet.test.ts` fails when it no longer does.
- **What a player has not got is dark, with "???".** The next hero in the list is a dark shape and nobody past it is shown.
- **The screen is laid out for the window it has** (`layout()` in `src/view/app.ts`): the fight beside the lists when wide, over them when tall, and remade when the window changes. No bars at any shape. Pictures are loaded by `AssetsScene`, which outlives that.
- **The build stays under 5 MB,** which is what a portal takes.
- **Comments say why,** in short plain sentences.
- **Text for the owner and for the docs is plain, and has no em dashes.**
- **Say what nobody has looked at.** The README ends with that list: keep it true.

## Git

Work on the branch you are given. Commit messages are in the imperative and say what the change does for the game. Commit and push only what was asked for.
