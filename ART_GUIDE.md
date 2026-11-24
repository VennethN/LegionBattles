# Art guide

Everything in the game is drawn in code as SVG. This says what the drawing must look like, how the code that draws it is laid out, and how to add to it.

The pictures to judge the art by are in `docs/art`. Make them again after any change:

```bash
npm run art:sheet
```

| File | What it shows |
| --- | --- |
| `contact-sheet.png` | Every unit on both teams, every effect, the board, the icons, the packs, the grade badges. |
| `parts.png` | Every part of every unit alone, on both teams, with its pivot marked. |
| `poses.png` | Every unit at the far end of each movement. A part that comes away from the body shows here. |
| `silhouettes.png` | Every unit as a black shape 48 px tall. |

Open them and look. The script checks what a program can check (colors, line widths, plain SVG). Whether there is a face on anything, only looking can tell.

## The rules

### No faces

There are no eyes, mouths, noses or brows anywhere. Not glowing dots either. A head is one of:

- a closed helmet with a dark slit (Knight, Paladin, Berserker, Warlord, Jarl)
- a hood filled with solid shadow (Archer, Mage, Pyromancer, Harpooner)
- a hat or helm over a veil, a scarf or mail, with shadow between (Militia, Poacher, Lancer, Javelineer, Huscarl, Frost Witch, Cleric)
- a wrap or a mask (Cutpurse, Bruiser, Hexer)
- no head at all (the Ballista), or a block with one line cut in it (the golems)

Units are told apart by silhouette, gear, stance and team color.

Watch for accidents. A pale ring round a dark middle reads as an eye: the Harpooner's fur once ringed its hood's opening and had to be redrawn. Two dots side by side read as eyes whatever they are meant to be. A single jewel on a turban or a sign on a golem's chest is fine; anything where a face would be is not.

### Proportions

- A unit stands about 128 px tall on a 192 by 192 canvas, feet at (96, 180).
- The head or helmet is about 40% of the height. The body is short and wide. The legs are stubs.
- Every unit faces right. The game mirrors it to face left.

### Line

- One dark line, `#2a1a10`, 4 px wide at 1x, round joins and round caps, the same width on every part. Seams, strings and creases are that same line.
- `npm run art:sheet` fails on a dark line of any other width.

### Fill and shade

- Flat fills. No gradients, no filters, no blur.
- One shade tone on each piece: a darker rim along the right and the bottom, because the light comes from the top left. `Doc.piece` draws it: the piece in its shade color, then its fill pushed 5 px up and left and cut to the piece's shape.
- At most one small highlight on a piece (`Doc.glint`).
- A glow is flat rings: a pale disc at half strength round a core. Never a blur.

### Palette

Every color is defined once, in `src/art/kit/palette.ts`. Nothing may use a color that is not there, and `npm run art:sheet` fails on one that is.

| Name | Fill | Shade | Used for |
| --- | --- | --- | --- |
| Outline | `#2a1a10` | | every line |
| Steel | `#b9c2cc` | `#8d97a3` | helms, blades, plate |
| Iron | `#5d6672` | `#434b56` | mail, dark helms, dark armor |
| Leather | `#6b4a2b` | `#4e3520` | boots, belts, hands |
| Wood | `#9a6a3a` | `#75502b` | shafts, shields, carts |
| Gold | `#c8a24a` | `#9c7c33` | trim, crowns, buckles |
| Bone | `#e9dfc6` | `#c4b594` | horn, fur, parchment, fletching |
| Linen | `#d9cdb0` | `#b3a585` | cloth that is no team's |
| Dark cloth | `#4a4458` | `#353041` | cloth that is no team's |
| Blue team cloth | `#3d6fb6` | `#2f5893` | the player's side |
| Red team cloth | `#c2453a` | `#933027` | the enemy's side |
| Hood interior | `#1e2b17` | | where a face would be |
| Highlight | `#f4f1e4` | | the one small highlight |
| Stone | `#9c9a8c` | `#77766b` | rocks |
| Dirt | `#b08a5a` | `#8c6b42` | paths, sandstone |

Magic accents each have a fill, a shade and a pale halo tone: arcane `#8a5cd6`, fire `#f08a3c`, frost `#6fc7e8`, holy `#f2d264`, venom `#8fce4a`. The land has grass, sand and snow in four tones each, and pine, cactus and bush greens. Bronze `#c98b52` and ruby `#c7364f` are the plates of the grade badges.

**Team color goes on cloth only.** A tunic, a hood, a cape, a plume, a sash, a pennant. Never on steel, wood or a shield's face. Every unit needs enough cloth to be told for its side at a glance; where armor covers the body, give it a cape, a skirt below the belt, or a plume.

### Silhouette

Every unit needs a silhouette of its own: a head shape, a weapon and what the other hand holds that no other unit has together. Look at `silhouettes.png`. If two are hard to tell apart, redraw one. The two golems were once the same shape in two colors; the Rime Golem now has a crown of shards.

Not every unit is a soldier. The Ballista is an engine on wheels and the golems are stone and ice. A set is better for one of those.

## How the code is laid out

```
src/art/kit/palette.ts   every color
src/art/kit/path.ts      shapes: circles, rounded rectangles, soft outlines through points
src/art/kit/draw.ts      Doc: a picture in the making. piece, flat, line, glint
src/art/kit/parts.ts     the reusable parts: legs, torsos, helms, hoods, weapons, shields, capes
src/art/kit/unit.ts      what a unit's art is: parts in draw order, each with a role and a pivot
src/art/units/*.ts       one file to a unit
src/art/rig.ts           where each part is, given a pose
src/art/poses.ts         the far ends of each movement
src/art/fx.ts            projectiles and effects
src/art/board.ts         tiles and props, by kind of land
src/art/icons.ts         the interface's icons
src/art/packs.ts         the packs
src/art/grades.ts        the grade badges
```

### Shapes

Paths are made only of absolute moves, lines and curves, so they can be turned, mirrored and moved by arithmetic, and the files show plain numbers in Inkscape. There are no arcs: a circle is four curves.

`smooth(points)` is the workhorse. Give it a handful of points and it draws a soft outline through them. Mark a point `'c'` to make it a corner:

```ts
smooth([[76, 54, 'c'], [98, 50], [120, 54, 'c'], [129, 76], [126, 100], [110, 109], [84, 109], [68, 100], [65, 76]])
```

A weapon is drawn upright with its hand at the origin, then turned to how it is held and moved to the hand. The shade is added after the turn, so the light stays top left however a weapon is held.

### Parts, roles and pivots

A unit is a list of parts, back to front. Each part is its own SVG file on the shared canvas. Each has:

- a **role**, which is what the rig moves it as: `shadow`, `legBack`, `legFront`, `body`, `head`, `weapon`, `offhand`, or `extra` (a plume, a cape, a quiver)
- a **parent**: `root`, `body` or `head`. A part turns and moves with its parent
- a **pivot**: the point it turns about. A weapon's is its hand, a head's is the neck, a leg's is the hip, the body's is the feet

Because the game animates by role, a new unit moves without any code of its own. The hand that holds a weapon is drawn with the weapon, on top of what it grips; the arm is drawn with the body and ends where the hand is, so the two stay joined when the weapon turns about its pivot.

### Movement

`poses.ts` holds the far ends of each movement as offsets from standing still: the windup and the strike for each way of attacking (`slash`, `chop`, `thrust`, `bow`, `cast`, `swing`, `throw`, `shoot`), the top of a hop, the landing, being hit, toppling. A unit names its way of attacking with `style`. The game blends between these; the contact sheet draws each one.

## Adding a unit

1. **Decide how it is read.** Three things in a sentence: its head, its weapon, what else. Write that sentence as the comment at the top of its file.
2. **Reuse what fits** from `kit/parts.ts`: `legs`, `torsoPath` or `robePath`, `belt`, `arm`, `cape`, a shield, a weapon. Add new parts there, not in the unit's file, so the next unit can use them.
3. **Write `src/art/units/<id>.ts`.** Copy one that is close. A plain foot soldier is about twenty lines:

```ts
export const militia: UnitArt = {
  id: 'militia',
  style: 'thrust',
  muzzle: [176, 124],   // where a shot leaves from
  top: 48,              // its highest point, for the health bar
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

4. **Add it to `src/art/units/index.ts`**, and its numbers to `src/data/units.ts` under the same id.
5. **Look at it while you draw.** `npx tsx scripts/preview.ts <id>` writes `build/preview.png` with the unit on both teams, in seconds.
6. **Run `npm run art:sheet`** and open all four sheets. Check: no face, enough team color, parts that stay joined at every pose, a silhouette of its own.
7. **Run `npm test`.**

## Editing by hand

Copy a generated file to the same path under `art/overrides`, edit it there, and the game uses yours. The files are plain: attributes only, no styles, scripts, filters or outside references, and ids that say what a thing is (`knight-head-helm-fill`). A piece is a group of three things: its shade, its fill cut to its shape, and its line. Keep the canvas at 192 by 192 and the pivot where it was, or change the pivot in the unit's file.

`npm run art` never writes under `art/overrides`. Run it after an edit so the manifest measures your file; the contact sheets show your override, not the generated file.

## Grade badges, packs, icons

- **Grades** (`grades.ts`) are plates with a letter, dressed more grandly as they rise: iron for F and E, bronze with a gloss for D and C, silver with a spur at each end and a stud for B, gold with wings and two studs for A, ruby with a gold rim, feathered wings, three studs and a crown for S. A grade is told by its outline as well as its color. Every place that shows a grade shows this badge, never the letter in a line of text.
- **Packs** (`packs.ts`) are all the same foil pouch, crimped top and bottom. What tells one from another is its color and the mark on its seal.
- **Icons** (`icons.ts`) are drawn as the things they are: a coin is a struck coin, a lock has a shackle. No letters and no emoji.
