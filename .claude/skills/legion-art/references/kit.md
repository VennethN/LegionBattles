# The kit: how the art is written

## Contents

- How the code is laid out
- Shapes
- The drawing surface: `Doc`
- Parts, roles and pivots
- Movement
- Adding a unit
- Structures and summoners
- Scenery and painted scenes
- Effects, icons, packs, badges
- The logo
- Editing a file by hand

## How the code is laid out

```
src/art/kit/palette.ts   every color
src/art/kit/path.ts      shapes: circles, rounded rectangles, soft outlines through points
src/art/kit/draw.ts      Doc: a picture in the making. piece, flat, line, glint, shadeOver, lightOver, at
src/art/kit/parts.ts     the reusable parts: legs, torsos, helms, hoods, weapons, shields, capes
src/art/kit/unit.ts      what a unit's art is: parts in draw order, each with a role and a pivot
src/art/units/*.ts       one file to a unit (a few files hold a family: structures, summoners, faithful, golems)
src/art/units/index.ts   UNIT_ART: every unit there is
src/art/rig.ts           where each part is, given a pose
src/art/poses.ts         the far ends of each movement
src/art/compose.ts       a whole unit as one SVG fragment, at a pose: for cards, sheets and covers
src/art/manifest.ts      the shape of manifest.json, which tells the game how units are put together
src/art/fx.ts            projectiles and effects
src/art/scenery.ts       what stands in a land: trees, rocks, ruins, camps, towers, strongholds, standards
src/art/icons.ts         the interface's icons
src/art/packs.ts         the packs
src/art/grades.ts        the grade badges, and the hand-drawn letters
src/art/logo.ts          a logo made of the same pieces
scripts/art.ts           npm run art: writes every SVG under public/assets, and manifest.json
scripts/sheet.ts         npm run art:sheet: the contact sheets, and the checks
scripts/preview.ts       a quick look at units while drawing them
```

Nothing under `src/art` imports from the game. It can be lifted into another project whole.

## Shapes

Paths are made only of absolute moves, lines and curves, so they can be turned, mirrored and moved by arithmetic, and the files show plain numbers in Inkscape. There are no arcs: a circle is four curves.

`path.ts` gives `circle`, `ellipse`, `roundRect`, `poly`, `line`, `capsule` (a thick rounded line between two points: arms, shafts), `star`, and `smooth`.

`smooth(points)` is the workhorse. Give it a handful of points and it draws a soft outline through them. Mark a point `'c'` to make it a corner:

```ts
smooth([[76, 54, 'c'], [98, 50], [120, 54, 'c'], [129, 76], [126, 100], [110, 109], [84, 109], [68, 100], [65, 76]])
```

A `Path` can be `rotate`d, `translate`d and `scale`d. A weapon is drawn upright with its hand at the origin, then turned to how it is held and moved to the hand. The shade is added after the turn, so the light stays top left however a weapon is held.

## The drawing surface: `Doc`

A `Doc` is one SVG in the making.

| Call | What it draws |
| --- | --- |
| `piece(name, path, material, opts)` | A filled, shaded, outlined shape: what nearly everything is made of. `opts.shade` is how far the lit fill is pushed toward the light (5 by default, 0 for none). `opts.inner` draws inside it, cut to its shape. `opts.outline: false` for no line. |
| `flat(name, path, color, opacity?)` | A flat shape with no line: a visor slit, the dark of a hood, a halo. |
| `line(name, path)` | A dark line of the one width: a seam, a string, a crease. |
| `glint(name, path)` | The one small highlight a piece may have. |
| `shadeOver(name, path, strength)` | A shadow laid over whatever is under it. |
| `lightOver(name, path, strength)` | Light laid over whatever is under it. |
| `at(x, y, scale, flip, draw)` | Stands something drawn about (0, 0) somewhere else. A thing stood many times is written once in the file and used each time, which keeps scenes small. |
| `svg(width, height, margin)` | The file. |

Names become ids (`knight-head-helm-fill`), so name things for what they are.

## Parts, roles and pivots

A unit is a list of parts, back to front. Each part is its own SVG file on the shared 192 canvas. Each has:

- a **role**, which is what the rig moves it as: `shadow`, `legBack`, `legFront`, `body`, `head`, `weapon`, `offhand`, or `extra` (a plume, a cape, a quiver)
- a **parent**: `root`, `body` or `head`. A part turns and moves with its parent
- a **pivot**: the point it turns about. A weapon's is its hand, a head's is the neck, a leg's is the hip, the body's is the feet

Because the game animates by role, a new unit moves without any code of its own. The hand that holds a weapon is drawn with the weapon, on top of what it grips; the arm is drawn with the body and ends where the hand is, so the two stay joined when the weapon turns about its pivot.

A unit's file has 40 px of page round the 192 canvas (`MARGIN`), because a long spear held level reaches past the canvas. The art build stops on a part that reaches the edge of the page, where it would be cut off.

## Movement

`poses.ts` holds the far ends of each movement as offsets from standing still: the windup and the strike for each way of attacking (`slash`, `chop`, `thrust`, `bow`, `cast`, `swing`, `throw`, `shoot`), the top of a hop, the landing, being hit, toppling. A unit names its way of attacking with `style`. The game blends between these (`references/runtime.md`); the sheet draws each one.

A pose is numbers: `rootX`, `rootY`, `bodyRot`, `headRot`, `weaponRot`, `weaponX`, `weaponY`, `offRot`, `legFrontRot`, `legBackRot`, and so on. Negative rotation is counter-clockwise, which for a unit facing right tips a weapon back over the head.

A pose for a still picture is not the game's wind-up. The game's wind-up takes a blade back across the helmet, which is right for a fifth of a second and wrong for a cover. For a still, lift the weapon and tip it toward the enemy, clear of the head (`references/covers.md`).

## Adding a unit

1. **Decide how it is read.** Three things in a sentence: its head, its weapon, what else. Write that sentence as the comment at the top of its file.
2. **Reuse what fits** from `kit/parts.ts`: `legs`, `torsoPath` or `robePath`, `belt`, `arm`, `cape`, a shield, a weapon. Add new parts there, not in the unit's file.
3. **Write `src/art/units/<id>.ts`.** Copy one that is close. A plain foot soldier is about twenty lines:

```ts
export const militia: UnitArt = {
  id: 'militia',
  style: 'thrust',
  muzzle: [176, 124],   // where a shot leaves from
  top: 48,              // its highest point, for a health bar
  parts: [
    ground(),
    ...legs(LEATHER),
    part('body', 'body', 'root', FEET, (d, team) => {
      d.piece('tunic', torsoPath(), CLOTH[team], { inner: (c) => belt(c, { y: 140 }) });
      arm(d, 'arm', [114, 118], [116, 136], CLOTH[team]);
    }),
    part('head', 'head', 'body', NECK, (d) => kettleHelm(d)),
    part('buckler', 'offhand', 'body', [80, 138], (d) => buckler(d, 80, 138, 17)),
    part('spear', 'weapon', 'body', [116, 138], (d) => spear(d, { hand: [116, 138], angle: 76 }, 66)),
  ],
};
```

4. **Add it to `src/art/units/index.ts`.** The game's own data (its numbers, its name) is the game's business and lives outside `src/art`, under the same id.
5. **Look at it while you draw.** `npx tsx scripts/preview.ts <id>` writes `build/preview.png` with the unit on both teams.
6. **Run `npm run art:sheet`** and open the sheets. Check: no face, enough team color, parts that stay joined at every pose, a silhouette of its own.

## Structures and summoners

**A structure** is a building or a trap (`units/structures.ts`). It is drawn on the same canvas with its foot at (96, 180), and it has fewer parts than a unit: a `shadow`, a `body`, and an `extra` if it flies a flag, which is the one thing on it that moves. It has no weapon, no head and no legs. A rig leaves it still, sets it back a little when it shoots, shudders it when it is struck, and brings it down where it stands. Its `muzzle` is where a shot leaves a tower from.

**A summoner** (`units/summoners.ts`) is a unit like any other, read by what it calls with: a long horn with a cloth hung from it, a lantern on a crook, a drum and beater, a curved horn. Each is a part in `kit/parts.ts` that no one else carries.

## Scenery and painted scenes

**Scenery** (`scenery.ts`) is drawn about its own foot at (0, 0), so that a scene can stand it anywhere, at any size, facing either way (`Doc.at`). There are trees, bushes, rocks, stumps, logs, flowers, mushrooms, fences and tufts for a meadow; cactus, palms, sandrock, dry shrubs, pots and ruins for a desert; pines, ice spikes, bare trees, drifts and cairns for snow; and camps, towers, strongholds, standards and signposts.

**A painted scene** (the ground of a battle, a map) is one picture the size of the screen, put together from the scenery by a seed, so it comes out the same every time. Write a function that returns a `Doc`: lay the ground in the land's four tones, a road in `DIRT`, then stand scenery with `Doc.at`, sorted from the back to the front. Keep tall things to the sides and away from where the game's own figures and plates stand. A new kind of land needs its scenery and its ground colors; nothing else.

## Effects, icons, packs, badges

- **Effects** (`fx.ts`): an arrow, a bolt, a javelin, a slash, a spark, a ring, a disc, dust, a sparkle, a chip, and an orb in each magic accent. Most are drawn pale so that the game can tint them. A glow is flat rings.
- **Icons** (`icons.ts`): each is a function that draws on a small canvas. Add one to the list `iconArt()` returns; the build writes it and the manifest names it.
- **Packs** (`packs.ts`): `PACK_LOOKS` maps a pack's id to its colors and its seal's mark. A new pack is a line there.
- **Badges** (`grades.ts`): plates with a hand-drawn letter. The letters are on a 24 by 28 grid and can be used for any short word that has to be part of a picture.

## The logo

`logo.ts` draws a logo with the same pieces as everything else: a word in gold over a shield that is half one side's color and half the other's, two standards crossed behind it, a second word on a red ribbon. Its letters are the hand-drawn ones, and the file is written three times the size it is drawn so that its dark line is as heavy for its letters as theirs is.

- **It is painted twice.** First every shape as a pale line, wider than the dark one that goes round it; then the pieces over that. What shows of the first pass is a pale edge round the whole logo, which lets it be read on a dark ground.
- **The mark** (the shield and standards alone, on a square) is for a browser's tab or a portal's tile.

A sister game's logo keeps the shield and changes the words.

## Editing a file by hand

Copy a generated file to the same path under `art/overrides`, edit it there in Inkscape, and the game uses yours. `npm run art` never writes under `art/overrides`; run it after an edit so the manifest measures your file. A piece's shape is written once, in the file's `defs`, and used for its shade, fill, line and clip: Inkscape shows these as clones, so edit the shape and they all follow. Keep the page (`viewBox="-40 -40 272 272"` for a unit) and the pivot where they were.
