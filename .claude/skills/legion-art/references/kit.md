# The kit: how the art is written

## Contents

- How the code is laid out
- What a game shows: `scripts/art.game.ts`
- Shapes
- The drawing surface: `Doc`
- Parts, roles and pivots
- Movement
- Adding a unit: a recipe
- Adding a unit by hand
- A hero: a build and a stance of their own
- Beasts and riders
- Golems and engines
- Structures and summoners
- The notes, the roster and the check
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
src/art/kit/heads.ts     forty more heads: helms, hoods, hats, crowns, masks, a mushroom cap, a tree stump
src/art/kit/arms.ts      more of what a hand holds: blades, tools, poles, guns, things thrown, staffs
src/art/kit/gear.ts      shields, what the other hand holds, what is worn on the back, details drawn on a body
src/art/kit/beasts.ts    the four-legged build: legs, a barrel of a body, tails, and heads that have no face
src/art/kit/dice.ts      the same numbers every time, from a seed: what places scenery
src/art/kit/stance.ts    a build and a stance: any part of the kit drawn leaning, bigger, mid stride
src/art/kit/heroes.ts    what only the named heroes wear and carry (Legion Holdout)
src/art/kit/unit.ts      what a unit's art is: parts in draw order, each with a role and a pivot
src/art/units/*.ts       the first cast: one file to a unit (a few hold a family: structures, summoners, faithful, golems)
src/art/units/figure.ts  a unit from a recipe: a head, a body, a weapon and how it is held, and the rest
src/art/units/catalogue.ts   every head, weapon, off hand and thing for the back, by name (H, W, O, X, HOLD)
src/art/units/wearing.ts     the bodies (B): tunic, plate, mail, scale, robe, bulk
src/art/units/crownlands.ts, wilds.ts, deeps.ts, shores.ts, orders.ts   the sets drawn from recipes
src/art/units/beasts.ts      beasts, and riders on horses
src/art/units/machines.ts    more golems, and the siege engines
src/art/units/works.ts       more buildings and traps
src/art/units/heroes.ts      the ten named heroes of Legion Holdout, each drawn for themselves
src/art/units/band.ts        their companions: beasts of the kit made into somebody, and a squire
src/art/units/notes.ts   each unit's line: its set, its role, how it is read
src/art/units/index.ts   UNIT_ART: every unit there is
src/art/check.ts         what a program can check of a unit, run over the whole cast
src/art/cast.ts          the cast as a list to read (references/roster.md)
src/art/rig.ts           where each part is, given a pose
src/art/poses.ts         the far ends of each movement
src/art/compose.ts       a whole unit as one SVG fragment, at a pose: for cards, sheets and covers
src/art/manifest.ts      the shape of manifest.json, which tells the game how units are put together
src/art/fx.ts            projectiles and effects
src/art/scenery.ts       what stands in a land: trees, rocks, ruins, camps, towers, strongholds, standards
src/art/ground.ts        the tones of each kind of land: meadow, desert, snow
src/art/march.ts         a painted ground with a road through it, put together from the scenery: for a game seen from the side
src/art/icons.ts         the interface's icons
src/art/icons-idle.ts    more of them: a laurel, a trophy, a gauntlet, a helm, a tent, a horn, a sack, a cog
src/art/packs.ts         the packs
src/art/grades.ts        the grade badges, and the hand-drawn letters
src/art/logo.ts          a logo made of the same pieces
scripts/art.ts           npm run art: writes every SVG under public/assets, and manifest.json
scripts/art.game.ts      what this game shows of all that, and its own scenes. The one script a game changes
scripts/sheet.ts         npm run art:sheet: the contact sheets, and the checks
scripts/roster.ts        npm run art:roster: any units, sets or roles on one sheet, from the source; the check; the list
scripts/preview.ts       a quick look at units while drawing them
```

Nothing under `src/art` imports from the game. It can be lifted into another project whole.

## What a game shows: `scripts/art.game.ts`

`art.ts` and `sheet.ts` are the same for every game. They ask `art.game.ts` for one object, `GAME`:

- `wants(team, unit)`: whether a unit's parts are written for a side. A hero the player hires is wanted in blue, an enemy in red, and most units in only one.
- `whole(team, unit)`: whether it is also written standing still as one picture (`full.svg`), for a card or a row of a list.
- `icons()`: the game's own icons, drawn as `icons.ts` draws its own, and `onlyIcons`: the names to write, or null for all.
- `onlyPacks`, `grades`: which packs and grade badges, if any.
- `logoWord`: the word on the ribbon under LEGION.
- `scenes`: pictures of the game's own that are loaded one at a time and not packed: a board, a map, a ground. Each says where it goes under `public/assets`, its size, and how it is drawn.

Whatever is not named is not written, and what was written before and is no longer named is removed. Take the names from the game's own data where there is any (`assets/examples/art.game.idle.ts`), and have a test read the screens' source for `'icon/name'` and hold the list to it: a missing icon is otherwise found by a player.

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

`poses.ts` holds the far ends of each movement as offsets from standing still: the windup and the strike for each way of attacking (`slash`, `chop`, `thrust`, `bow`, `cast`, `swing`, `throw`, `shoot` for whoever holds a weapon; `bite` for a beast, whose weapon is its head; `lob` for an engine's throwing arm; `ram` for a log or a drill on wheels), the top of a hop, the landing, being hit, toppling. A unit names its way of attacking with `style`. The game blends between these (`references/runtime.md`); the sheet draws each one.

A pose is numbers: `rootX`, `rootY`, `bodyRot`, `headRot`, `weaponRot`, `weaponX`, `weaponY`, `offRot`, `legFrontRot`, `legBackRot`, and so on. Negative rotation is counter-clockwise, which for a unit facing right tips a weapon back over the head.

A new kind of thing may need a movement of its own, and that is three lines in `poses.ts` and a name in `AttackStyle`. The beasts first borrowed a spearman's thrust, which threw their heads clean off their necks, and the trebuchet a two-handed chop, which tipped the whole frame over: look at `pose=strike` on the roster before settling for a borrowed one. A game's cover script has a pose to each style too, and the type checker will ask for it.

A pose for a still picture is not the game's wind-up. The game's wind-up takes a blade back across the helmet, which is right for a fifth of a second and wrong for a cover. For a still, lift the weapon and tip it toward the enemy, clear of the head (`references/covers.md`).

## Adding a unit: a recipe

Most of the cast is made this way. A recipe names parts from the catalogue and `figure` puts the unit together, with its shadow, its legs, its arm ending where the weapon's hand is, and its line in the notes:

```ts
import { H, HOLD, O, W, X } from './catalogue';
import { figure } from './figure';
import { B } from './wearing';

figure('templar', {
  set: 'Crownlands', role: 'melee',
  read: 'a great helm banded with gold, a morning star, a heater shield, a cape',
  head: H.greatHelm(), back: [X.cape()], body: B.plate(STEEL, (c) => quartered(c)), legs: STEEL,
  arm: W.morningstar(), hold: HOLD.one, off: O.heater(),
}),
```

- `head`: one of `H`, which has more than sixty. Each knows its own top, for the health bar.
- `body`: one of `B`: `tunic`, `plate`, `mail`, `scale`, `robe`, `bulk`. Its first argument after the material draws on it, cut to its shape: a sash, an apron, ribs, a bandolier (`kit/gear.ts`). Cloth is the team's unless a material is given.
- `arm`: one of `W`, which has more than seventy, and `hold`: where the hand is and how the weapon is turned, `[x, y, angle]`. `HOLD` has the usual ones (`one`, `low`, `level`, `staff`, `up`, `bow`, `gun`, `tall`). The weapon says how it attacks (its `style`) and where a shot leaves it; `style` on the recipe overrides.
- `off`: one of `O`, what the other hand holds: a shield, a book, a hawk, a keg. `offOver: true` draws it over the weapon (an arrow on a bow's string).
- `back`: any of `X`, drawn behind the body: a cape, a quiver, a banner, a pack. `crest`: drawn over the body and under the head: a plume.
- `legs`: their material. `top`: only if something stands higher than the head.

Put the unit in its set's file and that file's list in `index.ts`, which stops the build on two units with one id. Then look at it (`npm run art:roster -- templar both zoom=2`).

**Drawing a new part.** A head is drawn on the neck at (96, 106) and fills about x 64 to 130, y 50 to 110; a weapon is drawn upright about its hand at (0, 0) and turned by `at(grip)`; an off hand is drawn where it is told. Give each a name in the catalogue. Before adding a head, look at the ones there: a new one has to be told from every one of them as a black shape.

**Enough of its side.** A recipe in plate, mail or scale with a shield in front has almost no cloth left to show. Give it a cape, a plume or a tabard on the plate: three guards in this cast were drawn, looked at in red, and found to be nobody's.

## Adding a unit by hand

For what no recipe says: a figure with a build of its own, or a part that has to be drawn for it alone. The first cast was all drawn this way.

1. **Decide how it is read.** Three things in a sentence: its head, its weapon, what else. Write it with `note(id, set, role, read)` beside the unit.
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
5. **Look at it while you draw.** `npm run art:roster -- <id> both zoom=2` writes `build/roster.png` with the unit on both teams.
6. **Run `npm run art:roster -- check`**, and look at it at `pose=windup`, `pose=strike` and `pose=hit`. Check: no face, enough team color, parts that stay joined at every pose, a silhouette of its own.

## A hero: a build and a stance of their own

The rank and file all stand straight, on the same neck and the same hips, which is why a recipe can put any head on any body. A named hero is drawn for themselves (`units/heroes.ts`), and `kit/stance.ts` is what lets them be made of the kit's parts all the same:

- **A `Build`** says how big they are beside a soldier (`size`, about the feet), how wide, how far they `lean` from the hips, and how the head is carried (`nod`, `headX`, `headY`). `bodyOf`, `headOf` and `legOf` turn that into a `Turn`: something done to every shape of a part.
- **`posed(d, turn, draw)`** draws whatever `draw` draws with every shape turned. The turn is done to the shapes, not to the picture, so the shade and the lit rim are still laid from the top left and the line keeps its one width. Any helm, cape or leg of the kit can be worn by a figure that is bent double or half as big again.
- **`turned(turn, point)`** says where a point of the standing figure ends up: the neck for the head's pivot, a shoulder for where an arm starts, a hip for a leg's pivot.
- **`stand(build, material, back, front)`** in `units/heroes.ts` gives the two legs, each with its hip moved along and swung: `[-7, 8]` and `[5, -5]` is planted, `[-9, 30]` and `[9, -26]` is a run.

```ts
const NAN: Build = { size: 0.9, lean: 21, nod: -14, headX: 9, headY: 9 };   // bent double, head up
const body = bodyOf(NAN);
const head = headOf(NAN);
part('head', 'head', 'body', turned(head, NECK), (d) => posed(d, head, (c) => kerchief(c, DARK_CLOTH))),
```

What makes one a hero and not a soldier with a name, as the ten were drawn:

- **A shape nobody else has.** `npm run art:roster -- Heroes shape` draws them as black shapes on white. Each must be named from that alone: battlements on a helm, a square cap, a headstone on a back, a crown of ice, the sun's rays.
- **A stance that is what they do.** Planted behind a door of a shield; leaning into a run with a lance; bent under firewood with a fire held high.
- **Their own weapon, big, as the `weapon` part,** drawn in `kit/heroes.ts` and nowhere else, so that no soldier is given it.
- **Cloth that moves:** a cape, a scarf's tails, a veil's train, a tassel, a horse's tail on a helm, each an `extra` with `sway`.
- **One color of their own beside their side's:** a moss hood, a yellow jerkin, a black veil. It goes on cloth or on what they carry, and the side's color stays on enough cloth to tell whose they are.
- **A sign of who they are:** two coins at a belt, oaths sealed and hung from a shoulder, the stake still in him.

A weapon held level and long (a couched lance) has to stay on its page: 40 past the canvas is all there is. `npm run art:pages` holds every part of every unit to it.

**A companion** (`units/band.ts`) is a beast of the kit made into somebody with one or two things: an ear that never stood up and a purse for what he fetches, a soldier's helmet strapped on a bear, a garden and a lamp on a turtle's shell. The shared beast is left as it was, and the companion is a unit of its own that calls the same parts (`quadruped`, `creature`, `lanternWisp` are exported for that) or lists the beast's parts and adds one.

These files are in Legion Holdout's `src/art`. The copy of the kit in this skill (`assets/kit`) has them only once it has been taken from that project (`scripts/sync.mjs`).

## Beasts and riders

**A four-legged beast** (`units/beasts.ts`, `quadruped`) is a barrel of a body on four legs from `kit/beasts.ts`, a tail as an `extra` that sways, and a neck and head that the rig moves as the `weapon`, pivoted at the withers, so that its attack is its head thrown forward (`style: 'bite'`). The far legs are `legBack` and the near ones `legFront`, so it walks. `size` scales the whole build about the feet: a hound is 0.84 of it, a bear 1.14. A blanket over its back in its side's color is what says whose it is.

**Its head has no face**, like every head: the hound's is under a mask of leather, the bear's muzzle under a plate, the stag's in a hood, the ram's behind its curled horn, the yak's under a forelock, the lizard's under a plate of bronze, the horse's under a chanfron. Draw a new one from the withers forward, with whatever covers it drawn as the biggest thing on it.

**What is not four-legged** (a beetle, a crab, a turtle with a fort on it, a slime, a flame in a lantern, an eagle) is drawn by hand as parts with roles. Two things were learned on them. A creature with a shell has nowhere for cloth, and a little pennon stuck in it was not enough to tell its side: it wears a cloth over the shell as well. And whatever it strikes with is its `weapon` and must still overlap the body at the far end of the strike.

**A rider** (`mounted`) is a recipe like any other, sat on a horse: `upper(recipe)` gives the rider from the hips up, each part is drawn smaller (0.84) and moved onto the horse's back, and one leg is drawn down the flank. The horse is the four-legged build at 1.22 with its head as an `extra`, since it is the rider who strikes. A horse in a caparison (cloth to the hooves) shows its side whatever the rider wears. Keep the rider back from the withers so that the horse's head is clear of the weapon.

## Golems and engines

**A golem** (`golem` in `units/golems.ts`) is one build in whatever it is made of: `rock`, what `cap`s it, the `rune` in its chest, and parts of its own behind it and in front, which are what tell one from another: shards of ice, stacks burning on its back, a crown of leaves, a key turning.

**An engine** (`units/machines.ts`) has no head and no hands. Its wheels are its legs (`legBack`, `legFront`, each pivoted at its hub, so they turn as it goes), and whatever it strikes with is its `weapon`, pivoted where it turns or slides: a catapult's arm at its axle (`lob`), a cannon's barrel at its trunnion (`shoot`), a ram's log (`ram`). It carries cloth of its side as a pennant on a pole, a drape over its bed or a cover. A part that slides out (a ram's log, a wagon's spears) is drawn long enough to still be inside the engine when it is out.

## Structures and summoners

**A structure** is a building or a trap (`units/structures.ts`, and more of both in `units/works.ts`). It is drawn on the same canvas with its foot at (96, 180), and it has fewer parts than a unit: a `shadow`, a `body`, and an `extra` if it flies a flag, which is the one thing on it that moves. It has no weapon, no head and no legs. A rig leaves it still, sets it back a little when it shoots, shudders it when it is struck, and brings it down where it stands. Its `muzzle` is where a shot leaves a tower from.

**A summoner** (`units/summoners.ts`) is a unit like any other, read by what it calls with: a long horn with a cloth hung from it, a lantern on a crook, a drum and beater, a curved horn. Each is a part in `kit/parts.ts` that no one else carries.

## The notes, the roster and the check

Every unit has a line in `units/notes.ts`: the set it was drawn for, the part it was drawn to play (`melee`, `ranged`, `caster`, `support`, `captain`, `boss`, `beast`, `mounted`, `engine`, `building`, `trap`), and how it is read. A game picks its cast from that (`UNIT_NOTES`), and so does the roster:

```bash
npm run art:roster -- Mireborn zoom=1.6                  # a set
npm run art:roster -- beast engine both                  # roles, in both colors
npm run art:roster -- templar khan pose=strike zoom=2    # units, mid-blow
npm run art:roster -- cols=14 zoom=0.8 out=build/cast.png   # everyone
npm run art:roster -- Heroes shape                       # as black shapes on white: are any two alike?
npm run art:roster -- knight bram archer wren cols=2     # units named one by one are drawn in that order
npm run art:pages                                        # every part of every unit, held to its page
npm run art:roster -- check                              # what a program can check, over the whole kit
npm run art:roster -- list=docs/art/roster.md            # the cast as a list
```

The roster draws from the source, so it shows a unit that no game uses yet. The check (`src/art/check.ts`) is over every unit too, and a game's tests should call `checkCast()`: a unit that is in the kit and off the palette is otherwise found by the next game that picks it.

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
