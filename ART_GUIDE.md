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

- a closed helmet with a dark slit (Knight, Paladin, Berserker, Warlord, Jarl, Honor Guard, and the Blacksmith's flat mask)
- a hood filled with solid shadow (Archer, Mage, Pyromancer, Harpooner, Gravedigger)
- a hat or helm over a veil, a scarf or mail, with shadow between (Militia, Poacher, Lancer, Javelineer, Huscarl, Frost Witch, Cleric, Lamplighter, Bell Ringer, and the Beekeeper, whose veil has one dark window of net)
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

The first brief asked for flat fills with one shade tone and at most one highlight. The owner later asked for more ("more shading, and more fidelity in the decorations"), so a piece has more tones now. They are still flat shapes: no gradients, no filters, no blur.

`Doc.piece` draws all of it, for every piece of every picture:

- The fill, and a darker shade as a rim along the right and the bottom, because the light comes from the top left.
- A deeper tone at the far edge of that rim, on pieces big enough to show it.
- A lit rim along the left and the top.
- A streak of light across a piece of something polished: metal, ice, a cut stone. A material says it is polished with `gloss` in the palette.

The deeper tone, the lit rim and the streak are the outline color and the highlight color laid over at part strength, so every material takes them and none needs tones of its own.

Besides that:

- At most one small bright highlight on a piece (`Doc.glint`).
- Shadows that things cast on each other: a head on the shoulders under it, an arm on the body, a belt on the cloth below it. `Doc.shadeOver` lays one over whatever is under it. A head's is part of the head, so it moves with it.
- Surface detail on the shared parts, drawn inside the piece so that it is cut to its shape: mail rings, the edges of plates, creases where cloth gathers (`crease`), the bevel of a blade, the grain of wood, a horn's ridges, a boot's sole and cuff. A unit's torso is dressed as what it is with one line: `stripe`, `lacing`, `buttons`, `patch`, `seam`, `mailRings`, `lames`.
- A glow is flat rings: a pale disc at half strength round a core. Never a blur.

One caution with small marks on a head. One or two dots alone near where a face would be can read as eyes. Rivets on a helm go in a row of three or more along an edge, behind the opening, or not at all.

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
src/art/kit/draw.ts      Doc: a picture in the making. piece, flat, line, glint, shadeOver, lightOver, at
src/art/kit/parts.ts     the reusable parts: legs, torsos, helms, hoods, weapons, shields, capes
src/art/kit/unit.ts      what a unit's art is: parts in draw order, each with a role and a pivot
src/art/units/*.ts       one file to a unit
src/art/rig.ts           where each part is, given a pose
src/art/poses.ts         the far ends of each movement
src/art/fx.ts            projectiles and effects
src/art/board.ts         where the board is and the colors of each kind of land
src/art/scenery.ts       what stands in a land: trees, rocks, ruins, and the camps, towers and strongholds a map marks
src/art/backdrop.ts      the two painted scenes of a land: the ground of a battle, and the map of its stages
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

## Structures and summoners

**A structure** is a building or a trap (`src/art/units/structures.ts`). It is drawn on the same canvas with its foot at (96, 180), and it has fewer parts than a unit: a `shadow`, a `body`, and an `extra` if it flies a flag, which is the one thing on it that moves. It has no weapon, no head and no legs. The rig leaves it still, sets it back a little when it shoots, shudders it when it is struck, and brings it down where it stands.

- It is drawn as the thing it is: a tower is timber legs, a walled top and a roof; a tent is cloth on a pole; a trap is an iron plate with its spikes up.
- **A building has one door or one slit, and never two openings side by side.** Two dark holes over a third is a face. For the same reason the Longhouse has a cloth hung from its gable and not a round shield: a round thing in a triangle reads as an eye.
- Whose it is shows in its roof, its flag or a band, as a unit's cloth does.
- **A trap is low and flat**, about 40 units tall, drawn round the middle of its tile. The game draws it under everyone's feet with a ring of its side's color round it, as whoever stands in front of a trap hides it.
- Its `muzzle` is where a shot leaves a tower from, and where what a spire throws gathers.

**A summoner** (`src/art/units/summoners.ts`) is a unit like any other, read by what it calls with: the Herald's long horn with a cloth hung from it, the Ringleader's lantern on a crook, the War Drummer's drum and beater, the Skald's curved horn. Each is a part in `kit/parts.ts` that no one else carries.

## The Faithful

The six units only the rewards give (`src/art/units/faithful.ts`) are townsfolk, and none is dressed as a soldier. Each is read by the hat of its trade and the tool it carries, held as a soldier holds a weapon so that the same movements play:

| Unit | Its head | What it carries |
| --- | --- | --- |
| Beekeeper | a wide straw hat with a veil to the shoulders | a hive of coiled straw on one hand |
| Gravedigger | a hood with a long tail down the back | a shovel, carried like an axe |
| Bell Ringer | a three-cornered hat over a scarf | a great handbell, hung mouth down from the hand |
| Blacksmith | a flat-topped mask of plate with one slit | a hammer, and tongs with a glowing billet |
| Lamplighter | a hat as tall as its head | a long pole with a flame at its tip |
| Honor Guard | a closed helm with a crest from brow to nape | a halberd taller than it is |

**Two dark openings must not meet.** The Beekeeper's hive has a door, and its veil has a window. The first drawing held the hive up beside the head, and the two dark shapes sat side by side at the height of a face. The hive is carried low now, a head's height under the window. Before giving a unit a second dark opening of any kind (a lantern's pane, a horn's mouth, a door), look at where it sits against the first.

Straw is gold's color without its polish (`STRAW` in that file): a material is a fill and a shade, and `gloss` is what makes it metal.

## Editing by hand

Copy a generated file to the same path under `art/overrides`, edit it there, and the game uses yours. The files are plain: attributes only, no styles, scripts or filters, nothing that points outside the file, and ids that say what a thing is (`knight-head-helm-fill`).

A piece's shape is written once, in the file's `defs`, and used for its shade, its fill, its line and its clip. Inkscape shows these as clones: edit the shape and they all follow. A piece is a group: its shade, then, cut to its shape, its deeper edge, its fill, its lit rim and whatever is drawn inside it, then its line.

A unit's file has 40 px of page round the 192 canvas (`viewBox="-40 -40 272 272"`), because a long spear held level reaches past the canvas. Coordinates are unchanged: the feet are at (96, 180). Keep the page as it is and the pivot where it was, or change the pivot in the unit's file. The art build stops on a file with another page, and on a part that reaches the edge of the page, where it would be cut off.

`npm run art` never writes under `art/overrides`. Run it after an edit so the manifest measures your file; the contact sheets show your override, not the generated file.

## Scenes

The ground of a battle and the map of a land are each one painted picture the size of the screen, 1280 by 720 (`backdrop.ts`). They are put together from the scenery by a seed, so they come out the same every time.

- **Scenery** (`scenery.ts`) is drawn about its own foot at (0, 0), so that a scene can stand it anywhere, at any size, facing either way (`Doc.at`). A thing stood many times is written once in the file and used each time.
- **The ground of a battle** has the board's slab of earth in it, a road up to it from each side, and a standard at each corner in the color of the side it is on. The strip above the board is kept to low things, as the back row's plates stand there, and tall things keep to the sides.
- **The tiles are a picture of their own** (`boardTiles`), one for each field on each kind of land, as big as the board is on the screen whatever the field: `public/assets/tiles/meadow-10x5.svg`. It is drawn with tiles the size the first field's are and scaled to fit, so a bigger field's tiles, and what grows on them, are smaller, as everything on that field is. A tile is written a few times in the file and laid many (`Doc.at`), which keeps a field of seventy-two under 30 KB.
- **The map** has a road from the first stage of the land to the last, with a round of trodden earth at each where the game writes the stage's number: a camp for a plain stage, a watchtower for a miniboss, a stronghold for the boss. `mapNodes` says where they are, for the picture and for the game alike.
- A new kind of land needs its scenery and a line in `LOOKS`. `npm run art:sheet` draws all six scenes on `docs/art/scenes.png`, each land's ground with the tiles of a different field laid on it.

## The logo

`src/art/logo.ts` draws the logo with the same pieces as everything else: LEGION in gold over a shield that is half one side's color and half the other's, two standards crossed behind it, BATTLES on a red ribbon. Its letters are drawn by hand on the grid the grade badges' letters are on, 24 by 28, and the file is written three times the size it is drawn, so that its dark line is as heavy for its letters as theirs is.

- **It is painted twice.** First every shape as a pale line, wider than the dark one that goes round it; then the pieces over that. What shows of the first pass is a pale edge round the whole logo, which is what lets it be read on a dark ground, where the dark line alone is lost.
- **The shield is a shield by its top**: cut corners and a dip to a point in the middle. In the logo the word stands across its foot, so its foot can't be what tells it.
- **`logo/mark.svg`** is the shield and the standards alone on a square, for a browser's tab or a portal's tile. `npm run art:sheet` draws both on `docs/art/logo.png`, on a light ground and a dark one, and the mark at four sizes.
- The game shows the logo over the loading bar (`BootScene`), and the page's icon is the mark.

## Grade badges, packs, icons

- **Grades** (`grades.ts`) are plates with a letter, dressed more grandly as they rise: iron for F and E, bronze with a gloss for D and C, silver with a spur at each end and a stud for B, gold with wings and two studs for A, ruby with a gold rim, feathered wings, three studs and a crown for S. A grade is told by its outline as well as its color. Every place that shows a grade shows this badge, never the letter in a line of text.
- **Packs** (`packs.ts`) are all the same foil pouch, crimped top and bottom. What tells one from another is its color and the mark on its seal: the Builder's Pack is the brown of timber with a tower on it, and the Faithful Pack, which is given and never sold, is ruby with a heart.
- **Icons** (`icons.ts`) are drawn as the things they are: a coin is a struck coin, a lock has a shackle. No letters and no emoji. Each kind of land has an emblem there, a medal in its color with what grows or shines in it, which stands on the banner of a world wherever a stage's number is shown. The later screens have theirs: a wrapped gift for the rewards, a cog for the settings, two notes on a beam for the sound, a closed book for a tutorial. Each status has one too, a disc in the status's own color with its mark on it, which stands over a unit for as long as the status does: a flame for burning, drops for poison, stars for a stun, a flake of frost for slowness, chevrons for haste, a blade for rage and a broken one for weakness, a ring and cross for a mark, a shield, and a cross for mending. They are told apart by color first, as they are seen small, and poison's green is not mending's.

## The covers

`scripts/cover.ts` draws the pictures a portal shows the game by (`docs/covers`), from the game's own art and nothing else. The rules of the art hold on them as anywhere: the same outline, the same palette, no faces. And the portals add their own: no border, and no words but the title, so a card on a cover is its tile, its window and its unit, with no name and no grade's letter.

The picture is the title's shield made big: the player's blue from the left and the enemy's red from the right, light where they meet. The first covers had a unit of each side standing guard by the cards on a plain green ground, and the owner asked for more ("Make the units bigger / As if theyre drawing their weapon / Make it extra shaded and shiny because we want people to click it / More units / Waay more units / And structures / And dont leave the grass just green"). So a cover is a battle about to be joined: two armies in ranks that step back to the horizon, what they have built behind them, their leaders big in the front corners, and over the road between them the cards, in the light that goes up from the packs. The title is kept small, by the owner's word: the units and the cards are what should be seen first.

What makes a cover and not a screenshot:

- **Ranks, not a row.** Each rank is taller and lower on the picture than the one behind it, and stands half a place aside, so that every head is seen over the shoulders in front. The leaders stand in the corners, where they hide nobody. A structure stands half as tall again as the soldiers of its rank, so that its roof is over their heads.
- **Weapons up, and clear of the head.** `READY` in the script holds a pose for each way of fighting: a blade or an axe lifted and tipped toward the enemy with a stride under it, a spear levelled, a bow drawn, a staff raised. The game's own wind-up takes a blade back across the helmet, which a still picture can't afford. `npm run cover poses` draws the leaders alone to set a pose by.
- **Shade and shine are laid over the finished figure, never drawn into the art.** `finished` in the script cuts a stencil from a figure's own outline and puts through it: light from the side the middle of the picture is on, with a bright spot where it lands, and shade on the far side; a streak of light for cards and packs; a haze toward the sky's color for whoever stands far back. The near ranks get a bright edge with a soft glow, grown out from the outline. The units' files are not touched, so the cover changes when the art does.
- **The ground is ground.** Bands of darker and lighter grass, a road with its ruts and stones, each side's color over its own half, and the game's own scenery (`src/art/scenery.ts`) along the road. A far keep on each horizon is a flat shape with no window and no gate: nothing on it can be taken for a face.
- **The title is the brightest thing there.** It is small, so it stands in a light of its own with a bright edge round it, and its gold is polished: its light colors are made lighter and its dark line is left dark (`gloss`, white through the "overlay" blend; plain white laid over it washed the outline to grey). Drawn as it is for the game's dark title screen, it was the one dull thing on a shining picture, and the owner took it for darkened by the corners' shade, which does not reach it.
- **Light has a reason.** It comes from the cards, goes up to them from the packs as a beam with sparks in it, and the corners of the picture are let go a little dark.

A new cover is a new layout at the foot of the script: the ranks with who stands in each, the cards, the packs, and where the stars of light sit, which are placed by looking. One thing to know: the renderer (resvg) stopped with an error when the whole sky was put in a group with a `clip-path`, and drew it once the clip was taken off; the sky is drawn without one, and the field covers what runs under it.
