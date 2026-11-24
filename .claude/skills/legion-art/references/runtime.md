# Showing the art in a game

The art build writes SVG files and one `manifest.json`. How a game turns those into moving figures is described here for Phaser, which the kit's runtime is written for; the ideas carry to any engine.

## The manifest

`public/assets/manifest.json` (its shape is `src/art/manifest.ts`) says, for every unit: its parts in draw order, each with its role, its parent, its pivot and the box its picture fills on the canvas; its way of attacking; its muzzle and its top. For effects, icons, packs and badges it gives each picture's size and the point it turns about. The game reads this and nothing else: it never looks inside an SVG.

## One texture

Left as they are, each SVG would be a texture of its own, and a unit part would be a 384 by 384 texture that is mostly empty. `src/view/art/Sheet.ts` cuts each picture to its box and packs it onto one big canvas texture (`packer.ts` is the arithmetic, so a test can ask whether a battle fits). Everything on the screen then draws from one texture, which is one batch. Phones are held to one texture a batch, so a second texture in the middle of the figures costs a draw call every time.

SVGs are rasterized at 2x (`ART_SCALE`) by Phaser's SVG loader, and the game's cameras zoom to match the screen, so the art stays sharp on a dense screen.

## Figures that move by role

`src/view/art/Figure.ts` is a unit on the screen: one sprite to a part, placed each frame by the rig (`src/art/rig.ts`) from a pose. A pose is blended from the far ends in `poses.ts`: standing with a slow breath, the top of a hop and its landing, the windup and the strike of the unit's way of attacking, being hit, toppling. Because parts move by role, a new unit needs no animation of its own.

- Nothing is allocated in a frame: the poses and the part transforms are made once and written into.
- A unit that faces left is its picture mirrored.
- A boss is the same figure at a bigger scale.

## Static drawings are baked

A Phaser `Graphics` object is worked out again every frame. Anything that does not change (a button's slab, a card's tile, a panel) is drawn once to a canvas texture and shown as an image (`src/view/ui/bake.ts`). On a slowed processor that took a menu's frame from 55 ms of script to 21.

## Other engines

The pieces to port are small: read the manifest, load each part as an image, and each frame place each part at `solve(parts, pose)`'s position, turn and scale about its pivot. Everything else is the engine's own.
