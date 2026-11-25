# Legion Holdout: the design

This is what the game is being reworked into. It is the brief every agent works from. Where it and the code differ, the code is behind, unless `docs/journal.md` says a thing was tried and changed.

## What the owner asked for

In their words, of 25 November 2026:

- "I want it so that the characters are kind of still in the style of kingdom rush / But a bit more dynamic and a bit more memorable / Not 'Knight' but named"
- "i want it to be in the style of brotato but a bit more varied / Take inspiration from some other similar games in terms of progression"
- "you can bring companions with you that you unlock as the game goes on"
- "It'll be a roguelite thing"
- "Each character should be memorable and have their own quirks"
- "For graphics / Let s make it currently still like this / But add post processing like octopath traveller / This means the bullets, effect etc can have real effect such as non cartoon fire, bloom etc / Essentially make the game beautiful to look at"

And earlier the same day: "It seems like the hands are too much inwards" (done: hands are held out from the body).

It is a game in a genre, with its own heroes, names, weapons, enemies and look. Nothing is copied from another game.

## The four things it stands on

1. **A hero you remember.** A name, a few words of who they are, a weapon nobody else has, and a quirk that changes how the run is played, not a line of stats.
2. **A band.** Companions fight beside the hero. They are opened over many runs and chosen before a run.
3. **No two runs alike.** The road forks, weapons of a kind add up, relics bend a rule.
4. **Beautiful.** The house's drawn figures under real light: glow, fire that looks like fire, depth, dusk.

## A run

Twenty waves over three lands (waves 1 to 7, 8 to 14, 15 to 20), a captain at the end of each land. After the twentieth the run is won, and the player may go on for as long as they last.

A wave is fought on a field for a set time. The hero is steered; everything else strikes by itself. Between waves is the camp: levels are chosen, wares bought, weapons combined. All of that stands, as built.

New in a run:

### The road

Leaving the camp, the player picks one of two roads to the next wave (three, once opened in the Hold). Each road shows its **omen**, what is different about the wave, and its **prize**, what surviving it gives besides coins. A captain's wave has one road.

Omens to begin with (each is a change to the wave's numbers or one thing put on the field):

| Omen | The wave | Prize |
| --- | --- | --- |
| Quiet road | as written | nothing more |
| The horde | half as many again, each a little weaker | half as much experience again |
| Champions | fewer, and three champions (bigger, with a ring, twice the health, a trait: quick, armored or burning) | a relic, one of three |
| Night march | the field is dark, the hero's light is small, enemies a little faster | a relic, one of three |
| Pay wagon | a wagon crosses the field under guard; what breaks it has its chest | a heap of coins |
| The shrine | a shrine stands on the field; standing in its ring for eight seconds in all blesses the hero | a blessing: a level's choice at once |
| The stray | a caged creature on the field; break the cage and it fights beside the band for the rest of the run | a stray companion |

### Relics

A relic is one of a kind and bends a rule. It is not a line of stats. About two dozen to begin with, for example:

- Bellows: what dies burning sets its neighbors alight.
- Echo Bell: every tenth blow of the hero's own weapon lands twice.
- Paymaster's Ledger: coins not spent in a camp earn a tenth more.
- Wolfskin: the hero strikes harder with a companion close by.
- Last Candle: the first blow that would kill in a wave leaves one health instead.
- Lodestone: every coin on the field flies in when the last of a wave falls.

They come from captains (one of three), from Champions and Night march roads, and rarely from the camp at a high price. A run holds as many as it finds.

### Kinds of weapon

Every weapon has one or two kinds: Blade, Pole, Blunt, Bow, Thrown, Fire, Frost, Holy, Venom, Arcane. Holding two, three and four of a kind gives that kind's gift, which grows at each step (Blade: critical blows; Pole: reach and going through; Bow: speed of shooting; Fire: longer, hotter burns; Frost: deeper slowing; and so on). The camp shows what is held and what the next step gives. A hero's own weapon counts.

## Heroes

A hero has:

- **A name and an epithet,** and a line they say.
- **A weapon of their own** (their *signature*), held in their hand and swung by their figure. Nobody else can have it, it can't be sold, and it takes no slot. It grows by itself at hero levels 5, 10 and 15. The six slots of floating weapons are as before.
- **A quirk**: a rule only they have, that asks to be played around.
- **A move**: one great deed, filled by kills (the fury bar) and let loose with Space, a click of the other button, or its button on a phone. With AUTO on (it is on for a new player) it goes off by itself when it is full and there is something to hit. It is the hero's moment, and the brightest thing on the screen.
- **What opens them.**

| Hero | Who | Signature | Quirk | Move |
| --- | --- | --- | --- | --- |
| **Bram Oakenhold**, the Gatewarden | The last man on a gate that fell. He does not step back. | Gatekeeper, sword and shield | *Stand Fast.* Standing still for a moment he sets his shield: blows do 40% less and his sword is a quarter faster. A step drops it. | *Shield Rush.* He runs the way he faces, throwing aside and stunning all he meets. |
| **Wren Fallowmere**, the Quiet Arrow | A poacher the king could never catch. | Whisper, a longbow | *Unseen.* Each second since she was last struck adds 4% to her damage, to 60%. A blow takes it all away. | *Rain of Arrows.* A marked ring of ground is rained on for three seconds. |
| **Orrin Quillon**, the Unfinished | A magister thrown out before his last lesson. | The Unfinished Staff | *Echo.* Every third spell is cast twice. He picks from one more choice at each level. | *Starfall.* Stars fall on the thickest of them. |
| **Fenn Two-Coins**, the Lucky | A thief who has never lost a toss. | Heads and Tails, a pair of knives | *Sticky Fingers.* A blow may knock a coin loose. Every ten coins he holds add 1% to his damage, to 60%: spending makes him weaker. | *Vanish.* Two seconds unseen. Enemies lose him, and his next blows are critical. |
| **Old Nan Cinderwick**, the Hearthwitch | She kept one fire lit for sixty years. | Hearthbrand, a burning staff | *Kindling.* What dies burning bursts, and the burst sets others alight. | *Wildfire.* A ring of fire runs out from her. |
| **Isaura Vane**, Captain of the Ninth | The Ninth Lance is gone. She rides on without it. | The Ninth's Lance | *Momentum.* The longer she keeps moving the harder she hits, to half as much again after three seconds. Standing still loses it. Her lance goes through everyone in its line. | *Charge.* A long run through whatever is in the way. |
| **Hroth the Unburied** | They buried him twice. | Gravecleaver, a great axe | *Won't Stay Down.* More damage the more he is hurt. Once in a land he gets up from a killing blow with a third of his health and a burst. He does not mend by himself. | *War Cry.* Those near him flee for two seconds, and his blows heal him for four. |
| **Brother Aldous Bell** | He rings the dead home, and now the living. | The Passing Bell | *Shepherd.* He brings one companion more. What heals him heals his band, and companions near him strike a fifth faster. He himself hits softly. | *Toll.* The bell heals the band and stuns all who hear it. |
| **Ysolde Rimeheart**, the Winter Widow | The cold took her husband. She took the cold. | Widow's Tear, a wand of ice | *Deep Cold.* The slowed, struck again, freeze solid. The frozen take half as much again and break into shards. | *Whiteout.* Everything on the field freezes for two seconds. |
| **Maren Dawnguard**, the Oathkeeper | She swore to see the morning. | Morningstar, a hammer | *Consecrate.* Her hammer leaves holy ground that mends the band and burns enemies. | *Judgment.* A hammer of light falls where the enemy is thickest. |

Bram and Wren are open from the start. The rest are opened by a deed (reach a wave, beat a captain, a number of kills) that the Hold names, as now.

More to come, each a new way to play: a tinker whose weapons stand as engines where she plants them, a gravedigger whose dead get up on his side, a skald whose verses change the fight every few seconds, a kennel master who brings the whole band.

## Companions

A companion is a creature or a person who fights beside the hero by itself. One comes on a run at first; a second place is opened in the Hold, and Brother Aldous brings one more.

A companion has health. Struck down, it sits out for a while and gets up again; it comes back whole at each camp. It grows with the hero: a share of the hero's damage and speed counts for it. At a level, one of the choices may be a **bond** with a companion on the run (three steps each), which makes it stronger and gives its quirk more.

| Companion | What it is | What it does | Quirk |
| --- | --- | --- | --- |
| **Biscuit** | a war hound | runs down the nearest enemy and bites | *Fetch.* Brings in coins that lie far off. |
| **Pip** | a wisp | circles the hero and stings what comes close | *Flare.* When the hero is struck, Pip flashes and stuns those near. It lights the dark. |
| **Mossback** | an old siege turtle | walks ahead, slow, with a great deal of health | *Bulwark.* Enemies near him go for him, and shots stop on his shell. |
| **Quill** | an eagle | stoops on those who shoot from far off | *Keen.* Whatever she strikes is marked and takes more from all. |
| **Greta** | a war bear | mauls in a wide arc | *Roar.* When the hero is under half health she roars, and all near her are stunned. |
| **Ember** | a salamander | spits fire | *Trail.* Where it scurries the ground burns for a moment. |
| **Tam** | a squire with the banner | stands by the hero with the colors up | *Rally.* Everyone near the banner strikes faster. Once in a run he drags a fallen hero back to their feet. |
| **Thistle** | a great stag | charges through the line and scatters it | *Stampede.* What he throws aside is stunned. |

Each is opened by a deed or bought with renown. Biscuit comes after the first run.

## Between runs: the Hold

The title screen becomes the Hold, the place the runs go out from. It keeps:

- **Renown**, earned by every run: for waves come through, captains beaten, deeds done for the first time.
- **The Hall**: the heroes. Those not opened are dark, with "???" and the deed that opens them.
- **The Kennels**: the companions, the same way, and the places in the band.
- **The Armory**: weapons, wares and relics start as a smaller pool and more are opened with renown, a few at a time, so that later runs have more in them than the first.
- **Blessings**: a few lasting gifts in steps, each small (coins to start with, a free reroll in every camp, a third road, a little health).
- **Danger**: once the twentieth wave has been won, the next danger opens (five in all). Each adds a rule (enemies faster, prices higher, champions in every wave, captains with a second wind) and more renown. A hero's badge shows the highest they have won at.
- **The Chronicle**: every hero, companion, enemy, weapon and relic met, and "???" for the rest.

## How it looks

The figures stay in the house's style, drawn in code (`.claude/skills/legion-art`): chunky, one dark outline, a fixed palette, nothing with a face. What changes:

- **Heroes are drawn anew, each for themselves**: a stance that leans into what they do, a shape against the light that is nobody else's (a plume, a hood, horns, a hat), their own weapon big in the hand, cloth that moves (a cape, a scarf, a tabard), and one color of their own beside the team's blue.
- **A hero's own weapon is in their hand** and their figure swings it. What they buy floats beside them.
- **Light is laid over the drawn field by the game** (the no-gradient rule is about the pictures themselves):
  - an hour for every wave, from afternoon through dusk to night in each land, as the color and strength of the light;
  - lights: the hero, companions that glow, fire, magic, bursts, captains; they brighten the ground and the figures round them;
  - bloom on what is bright;
  - depth: the top and bottom of the view are a little out of focus;
  - a darkened rim, graded color, a little grain;
  - shafts of light and motes in the air, and weather by the land (pollen, sand, snow);
  - fire, bolts, shots and bursts drawn as light, with trails, sparks and smoke, not as flat pictures.
- **The interface stays crisp.** Numbers over the field, bars and buttons are not blurred or dimmed. No words under 15 of the layout's units.
- **A setting turns the light down or off,** and the game turns it down by itself where frames are slow.

## How the work goes

The owner is away and asked for a loop: build, have someone else look, decide what is next, and go round again. `docs/journal.md` is where each round is written down: what was built, what the reviewers said, what was decided. Keep it true and short.

The rules of the project in `CLAUDE.md` stand: rules are pure and tested, numbers are in data and measured with `npm run pace`, the screens show and ask, and what nobody has looked at is said.
