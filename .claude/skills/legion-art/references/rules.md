# The rules of the look

Each rule here came from a picture that went wrong. The reason is given with it, so that a case the rule does not name can still be judged.

## Contents

- No faces
- Proportions
- Line
- Fill and shade
- Palette
- Team color
- Silhouette
- Buildings and traps
- Icons, packs, badges
- Plain SVG
- What a program checks, and what only looking can

## No faces

There are no eyes, mouths, noses or brows anywhere. Not glowing dots either. The figures are toy soldiers, read by their gear, and the look has stayed original and consistent because of it. A head is one of:

- a closed helmet with a dark slit (Knight, Paladin, Berserker, Warlord, Jarl, Honor Guard, the Blacksmith's flat mask)
- a hood filled with solid shadow, `HOOD_INTERIOR` (Archer, Mage, Pyromancer, Harpooner, Gravedigger)
- a hat or helm over a veil, a scarf or mail, with shadow between (Militia, Poacher, Lancer, Javelineer, Huscarl, Frost Witch, Cleric, Lamplighter, Bell Ringer, and the Beekeeper, whose veil has one dark window of net)
- a wrap or a mask (Cutpurse, Bruiser, Hexer)
- no head at all (the Ballista), or a block with one line cut in it (the golems)

Watch for accidents, which is where faces come from:

- **A pale ring round a dark middle reads as an eye.** The Harpooner's fur once ringed its hood's opening and had to be redrawn.
- **Two dots side by side read as eyes** whatever they are meant to be. Rivets on a helm go in a row of three or more along an edge, behind the opening, or not at all.
- **Two dark openings must not sit side by side, or meet.** The Beekeeper's hive has a door and its veil has a window. The first drawing held the hive up beside the head, and the two dark shapes sat at the height of a face. The hive is carried low now. Before giving anything a second dark opening (a lantern's pane, a horn's mouth, a door), look at where it sits against the first.
- A single jewel on a turban or a sign on a golem's chest is fine. Anything where a face would be is not.
- **One round light over a door is an eye over a mouth.** A mine's lamp hung on the middle of its lintel; it hangs off the end now.
- **A dark hollow on a round body is an eye.** A turtle's head was drawn in, leaving one dark hole in the shell. It has a head in an iron cap instead.
- **A flame behind one bar is a slit pupil.** A lantern's pane was pale, its flame a dark almond, and one bar ran down the middle of it. It has two bars and a rail now, and the flame has a pale heart.
- **Things seen inside something are a face if there are three of them.** A slime had a buckle, a bone and a coin in it: two dots and a dash. It has one helmet and a string of bubbles that climbs.
- **A jagged edge under a head is teeth.** A yak's forelock was cut in points; it hangs in strands.
- **Spots on a cap over a door are eyes over a mouth.** The mushroom that is a tower has bands. The mushroom caps that are hats keep their spots, because under them is a scarf and no door.
- **A key with a hole in each wing** is two dark rings side by side. Its wings are solid.
- **A button on top of a cap is an eye looking up.** A student's square cap had a violet button with a dark line round it in the middle of its board. The cord starts from the bare board now.
- **Two flowers at a throat are two eyes.** A stag had a collar of leaves with two round thistle heads on it, side by side. It has one.
- **A round clasp on a dark purse is a pupil.** A hound's purse had a coin for a clasp. It is square.
- **A small shard beside a stone is a black triangle.** Anything smaller than twice the line's width is only line: a chip of crystal by a staff was taken away, and the shards by a wand were made twice as big.

A creature follows the same rule by the same means, and the kit's beasts all do: a mask of leather or iron over a hound's head, a plate over a bear's muzzle, a hood on a stag and an eagle, a curled horn where a ram's eye would be, a forelock over a yak's whole front, a plate of bronze on a lizard, a chanfron on a horse. A beetle and a crab have a shell and nothing on it. If it cannot be drawn without eyes, draw something else.

## Proportions

- A unit stands about 128 px tall on a 192 by 192 canvas, feet at (96, 180).
- The head or helmet is about 40% of the height. The body is short and wide. The legs are stubs.
- Every unit faces right. The game mirrors it to face left, so its light then comes from the top right; that has been accepted.
- A boss is the same drawing shown bigger by the game, not a different proportion.

## Line

- One dark line, `#2a1a10`, 4 px wide at 1x, round joins and round caps, the same width on every part. Seams, strings and creases are that same line.
- When a picture is written at another size (the logo is written three times the size it is drawn), the line is scaled with it so that it looks the same weight.
- The sheet script fails on a dark line of any other width.

## Fill and shade

Everything is flat shapes. No gradients, no filters, no blur. `Doc.piece` draws all of it for every piece of every picture:

- The fill, and a darker shade as a rim along the right and the bottom, because the light comes from the top left.
- A deeper tone at the far edge of that rim, on pieces big enough to show it.
- A lit rim along the left and the top.
- A streak of light across a piece of something polished: metal, ice, a cut stone. A material says it is polished with `gloss` in the palette.

The deeper tone, the lit rim and the streak are the outline color and the highlight color laid over at part strength, so every material takes them and none needs tones of its own.

Besides that:

- At most one small bright highlight on a piece (`Doc.glint`).
- Shadows that things cast on each other: a head on the shoulders under it, an arm on the body, a belt on the cloth below it (`Doc.shadeOver`). A head's shadow is part of the head, so it moves with it.
- Surface detail on the shared parts, drawn inside the piece so that it is cut to its shape: mail rings, the edges of plates, creases where cloth gathers, the bevel of a blade, the grain of wood.
- A glow is flat rings: a pale disc at half strength round a core. Never a blur.

(The first brief asked for one shade tone and at most one highlight. The owner later asked for "more shading, and more fidelity in the decorations", which is why a piece has four tones now. They are still flat.)

## Palette

Every color is defined once, in `src/art/kit/palette.ts`. A new color is added there, with what it is for, never written where it is used.

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
| Bronze | `#c98b52` | `#9a6337` | badge plates |
| Ruby | `#c7364f` | `#952239` | badge plates, what is given and not sold |

Magic accents each have a fill, a shade and a pale halo tone: arcane `#8a5cd6`, fire `#f08a3c`, frost `#6fc7e8`, holy `#f2d264`, venom `#8fce4a`. The land has grass, sand and snow in four tones each, and pine, cactus and bush greens.

A material is a fill and a shade; `gloss` is what makes it metal. Straw is gold's colors without the gloss.

## Team color

**Team color goes on cloth only.** A tunic, a hood, a cape, a plume, a sash, a pennant. Never on steel, wood or a shield's face. Every unit needs enough cloth to be told for its side at a glance; where armor covers the body, give it a cape, a skirt below the belt, or a plume. A building shows whose it is in its roof, its flag or a band. A beast wears a blanket or a hood, an engine flies a pennant or has a drape over its bed, and a creature with a shell has a cloth thrown over it: a small pennon alone did not say whose a crab was. A trap shows no side at all.

Look at a new unit in red as well as blue (`npm run art:roster -- <id> both`). A big piece of cloth that is nobody's can read as a side: a mushroom cap in ruby looked like the enemy's and was made violet.

## Silhouette

Every unit needs a silhouette of its own: a head shape, a weapon and what the other hand holds that no other unit has together. Look at `silhouettes.png`. If two are hard to tell apart, redraw one. The two golems were once the same shape in two colors; the Rime Golem now has a crown of shards.

Small things with a thick line are a dark tangle. Five caltrops were drawn, each smaller than the line round it is wide twice over, and nothing of the steel showed: there are three now, bigger. The same goes for pebbles, rivets and the weights on a net.

Not every unit is a soldier. The Ballista is an engine on wheels, the golems are stone and ice, the Faithful are townsfolk read by the hat of their trade and the tool they carry. A set is better for one that is not a person.

## Buildings and traps

- A structure is drawn as the thing it is: a tower is timber legs, a walled top and a roof; a tent is cloth on a pole; a trap is an iron plate with its spikes up.
- **A building has one door or one slit, and never two openings side by side.** Two dark holes over a third is a face. For the same reason the Longhouse has a cloth hung from its gable and not a round shield: a round thing in a triangle reads as an eye.
- A trap is low and flat, about 40 units tall, drawn round the middle of its tile.
- Something far off (a keep on a horizon) is a flat shape with no window and no gate.

## Icons, packs, badges

- **Icons are drawn as the things they are**: a coin is a struck coin, a lock has a shackle, a cog has teeth. No letters and no emoji. Icons that are seen small are told apart by color first, then by shape.
- **Packs are all the same foil pouch**, crimped top and bottom. What tells one from another is its color and the mark on its seal.
- **Badges are told by outline as well as color**: a higher grade has more to it (a spur, wings, a crown), so that it reads when it is too small for its letter.

## Plain SVG

The files are meant to be opened and edited in Inkscape: attributes only, no styles, scripts or filters, nothing that points outside the file, and ids that say what a thing is (`knight-head-helm-fill`). Paths are absolute moves, lines and curves only, no arcs, so they can be turned and mirrored by arithmetic. A shape is written once in `defs` and used for its shade, fill, line and clip.

## What a program checks, and what only looking can

`npm run art:sheet` fails on: a color off the palette, a dark line of another width, SVG that is not plain, a unit part that runs off its page. It looks at the files a game shows. `npm run art:roster -- check` looks at every unit in the kit, shown or not, for the same, and for a shadow, a body, a line in the notes, a movement that has poses, and cloth of its side on everything but a trap.

Only looking can tell: a face, by design or by accident; whether a unit reads as its side; whether two silhouettes are too alike; whether a part comes away from the body in a pose. So every change to the art ends with the sheets open.
