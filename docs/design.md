# Lastander: the design

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

Leaving the camp, the player picks one of two roads to the next wave (three, once unlocked in the Hold). Each road shows its **risk**, what is different about the wave, and its **reward**, what surviving it gives besides coins. No road is free: the plain wave is not on offer. A boss wave has one road. In the code a road's risk is its `omen` and its reward its `prize`.

Twelve roads, six that come anywhere and two that are each land's own. The words in the table are the words the game shows:

| Road | Risk | Reward | Where |
| --- | --- | --- | --- |
| The Horde | 50% more enemies. | +50% XP | anywhere, from wave 3 |
| Champions | 3 champions join the wave. | Pick 1 of 3 relics | anywhere, from wave 4 |
| Forced March | No camp after it. You start the next wave with the HP you have left. | Pick 1 of 3 relics | anywhere, from wave 4 |
| Toll Road | Pay 20% of your coins. | The wave is 33% shorter | anywhere, from wave 3 |
| The Duel | One huge champion and no other enemies, so no other coins. | Kill it: pick 1 of 3 relics | anywhere, from wave 5 |
| The Wounded | Start the wave at 40% HP. | 1 free upgrade of the best rarity | anywhere, from wave 3 |
| The Stray | A caged creature is on the field, guarded by a champion. | Break the cage: it joins you for this run | meadow only, from wave 2 |
| The Grove Shrine | Stand in its ring for 11 s. Enemies spawn 2x as fast while you do. | 1 free upgrade | meadow only, from wave 2 |
| Pay Caravan | A guarded wagon crosses the field. | Destroy it: a chest | desert only, from wave 8 |
| Burning Field | Fire sweeps the field in lanes. The ground shows where first. | Coins are worth 2x | desert only, from wave 8 |
| The Long Night | It is dark, and enemies move 20% faster. | Pick 1 of 3 relics | snow only, from wave 15 |
| Blizzard | You move 18% slower, and enemy shots slow you. | Your lowest-tier weapon gains a tier | snow only, from wave 15 |

Two things are in every run, whatever the roads: on wave 3 a lone champion walks in, and killing it drops a relic (pick 1 of 3); and a player's first run has one road out of its first camp, the Stray's, with Biscuit in the cage, who is let out when the wave ends whether the cage was broken or not.

Coins still on the ground when a wave's time runs out count for half. That is what makes Biscuit's Fetch, the Magpie Feather and Pickup Range worth having.

### Relics

A relic is one of a kind and bends a rule. It is not a line of stats. Twenty-six, each saying exactly what it does:

- Bellows: Enemies that die burning set nearby enemies on fire for 3 s.
- Echo Bell: Every 4th hit of your own weapon hits twice.
- Wolfskin: +20% damage while a companion is near you.
- Last Candle: Once per wave, a killing blow leaves you at 1 HP.
- Magpie Feather: Coins fly to you from anywhere.
- Thornmail: Enemies that hit you in melee take 3x your Armor as damage.
- Stormglass: Every 8 s, lightning strikes the toughest enemy for 2.5x weapon damage.
- Hunter's Horn: Your first hit on a full-health enemy is always a crit.
- Gravedigger's Spade: 1 in 8 enemies you kill fights for you for 6 s.
- Twin Quiver: Shots split in two on the first enemy hit. Each half deals 60% damage.
- Whetstone of Ages: Each wave you clear: +2% damage for all your weapons.
- Cracked Crown: Deal 2x damage. Take 2x damage.
- Paymaster's Ledger: When you leave a camp, gain 10% of your unspent coins (max 30).
- Pilgrim's Shell: Stand still for 2 s to start healing 1 HP every 0.9 s.
- Harrier's Spurs: Moving builds up to +30% Move Speed over 4 s. Getting hit resets it.
- Kennel Whistle: Companions recover 2x faster and deal 25% more damage.
- Bone Dice: Each wave: one random stat +15, another -10.
- Ember Heart: Every 5th kill explodes in flames.
- Frostbite Charm: Slowed enemies deal 25% less damage.
- Mirror Shard: When you dodge a hit, the attacker takes 1.5x weapon damage.
- Banner of the Fallen: Each boss or champion you kill: +2 Max HP for the run.
- Running Sands: Waves are 5 s shorter. Fury fills 33% faster.
- Beggar's Bowl: Hearts heal 2x and fill 15% of your Fury.
- Tithe Box: Costs 10 coins at the start of each wave. If you can pay: +25% damage that wave.
- Old Map: +1 road to choose from.
- Merchant's Seal: The most expensive item in every shop costs 50% less.

They come from bosses (pick 1 of 3), from the champion of wave 3, from the roads that pay one, and rarely from the shop at a high price. A run holds as many as it finds.

### Weapon types

Every weapon has one or two types. Holding two, three and four of a type gives that type's set bonus. A hero's own weapon counts. The camp shows what is held and what the next step gives. In the code a type is a `kind` and its bonus a `gift`.

| Weapon type | 2 held | 3 held | 4 held |
| --- | --- | --- | --- |
| Blade | +5% Crit Chance | +10% Crit Chance | +18% Crit Chance |
| Polearm | +12% Range for all weapons | +20% Range for all weapons | +30% Range, and thrusts hit 1 more enemy |
| Blunt | Stuns last 0.2 s longer, +20% knockback | Stuns last 0.35 s longer, +35% knockback | Stuns last 0.5 s longer, +50% knockback |
| Bow | +8% Attack Speed for ranged weapons | +15% Attack Speed for ranged weapons | +25% Attack Speed for ranged weapons |
| Thrown | Thrown weapons bounce to 1 more enemy | Bounce to 1 more enemy, explosions 15% wider | Bounce to 2 more enemies, explosions 15% wider |
| Fire | Burns last 1 s longer | Burns last 2 s longer | Burns last 3 s longer and deal 30% more damage |
| Frost | Slows are 8% stronger and last 0.5 s longer | Slows are 14% stronger and last 1 s longer | Slows are 20% stronger and last 1.5 s longer |
| Holy | +2 HP Regen | +4 HP Regen | +7 HP Regen |
| Poison | Poison clouds are 15% wider and deal 15% more damage | Poison clouds are 25% wider and deal 30% more damage | Poison clouds are 40% wider and deal 50% more damage |
| Arcane | +2 Magic Damage | +4 Magic Damage | +7 Magic Damage, and every 5th spell has no cooldown |

## Heroes

A hero has:

- **A name and a title,** and a line they say.
- **A weapon of their own**, held in their hand and swung by their figure. Nobody else can have it, it can't be sold, and it takes no weapon slot. It grows a tier by itself at hero levels 5, 10 and 15, and learns a rule at each. No shop weapon has its numbers.
- **A passive** (`quirk` in the code): a rule only they have, that is played and can be played well or badly.
- **A skill** (`move`): filled by kills (the Fury bar) and cast with Space, a click of the other button, or its button on a phone. It comes about twice a wave early and three or four times late. Auto-cast is on for a player's first run only; after it the skill is the player's to cast, and the game says so once.
- **What unlocks them.**

The words in the table are the words the game shows.

| Hero | Who | Weapon | Passive | Skill | Unlock |
| --- | --- | --- | --- | --- | --- |
| **Bram Oakenhold**, the Gatewarden | The last man on a gate that fell. He does not step back. | Gatekeeper. Sword and shield. Sweeps a wide arc in front of you. | *Stand Fast.* Stand still to raise your shield: take 60% less damage, block shots from the front, and attack 25% faster. Moving lowers it. | *Plant the Gate.* Plant a gate in front of you for 5 s. Enemies cannot pass it. Enemies it lands on take 2.5x weapon damage and are stunned for 1.2 s. | From the start. |
| **Wren Fallowmere**, the Quiet Arrow | A poacher the king could never catch. | Whisper. Longbow. Each arrow hits up to 2 enemies in a line. | *Unseen.* Deal 4% more damage for each second you are not hit, up to 60%. Getting hit resets it. | *The One That Matters.* Fire one arrow at the toughest enemy in range: 12x weapon damage. At full Unseen: 24x. | From the start. |
| **Orrin Quillon**, the Unfinished | A wizard expelled before his last lesson. | The Unfinished Staff. Homing bolt. Hits up to 2 enemies. | *Unfinished.* Your staff copies the last weapon you bought: its weapon types and its effects. Level ups offer 1 more choice. | *Starfall.* 6 stars fall in a line in front of you. Each deals 1.7x weapon damage in an area. | Clear wave 5. |
| **Fenn Two-Coins**, the Lucky | A thief who has never lost a toss. | Heads and Tails. Fast knife with a 20% crit chance. Each hit has a 4% chance to knock a coin loose. | *Double or Nothing.* Once per camp, flip a coin for an item: heads it is free, tails you pay and lose it. Deal 1% more damage per 4 coins held, up to 60%. | *Vanish.* Turn invisible for 2 s: enemies lose track of you. Every hit is a crit for 4 s. | Collect 200 coins in one run. |
| **Old Nan Cinderwick**, the Hearthwitch | She kept one fire lit for sixty years. | Hearthbrand. Fireball. Explodes on hit and sets enemies on fire. | *Banked Fire.* Burning enemies near you never stop burning. Hitting a burning enemy with your staff adds 35% to its burn, up to 3x. | *Wildfire.* A ring of fire spreads out from you: 2x weapon damage, and enemies burn for 5 s. | Beat the boss of wave 7. |
| **Isaura Vane**, Captain of the Ninth | Her company, the Ninth, is gone. She rides on alone. | The Ninth's Lance. Long lance. Hits every enemy in a line. | *Tilt.* Ride in a straight line for 1.5 s to ready your lance: the next thrust deals 2.5x damage. Turning sharply or stopping loses it. | *Charge.* Dash the way you are moving. Enemies in your path take 3x weapon damage and are stunned for 0.4 s. | Finish 7 runs. |
| **Hroth**, the Unburied | They buried him twice. | Gravecleaver. Great axe. Slow, wide, heavy sweeps. | *Grave Debt.* Below 33% HP: deal 40% more damage, and axe kills heal 1 HP. Once per land, survive a killing blow with 25% HP. No health regen. | *Open Grave.* Costs 30% of your max HP. For 5 s deal 2x damage, and your hits heal you. | Finish 12 runs. |
| **Brother Aldous Bell**, the Shepherd | He rang the bell for the dead. Now he rings it for the living. | The Passing Bell. Bell. Each ring knocks nearby enemies back and heals you. | *Shepherd.* Bring 1 more companion. Companions near you attack 20% faster and are healed whenever you are. You deal 20% less damage. | *Toll.* Heal yourself and your companions for 25% HP and revive downed companions. Nearby enemies take 1.5x weapon damage and are stunned for 1.6 s. | Finish 18 runs. |
| **Ysolde Rimeheart**, the Winter Widow | The cold took her husband. She took the cold. | Widow's Tear. Ice wand. Slows up to 3 enemies in a line by 45%. | *Deep Cold.* Hit a slowed enemy to freeze it for 0.9 s. Frozen enemies take 30% more damage and shatter when they die, hitting enemies nearby. | *Whiteout.* Freeze every enemy for 2 s. Enemy shots in the air are destroyed. | Beat the boss of wave 14. |
| **Maren Dawnguard**, the Oathkeeper | She swore to see the morning. | Morningstar. Hammer. Stuns every enemy it lands on for 0.8 s. | *Consecrate.* Your hammer leaves holy ground for 4 s. It burns enemies and heals you and your companions. | *Judgment.* A hammer of light lands on you: enemies around you take 3x weapon damage and are stunned for 1.3 s. Leaves holy ground for 4 s. | Clear wave 20. |

What each skill asks the player to decide: Plant the Gate, where to stand and which way to face; The One That Matters, when (at full Unseen it is doubled) and who is in range; Starfall, which way to face; Vanish, when; Wildfire, where to stand; Charge, which way to ride; Open Grave, when to pay and with how much HP left; Toll, where to stand and which companions are near; Whiteout, when; Judgment, where to stand, as it lands on her.

### What their own weapons learn

Three rules each, thirty in all. For each weapon, one of the three has a second way that can be chosen in its place: the hero's third oath unlocks the choice, the Hold keeps it, and a run is given it when it begins (`run.alt`). Forty rules in all.

| Weapon | Level 5 | Level 10 | Level 15 | The second way (an oath unlocks the choice) |
| --- | --- | --- | --- | --- |
| Gatekeeper (Bram) | Your raised shield reflects shots back at the shooter. | The first sweep after raising your shield hits all around you and stuns for 0.6 s. | Enemies that hit your raised shield in melee are knocked back and stunned for 0.8 s. | Instead of level 5: Each shot your raised shield blocks fills 6% of your Fury. |
| Whisper (Wren) | Arrows pin full-health enemies in place for 1 s. | At full Unseen, arrows pierce every enemy. | At full Unseen, a kill fires the next arrow instantly. | Instead of level 10: At full Unseen, arrows bounce to 2 more enemies. |
| The Unfinished Staff (Orrin) | Every 3rd bolt casts twice. | A bolt that kills its target jumps to another enemy. | Bolts split in two on the first enemy hit. Each half deals 60% damage. | Instead of level 5: Every 5th bolt deals 3x damage. |
| Heads and Tails (Fenn) | Crits knock a coin loose (once every 1.5 s). | Picking up a coin makes your next hit a crit. | The knife also strikes behind you. | Instead of level 5: Crits heal 1 HP (once every 1.5 s). |
| Hearthbrand (Old Nan) | Explosions leave the ground burning for 2 s. | Burning enemies that die near you explode and set nearby enemies on fire. | Explosions are 50% wider. | Instead of level 15: Its burn deals 50% more damage. |
| The Ninth's Lance (Isaura) | Tilt thrusts knock enemies back and stun them for 0.6 s. | A kill with the lance readies the next thrust at once. | Tilt thrusts deal 3.5x damage and reach 50% farther. | Instead of level 10: After a Tilt thrust, you cannot be hurt for 0.8 s. |
| Gravecleaver (Hroth) | In Grave Debt, your axe hits all around you. | Enemies your axe kills in Grave Debt explode. | Surviving a killing blow also casts Open Grave for free. | Instead of level 10: In Grave Debt, attack 30% faster. |
| The Passing Bell (Aldous) | Each ring takes 3 s off a downed companion's recovery. | Companions near you take 50% less damage. | Each ring makes every companion near you attack at once. | Instead of level 10: Companions near you deal 40% more damage. |
| Widow's Tear (Ysolde) | Bolts pierce every enemy in their line. | Shattered enemies leave ice on the ground for 3 s. It slows enemies by 40%. | Bosses stay frozen for the full time. | Instead of level 10: Shattered enemies freeze the enemies near them for 0.8 s. |
| Morningstar (Maren) | Holy ground lasts 2x as long. | On holy ground, your hammer attacks 33% faster. | Enemies that die on holy ground heal you 1 HP. | Instead of level 5: Holy ground is 40% wider. |

The third oath of each hero, which unlocks the second way:

- Not One Step: As Bram: beat a boss without getting hit in that wave.
- Never Seen: As Wren: clear 5 waves in one run without getting hit.
- The Last Lesson: As Orrin: change the form of your staff 10 times in one run.
- Heads Every Time: As Fenn: win 6 coin flips in one run.
- Banked High: As Old Nan: stack burn to its max on 20 enemies in one run.
- The Ninth Rides: As Isaura: kill 40 enemies with Tilt thrusts in one run.
- Paid in Full: As Hroth: kill 150 enemies while in Grave Debt in one run.
- The Flock: As Aldous: max out your bond with a companion.
- Deep Winter: As Ysolde: hold 4 Frost weapons.
- Hallowed: As Maren: hold 4 Holy weapons.

More heroes to come, each a new way to play: a tinker whose weapons stand as engines where she plants them, a gravedigger whose dead get up on his side, a singer whose verses change the fight every few seconds, a kennel master who brings the whole band.

## Companions

A companion is a creature or a person who fights beside the hero by itself. One comes on a run at first; a second slot is unlocked in the Hold, and Brother Aldous brings one more.

A companion has HP. Downed, it sits out for a while and recovers; it comes back whole at each camp. It grows with the hero: a share of the hero's Damage counts for it. At a level up, one of the choices may be a **bond** with a companion on the run (three steps each), which makes it stronger and gives its passive more.

| Companion | What it is | What it does | Passive |
| --- | --- | --- | --- |
| **Biscuit** | a war hound | Chases the nearest enemy and bites it. | *Fetch.* Fetches coins that are far from you. |
| **Pip** | a wisp | Circles you and stings enemies that come close. | *Flare.* When you are hit, Pip stuns nearby enemies for 1.5 s (once every 6 s). Lights up the dark. |
| **Mossback** | an old siege turtle | Slow, with a lot of HP. Walks ahead of you. | *Bulwark.* Nearby enemies attack him instead of you. His shell blocks shots. |
| **Quill** | an eagle | Dives on enemies that shoot from range. | *Keen.* Enemies she hits are marked for 5 s and take 25% more damage. |
| **Greta** | a war bear | Mauls every enemy around her. | *Roar.* When you drop below 50% HP, she roars and stuns nearby enemies for 1.6 s (once every 14 s). |
| **Ember** | a salamander | Spits fire at the nearest enemy. | *Trail.* Leaves a short trail of fire where it runs. |
| **Tam** | a squire with the banner | Stays near you with the banner raised. | *Rally.* You and companions near the banner attack 6% faster. Once per run, he revives you at 25% HP. |
| **Thistle** | a great stag | Charges through enemies and scatters them. | *Stampede.* Enemies he knocks aside are stunned for 1 s. |

Each is unlocked by a quest or bought with renown. Biscuit is met on a first run's second wave.

## Between runs: the Hold

The title screen becomes the Hold, the place the runs go out from. Deeds open most heroes and companions within a player's first evenings, so the Hold has two things at its heart: lasting upgrades that renown buys, and for every run a next thing to go for. It keeps:

- **Renown**, earned by every run: for waves come through, captains beaten, the win, deeds done for the first time, and more for every vow the run was sworn under.
- **The Hall**: the heroes. Those not opened are dark, with "???" and the deed that opens them (or a price in renown, dear, for whoever is stuck).
- **Oaths**: three for each hero, done as that hero. A win gives them a new title. A win with at least 1 vow gives them a relic every run of theirs begins with. And one that is about their passive unlocks the second way of their own weapon (see "What their own weapons learn"), which the player then chooses or not. Five of those are counted by the run as it is played: Tilt kills, kills in Grave Debt, burns stacked to their max, coin flips won, forms the staff took. Thirty in all.
- **The Kennels**: the companions, the same way, and the places in the band.
- **The Armory**: weapons, items and relics start as a smaller pool and the rest come in crates by theme. A crate is unlocked by its own quest (3 Bow weapons held in one run unlocks the fletcher's) or bought with renown, so that playing a way unlocks more of that way. The weapons a run may be offered are one input it is given when it begins (`Terms.pool`): a first run's small pool is simply the armory as a new player has it, twelve weapons.
- **The Board**: lasting upgrades bought with renown, each making every run after it stronger. The owner asked for this in so many words: "since its roguelite, can we add upgrades we can spend on to make permanent per run". Four branches, each grown from its foot, a deeper place needing the one before it: the hero (health, armor and speed of foot down one side, harm and speed of striking down the other, one getting-up a run at the bottom, dear), the band (companions' health, harm, and how soon a fallen one gets up), the purse (coins to begin with, free looks at other wares, marks that strike a ware from a run's table) and fortune (luck, experience, reach, a third road, a second look at a relic's choice). Prices rise down a branch and a new player can always nearly afford something. It can be taken back whole for what was paid, to be spent another way. The enemies are not made stronger to take it back: the vows are what a strong player adds.
- **Vows**: hard rules sworn before a run, in any mix. A first win unlocks the first three and two more unlock for each vow a win was sworn under. Each vow sworn pays 20% more renown, and a hero's badge is the most vows they have won under, and which. A vow and a road add up: the vow's champion keeps out of a duel and off wave 3, where the run's own champion is; the night road is not offered under The Early Dark; a forced march and Open Wounds ask the same thing, and the worse of the two holds. In the game's words:
  - Double Time: Enemies move 15% faster.
  - Lean Coffers: Everything in the shop costs 20% more.
  - Bare Fields: Enemies drop no hearts.
  - Champions Abroad: A champion joins every wave from wave 3.
  - One Hand Fewer: 1 less weapon slot.
  - The Early Dark: Every wave is at night: it is dark, and enemies move 20% faster.
  - Open Wounds: No healing between waves: you start each wave with the HP you had left.
  - Second Wind: Every boss revives once with 40% HP.
- **The Daily Road**: one run a day with a hero, a companion and a seed that are the same for everyone, worked out from the date. Its best wave and its time are kept, for a portal's board later.
- **Deeds**, and at the end of every run the nearest ones not yet done and how far along each is.
- **The Chronicle**: every hero, companion, enemy, weapon and relic met, and "???" for the rest.

What the player reads calls these by the usual names: the board is Upgrades, deeds are Quests, the Chronicle is the Codex, the Daily Road is the Daily Run, wares are Items, a captain is a Boss. Renown, Vow, Oath and the Hold keep their names. `CLAUDE.md`, "In-game text is plain game language", has the whole list.

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
