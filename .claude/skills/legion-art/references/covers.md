# Covers, thumbnails and key art

A portal shows a game by a picture before anyone has played it. These are put together from the game's own art, by code, as everything else is: a script composes one big SVG from the units' files, the scenery and the logo, and renders it with resvg. `assets/examples/cover.ts` is the script that drew Legion Battles' covers. Copy it into a project's `scripts`, and change two things: it reads that game's `UNITS` (to tell a building from a soldier and for a card's tier) and its `RARITY_MAT` (a card's color), and its layouts at the foot say who stands where.

## What a portal asks

CrazyGames, as of late 2026: three covers, 1920 by 1080, 800 by 1200 and 800 by 800, the same picture laid out three times. No border. No words but the game's title: no "new", no "play now", and so a card on a cover has no name and no grade letter on it. Nothing that is not the game's own. Its preview video is to open on the cover.

## What makes a cover and not a screenshot

The first covers of Legion Battles had a unit of each side standing by three cards on a plain green ground. The owner asked for more: "Make the units bigger / As if theyre drawing their weapon / Make it extra shaded and shiny because we want people to click it / More units / Waay more units / And structures / And dont leave the grass just green". What came of that:

- **A scene with a reason.** A battle about to be joined: two armies in ranks, what they have built behind them, their leaders big in the front corners, and between them what the game is about (there, cards and the packs they come out of).
- **Ranks, not a row.** Each rank is taller and lower on the picture than the one behind it, and stands half a place aside, so that every head is seen over the shoulders in front. The leaders stand in the corners, where they hide nobody. A building stands half as tall again as the soldiers of its rank, so that its roof is over their heads.
- **Weapons up, and clear of the head.** Hold a pose for each way of fighting: a blade or an axe lifted and tipped toward the enemy with a stride under it, a spear levelled, a bow drawn, a staff raised. The game's own wind-up takes a blade back across the helmet, which a still picture cannot afford. Draw the leaders alone on a plain ground to set a pose by.
- **Shade and shine are laid over the finished figure, never drawn into the art.** Cut a stencil from a figure's own outline (an SVG mask of the figure turned white) and put through it: light from the side the middle of the picture is on, with a bright spot where it lands, and shade on the far side; a streak of light for cards and packs; a haze toward the sky's color for whoever stands far back. The near ranks get a bright edge with a soft glow, grown out from the outline (`feMorphology` dilate, then a blur under it). The units' files are not touched, so the cover changes when the art does. This is the one place gradients and filters are used.
- **The ground is ground.** Bands of darker and lighter grass, a road with its ruts and stones, each side's color over its own half, and the game's scenery along the road. Something far off is a flat shape with no window and no gate, so that nothing on it can be taken for a face.
- **The title is small and is the brightest thing there.** It stands in a light of its own with a bright edge round it, and its gold is polished: its light colors made lighter and its dark line left dark (white through the "overlay" blend; plain white laid over it washed the outline to grey). Drawn as it is for a dark title screen, it was the one dull thing on a shining picture, and the owner took it for darkened.
- **Light has a reason.** It comes from the middle, and the corners are let go a little dark.
- **Light caught on edges**: a few four-pointed stars on blades, helmets and crowns, placed by looking.

## Things that cost time

- resvg stopped with an error when a whole layer was put in a group with a `clip-path`; it drew once the clip was taken off. Clip single shapes, not a layer.
- A figure's stencil needs its room given in user units (`maskUnits="userSpaceOnUse"`), a little bigger than the figure, or a long spear is cut.
- Everything is placed by the same dice (a small seeded generator), so a cover drawn twice is the same cover.
- Look at each size. A layout that works wide hides the leaders' blades behind the packs when it is tall.
