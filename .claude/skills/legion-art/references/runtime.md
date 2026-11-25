# Showing the art in a game

The art build writes SVG files and one `manifest.json`. How a game turns those into moving figures is described here for Phaser, which the kit's runtime is written for; the ideas carry to any engine.

## Contents

- The manifest
- One texture
- Figures that move by role
- Bringing figures in as they are wanted
- Any window
- Static drawings are baked
- Things that cost time
- Other engines

## The manifest

`public/assets/manifest.json` (its shape is `src/art/manifest.ts`) says, for every unit: its parts in draw order, each with its role, its parent, its pivot and the box its picture fills on the canvas; its way of attacking; its muzzle and its top. For effects, icons, packs and badges it gives each picture's size and the point it turns about. The game reads this and nothing else: it never looks inside an SVG.

## One texture

Left as they are, each SVG would be a texture of its own, and a unit part would be a 384 by 384 texture that is mostly empty. `src/view/art/Sheet.ts` cuts each picture to its box and packs it onto one big canvas texture. Everything on the screen then draws from one texture, which is one batch. Phones are held to one texture a batch, so a second texture in the middle of the figures costs a draw call every time.

`packer.ts` is the arithmetic, apart from Phaser, so a test can ask whether everything fits. It keeps the outline of what has been placed (a skyline) and sets each picture where it comes to rest highest. The first packer laid pictures in rows as tall as their tallest, which wasted two thirds of the sheet when figures came one at a time: a legion of eighteen with its camp did not fit a sheet that now holds every figure in that game with room over.

SVGs are rasterized at 2x (`ART_SCALE` in `art/scale.ts`) by Phaser's SVG loader, and the game's cameras zoom to match the screen, so the art stays sharp on a dense screen.

What is kept for good (effects, icons, packs) goes on first, with `queue` and `keepFolder` while the game loads; then `seal()`, and the rest of the sheet is the figures'.

## Figures that move by role

`src/view/art/Figure.ts` is a unit on the screen: one sprite to a part, placed each frame by the rig (`src/art/rig.ts`) from a pose. A pose is blended from the far ends in `poses.ts`: standing with a slow breath, the top of a hop and its landing, the windup and the strike of the unit's way of attacking, being hit, toppling. Because parts move by role, a new unit needs no animation of its own.

A game sets where a figure stands (`x`, `y`), which way it faces, whether it is walking (`moving`) or pleased (`cheering`), and tells it what happens: `attack(now, windup)`, `hit(now, fromX)`, `die(now)`, and `revive()` to use a fallen figure again for the next of its kind. Then `update(now, dt)` every frame. It knows nothing of any game's rules.

- Nothing is allocated in a frame: the poses and the part transforms are made once and written into.
- A unit that faces left is its picture mirrored.
- A boss is the same figure at a bigger scale. A building is a figure of the kind `'building'`: it does not breathe or hop, its flag stirs, and it sinks where it stands.

## Bringing figures in as they are wanted

`sheet.ensure(scene, [{ team, unit }, ...])` loads the parts of whoever is not on the sheet yet, packs them, and resolves. A game with a fixed cast calls it once while loading. A game whose cast grows (a hero is hired, a new land is come to) calls it then, and stands the figure up when it resolves: `assets/examples/StageView.idle.ts` does this in `want()`.

If there is no room, `ensure` takes every figure off the sheet and packs only the ones it was asked for, after telling whoever asked to be told (`onWipe`). That suits a game of separate battles, each with its own cast. A game where everyone stays on the screen must never get there: write the test that packs its whole cast (the idle game's `tests/sheet.test.ts` does, with `SkylinePacker` and the manifest alone), and still let go of every figure in `onWipe` and stand them up again, so that a wipe is a flicker and not a screen of scrambled parts.

## Any window

`src/view/config.ts` works out a view for whatever window the game has: 720 units on the short side, as many as the window's shape gives on the long one, a canvas as dense as the screen up to 2, and `tall` when the window is upright. A window that is nearly square is neither wide enough for two things side by side nor tall enough for one over the other at that size, so it is given more units (`WIDE_LEAST`, `TALL_LEAST`: set them to what the game's two halves need) and everything in it is a little smaller. Look at a tablet and a square window as well as a monitor and a phone: the idle game's fight was squeezed to a strip on both until this was added. Every scene sets its camera from it (`cam.setViewport(0, 0, view.width, view.height); cam.setZoom(view.zoom); cam.centerOn(view.w / 2, view.h / 2)`) and lays itself out in the view's units, for the wide shape or the tall one. When the window changes, `fit()` again, `game.scale.resize(view.width, view.height)`, and restart the scene that is showing: the game's state belongs to no scene, so nothing is lost. There are no bars at any shape.

## Static drawings are baked

A Phaser `Graphics` object is worked out again every frame. Anything that does not change (a button's slab, a card's tile, a panel) is drawn once to a canvas texture and shown as an image (`src/view/ui/bake.ts`). On a slowed processor that took a menu's frame from 55 ms of script to 21.

`Effects.ts` is a pool of sprites for whatever flies, bursts and fades. `Numbers.ts` is the numbers that float up from a blow, drawn from a strip of digits that is packed on the sheet with everything else.

## Things that cost time

- **A scene's loader dies with the scene.** Pictures asked for through a scene that is then restarted (a resize, a new run) never arrive as far as the asker can tell, and are asked for twice. Give the game one scene that shows nothing and is never stopped, and load through that (`assets/examples/AssetsScene.ts`).
- **A stretched square has soft edges.** A one-color square on the sheet, stretched to fill a bar or dim a screen, fades at its edges into whatever is beside it on the sheet: a panel made that way let the ground show through its rim. Cut a frame from the middle of the square and stretch that (`sheet.inner('fx/pixel', 'fx/solid', 5)`).
- **Phaser leaves the canvas's CSS size behind on a resize.** With the scale mode `NONE`, the canvas keeps the size it had before. Give it `width: 100% !important; height: 100% !important` in the page and let it fill a fixed parent.
- **A headless browser draws a few frames a second.** A game that caps a frame's length runs slow in it. To see a fight move, drive the page's clock (Playwright: `page.clock.install()`, `page.clock.pauseAt(Date.now() + 1000)` so that no time passes by itself, then `page.clock.runFor(16)` is one frame). Leave the pause out and real time runs as well: the recording is a timelapse, and the game looks many times faster than it is.
- **Everything a player is shown has to be named somewhere a test can read.** The build writes only what `art.game.ts` names, so an icon used in a screen and not named there is a hole in the screen. Have a test read the screens for `'icon/...'` and check the manifest.

## Other engines

The pieces to port are small: read the manifest, load each part as an image, and each frame place each part at `solve(parts, pose)`'s position, turn and scale about its pivot. Everything else is the engine's own.
