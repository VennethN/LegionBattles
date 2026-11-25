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
npm run dev &                       # http://127.0.0.1:5180/
npm run walk                        # every state at a portal's frame, to build/walk
npm run walk tells lodge --size=small,phone-tall
npm run smoke                       # plays it through its own buttons and keys, with mouse and by touch
npm run film                        # films a hunt frame by frame, to see it move
```

Read the PNGs with the Read tool. Do this after any change a player will see, at the small frame and on a phone as well: most of what goes wrong is layout. `scripts/walk.ts` sets a state up by standing a hunt up as described (`window.stage`), so add a state there for a new screen, and a line in its `tells` for a new attack. The smoke finds a button by the words on it, so give a new one words. `window.pilot(true)` has the bot steer.

The headless browser draws a few frames a second. The scripts take over the page's clock (`page.clock.install()`, then `pauseAt`), and from then on `runFor(1000 / 60)` is one frame of the game. Without the pause real time runs as well, and what is recorded is a timelapse. A walk with long hunts in it takes many minutes, more when other work is running on the machine.

## Rules of the project

- **The rules are pure, in `src/game`, with tests.** `hunt.ts` and `lodge.ts` know nothing of the screen. A new rule goes there with a test, not into a scene.
- **What there is, is tables, in `src/game/content.ts`,** each number with a comment that says what it is for. A new monster or hunter is mostly an entry there; a new kind of shape or ability is a few lines in `hunt.ts` as well, with a test.
- **Nothing hurts without a tell.** Everything a monster or its helper does is a shape in `Hunt.tells`, shown for its time, and it lands exactly there. A test plays both monsters and fails if the hunter is ever hurt by an attack that was not told. A new way of fighting comes with its tell; the one thing of the hunter's side shown the same way is a sapper's charge.
- **A tell is drawn as it is ruled.** The lair is seen from above: a circle on the ground is a circle, at the size the rules have it. Do not flatten or prettify a tell.
- **A change to a number is measured.** `npm run pace` before and after, sixteen hunts at the least, and say what moved. `--why` says what did the harm, `--things` what each thing brought is worth.
- **The screens show and ask.** A scene never works out what something costs, does or whether it is allowed: it asks `lodge.ts` or the hunt. What the HUD and the lair show, the hunt tells them, as state and events.
- **No screen names a picture.** `src/view/pictures.ts` says which figure stands for what. The figures there now are stand-ins from the Legion kit; the game's own are drawn in `VennethN/game-assets`.
- **The art is drawn in code.** No image files, no pictures from an image model, nothing copied from another game. The Legion kit's own rules (`.claude/skills/legion-art`) hold for its figures while they are here.
- **The game lights its pictures.** Everything about the light is in `src/view/light`: how dark each kind of lair is in `hours.ts`, how strong each light is in `LairLight.ts`. **What has to be read is not lit:** the tells, numbers, bars and names go through `light.crisp`, which keeps them off the lit camera. Never so dark that the monster or a helper is lost.
- **It is a game in a genre, not a copy of another game.** Its hunters, monsters, names and looks are its own. If one could be mistaken for somebody else's, it is renamed or redrawn (the design says which were).
- **The art build writes only what the game shows,** which `scripts/art.game.ts` takes from `pictures.ts`. A small picture a screen names has to be on the list in `src/view/icons.ts`: a test says so if it is not.
- **Everything on a field is on one sheet,** and a field's pictures always fit. `tests/art.test.ts` fails when they no longer do.
- **No words smaller than 15 of the layout's units.** That is eleven pixels in the smallest frame a portal shows.
- **What a player has not opened is dark, with "???".** What opens it is said, and nothing else.
- **A new player is in a hunt at once,** and is taught by what happens, in few words, once.
- **The build stays under 5 MB.**
- **Comments say why,** in short plain sentences.
- **Text for the owner and for the docs is plain, and has no em dashes.**
- **Say what nobody has looked at.** The README ends with that list: keep it true.

## Git

Work on the branch you are given. Commit messages are in the imperative and say what the change does for the game. Commit and push only what was asked for.
