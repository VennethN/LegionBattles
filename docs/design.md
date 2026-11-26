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

And later, after playing (Round 8): "let's make it so you start with a ranged hero instead + 1 companion, / then rework companions into slots that you unlock as you get further into the waves (best wave) up to a max of 6 companions / then the companions themselves are unlocked some of them by completing waves, some of them by doing specific things/ hidden things, you can also get them by collecting them in game (random drop) / as for permanent upgrades, it'll be hero based, so as you finish more with your hero, you get to unlock permanent upgrades for that hero, e.g more skill, more quirks of the hero unlocked as you go, / also, can we make it WAY more clearer on the choice you get per wave", and then "let's make 100 waves".

It is a game in a genre, with its own heroes, names, weapons, enemies and look. Nothing is copied from another game.

## The four things it stands on

1. **A hero you remember.** A name, a few words of who they are, a weapon nobody else has, and a quirk that changes how the run is played, not a line of stats.
2. **A band.** Companions fight beside the hero. They are opened over many runs and chosen before a run.
3. **No two runs alike.** The road forks, weapons of a kind add up, relics bend a rule.
4. **Beautiful.** The house's drawn figures under real light: glow, fire that looks like fire, depth, dusk.

## A run

A hundred waves over ten lands of ten, a boss on every tenth wave and an elite champion on every fifth. After the hundredth the run is won, and the player may go on for as long as they last: the same hundred come round again, harder each time. The owner, of 25 November 2026: "let's make 100 waves".

| Waves | Land | Who comes | Its boss, and what is its own |
| --- | --- | --- | --- |
| 1 to 10 | Thornwood | Bandits, war hounds, poachers who shoot, bruisers, rams that charge, dire wolves, hexers who call up more | The Warlord |
| 11 to 20 | Blackwater Mire | Bog spears, slimes that split in two, netters, mud brutes, spore callers, bog witches who spur the rest on | The Mire Lord: leaves mud where it walks, and it slows you |
| 21 to 30 | Sunscar Dunes | Lancers, scarabs, javelineers, bombers, yaks, tomb guards, war drummers | The Colossus |
| 31 to 40 | Frostholt | Raiders, dire wolves, harpooners, frost witches, war bears, rime golems, war singers | The Jarl |
| 41 to 50 | The Salt Coast | Deckhands, marines, anchormen who charge, sea witches who lob onto marked ground, quartermasters who call up crews | The Corsair: a broadside of shells toward you, each on marked ground |
| 51 to 60 | The Deep Mines | Delvers, tunnel guards, blasters who lob, runesmiths who ward those near them, foremen | The Under King: rocks fall in a ring round you, on marked ground |
| 61 to 70 | The Endless Steppe | Steppe riders, skirmishers and outriders who circle and shoot, wranglers, bannerlords | The Khan: charges three times in a row |
| 71 to 80 | The Hollow Court | Shrouds, crypt guards who get up once, urn bearers who lob, mourners who heal the rest, ferrymen, crypt keepers | The Hollow King: what it calls up gets up once |
| 81 to 90 | The Clockwork City | Tinkers, riflemen, sappers, gearwrights who mend the rest, clock mages who ward them | The Ironmonger: everyone near it moves 30% faster |
| 91 to 100 | The Ashen Forge | Brand bearers, cinder guards, ash casters, slag throwers, ember brutes, taskmasters | The Forge Lord: brings its hammer down in a ring round itself, shown first |

The later lands bring new ways of fighting, not only bigger numbers: blows that fall on marked ground, enemies who ward or heal the others, who get up once, who split, who circle as they shoot. Every one of them is shown before it lands. No new figures were drawn for them: each is a unit the art kit already had.

A wave lasts 20 s at first and lengthens to 35 s by wave 60; a boss's wave lasts until its boss falls, or 48 s. The whole hundred is about 55 minutes of fighting at the most, and about 40 as the plain player plays it (boss waves end when the boss falls). The run is kept in the save at every camp, so it is played over several sittings.

Enemies grow steeply through the first land and more gently after it (`ENEMY_GROWTH` in `data.ts`: 1.6 a wave to wave 10, 0.8 a wave after), and each land has a scale of its own on its roster's numbers. Coins thin out as the waves go on (`COIN_THINNING`) and prices rise (`PRICE_RISE`).

A wave is fought on a field for a set time. The hero is steered; everything else strikes by itself. Between waves is the camp: levels are chosen, wares bought, weapons combined. All of that stands, as built.

New in a run:

### The road

Leaving the camp, the player picks one of two roads to the next wave (three with the Old Map). Each road shows its **risk**, what is different about the wave, and its **reward**, what surviving it gives besides coins. No road is free: the plain wave is not on offer. A boss wave has one road. In the code a road's risk is its `omen` and its reward its `prize`.

Twenty-six roads: six that come anywhere and two that are each land's own. The words in the table are the words the game shows. Seven of the new lands' roads work by the rules of one that was there before (`OMEN_LIKE` in `road.ts`): Smugglers' Run is the caravan's, the Deep Dark the night's, the Vigil the shrine's, Steam Vents the spores', and Squall and Ashfall the falling stones'.

| Road | Risk | Reward | Where |
| --- | --- | --- | --- |
| The Horde | 50% more enemies. | +50% XP | anywhere, from wave 2 |
| Champions | 3 champions join the wave. | Pick 1 of 3 relics | anywhere, from wave 4 |
| Forced March | No camp after it. You start the next wave with the HP you have left. | Pick 1 of 3 relics | anywhere, from wave 4 |
| Toll Road | Pay 20% of your coins. | The wave is 33% shorter | anywhere, from wave 3 |
| The Duel | One huge champion and no other enemies, so no other coins. | Kill it: pick 1 of 3 relics | anywhere, from wave 5 |
| The Wounded | Start the wave at 40% HP. | 1 free upgrade of the best rarity | anywhere, from wave 3 |
| The Stray | A caged companion is on the field, guarded by a champion. | Break the cage: it joins you if a slot is free, and is unlocked for good | Thornwood |
| The Grove Shrine | Stand in its ring for 11 s. Enemies spawn 2x as fast while you do. | 1 free upgrade | Thornwood |
| The Bog | Deep mud: you and enemies move 25% slower. | Pick 1 of 3 relics | the Mire |
| Spore Field | Clouds of spores rise in lanes and poison you. The ground shows where first. | A chest | the Mire |
| Pay Caravan | A guarded wagon crosses the field. | Destroy it: a chest | the Dunes |
| Burning Field | Fire sweeps the field in lanes. The ground shows where first. | Coins are worth 2x | the Dunes |
| The Long Night | It is dark, and enemies move 20% faster. | Pick 1 of 3 relics | Frostholt |
| Blizzard | You move 18% slower, and enemy shots slow you. | Your lowest-tier weapon gains a tier | Frostholt |
| Squall | Lightning strikes where you stand, again and again. The ground shows where first. | Pick 1 of 3 relics | the Coast |
| Smugglers' Run | A guarded cart of contraband crosses the field. | Destroy it: a chest | the Coast |
| The Deep Dark | It is dark, and enemies move 20% faster. | A chest | the Mines |
| Gold Vein | 30% more enemies. | Coins are worth 2x | the Mines |
| Gale | You move 15% slower, and enemy shots fly 40% faster. | Your lowest-tier weapon gains a tier | the Steppe |
| Stampede | Every enemy moves 30% faster. | +50% XP | the Steppe |
| The Restless Dead | Every enemy gets up once after it falls. | Pick 1 of 3 relics | the Hollow Court |
| The Vigil | Stand in the candle ring for 11 s. Enemies spawn 2x as fast while you do. | 1 free upgrade | the Hollow Court |
| Overclocked | Enemies move 20% faster and their shots fly 20% faster. | 1 free upgrade of the best rarity | the Clockwork City |
| Steam Vents | Scalding steam rises in lanes. The ground shows where first. | A chest | the Clockwork City |
| Ashfall | Burning stones fall where you stand. The ground shows where first. | Your lowest-tier weapon gains a tier | the Ashen Forge |
| The Forge | Every enemy is armored: it takes 25% less damage. | 1 free upgrade of the best rarity | the Ashen Forge |

One thing is in every run, whatever the roads: on wave 3 a lone champion walks in, and killing it drops a relic (pick 1 of 3). A player's first run is Wren with Biscuit, and its roads are by the dice like any run's; the Horde is offered from the first camp so that it has two.

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
| **Bram Oakenhold**, the Gatewarden | The last man on a gate that fell. He does not step back. | Gatekeeper. Sword and shield. Sweeps a wide arc in front of you. | *Stand Fast.* Stand still to raise your shield: take 60% less damage, block shots from the front, and attack 25% faster. Moving lowers it. | *Plant the Gate.* Plant a gate in front of you for 5 s. Enemies cannot pass it. Enemies it lands on take 2.5x weapon damage and are stunned for 1.2 s. | Finish 1 run. |
| **Wren Fallowmere**, the Quiet Arrow | A poacher the king could never catch. | Whisper. Longbow. Each arrow hits up to 2 enemies in a line. | *Unseen.* Deal 4% more damage for each second you are not hit, up to 45%. 2x as fast with no enemy near you. Getting hit halves it. | *The One That Matters.* Fire one arrow at the toughest enemy in range: 12x weapon damage. At full Unseen: 24x. | From the start: the first hero. |
| **Orrin Quillon**, the Unfinished | A wizard expelled before his last lesson. | The Unfinished Staff. Homing bolt. Hits up to 2 enemies. | *Unfinished.* Your staff copies the last weapon you bought: its weapon types and its effects. Level ups offer 1 more choice. | *Starfall.* 6 stars fall in a line in front of you. Each deals 1.7x weapon damage in an area. | Clear wave 5. |
| **Fenn Two-Coins**, the Lucky | A thief who has never lost a toss. | Heads and Tails. Fast knife with a 12% crit chance. Each hit has a 4% chance to knock a coin loose. | *Double or Nothing.* Once per camp, flip a coin for an item: heads it is free, tails you pay and lose it. Deal 1% more damage per 5 coins held, up to 16%. | *Vanish.* Turn invisible for 2 s: enemies lose track of you. Every hit is a crit for 4 s. | Collect 200 coins in one run. |
| **Old Nan Cinderwick**, the Hearthwitch | She kept one fire lit for sixty years. | Hearthbrand. Fireball. Explodes on hit and sets enemies on fire. | *Banked Fire.* Burning enemies near you never stop burning. Hitting a burning enemy with your staff adds 35% to its burn, up to 3x. | *Wildfire.* A ring of fire spreads out from you: 2x weapon damage, and enemies burn for 5 s. | Beat the boss of wave 10. |
| **Isaura Vane**, Captain of the Ninth | Her company, the Ninth, is gone. She rides on alone. | The Ninth's Lance. Long lance. Hits every enemy in a line. | *Tilt.* Ride in a straight line for 1.5 s to ready your lance: the next thrust deals 2.5x damage. Turning sharply or stopping loses it. | *Charge.* Dash the way you are moving. Enemies in your path take 3x weapon damage and are stunned for 0.4 s. | Finish 7 runs. |
| **Hroth**, the Unburied | They buried him twice. | Gravecleaver. Great axe. Slow, wide, heavy sweeps. | *Grave Debt.* Below 33% HP: deal 40% more damage, and axe kills heal 1 HP. Once per land, survive a killing blow with 25% HP. No health regen. | *Open Grave.* Costs 30% of your max HP. For 5 s deal 2x damage, and your hits heal you. | Finish 12 runs. |
| **Brother Aldous Bell**, the Shepherd | He rang the bell for the dead. Now he rings it for the living. | The Passing Bell. Bell. Each ring knocks nearby enemies back and heals you. | *Shepherd.* Companions near you attack 25% faster, deal 40% more damage and are healed whenever you are. You deal 10% less damage. | *Toll.* Heal yourself and your companions for 25% HP and revive downed companions. Nearby enemies take 1.5x weapon damage and are stunned for 1.6 s. | Finish 18 runs. |
| **Ysolde Rimeheart**, the Winter Widow | The cold took her husband. She took the cold. | Widow's Tear. Ice wand. Slows up to 3 enemies in a line by 45%. | *Deep Cold.* Hit a slowed enemy to freeze it for 0.9 s. Frozen enemies take 45% more damage and shatter when they die, hitting enemies nearby. | *Whiteout.* Freeze every enemy for 2 s. Enemy shots in the air are destroyed. | Beat the boss of wave 30. |
| **Maren Dawnguard**, the Oathkeeper | She swore to see the morning. | Morningstar. Hammer. Stuns every enemy it lands on for 0.8 s. | *Consecrate.* Your hammer leaves holy ground for 4 s. It burns enemies and heals you and your companions. | *Judgment.* A hammer of light lands on you: enemies around you take 3x weapon damage and are stunned for 1.3 s. Leaves holy ground for 4 s. | Clear wave 50. |

What each skill asks the player to decide: Plant the Gate, where to stand and which way to face; The One That Matters, when (at full Unseen it is doubled) and who is in range; Starfall, which way to face; Vanish, when; Wildfire, where to stand; Charge, which way to ride; Open Grave, when to pay and with how much HP left; Toll, where to stand and which companions are near; Whiteout, when; Judgment, where to stand, as it lands on her.

### What their own weapons learn

Three rules each, thirty in all. For each weapon, one of the three has a second way that can be chosen in its place: level 5 of the hero's mastery track is the pick between the two, the save keeps it, and a run is given it when it begins (`run.alt`). Forty rules in all.

| Weapon | Level 5 | Level 10 | Level 15 | The second way (picked at mastery level 5) |
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

More heroes to come, each a new way to play: a tinker whose weapons stand as engines where she plants them, a gravedigger whose dead get up on his side, a singer whose verses change the fight every few seconds, a kennel master who brings the whole band.

## Companions

A companion is a creature or a person who fights beside the hero by itself. A new player has Biscuit, the war hound, from the start.

**Slots.** The companions go in slots, and the slots are unlocked by the best wave ever cleared, with any hero: one from the start, then at waves 10, 25, 40, 60 and 80, six at the most (`SLOT_WAVES` in `companions.ts`). The owner: "rework companions into slots that you unlock as you get further into the waves (best wave) up to a max of 6 companions". A slot just unlocked is filled at once by whoever has waited longest; a slot the player empties stays empty (to go alone). Every hero brings as many as there are slots.

**No spike.** Each companion's health and damage is shared out: with n of them, each has 1/sqrt(n) of what one alone has. Six together are about 2.45 times one, not six times. The measures are in `docs/journal.md`, Round 8.

A companion has HP. Downed, it sits out for a while and recovers; it comes back whole at each camp. It grows with the hero: a share of the hero's Damage counts for it. At a level up, one of the choices may be a **bond** with a companion on the run (three steps each), which makes it stronger and gives its passive more.

**How each is unlocked**, four ways (`Route` in `companions.ts`): by clearing a wave; by a quest, said in the Quests list; by a hidden quest, of which only a riddle is told; or **found**: from a wave on, a cage may stand on a field with that companion in it (10% a wave, once a run, never on a boss's wave or the stray's road). Breaking the cage unlocks it for good, and it joins the run if a slot is free. A found one still locked is also who the stray's cage holds first. The owner: "some of them by completing waves, some of them by doing specific things/ hidden things, you can also get them by collecting them in game (random drop)". About how many runs a found one takes is in the journal.

| Companion | What it is | What it does | Passive | Unlock |
| --- | --- | --- | --- | --- |
| **Biscuit** | a war hound | Chases the nearest enemy and bites it. | *Fetch.* Fetches coins that are far from you. | From the start. |
| **Pip** | a wisp | Circles you and stings enemies that come close. | *Flare.* When you are hit, Pip stuns nearby enemies for 1.5 s (once every 6 s). Lights up the dark. | Clear wave 5. |
| **Hive** | a beekeeper | Every 4 s, sends bees at the nearest group: a poison cloud for 3 s. | *Honey.* Every 20 s, drops a heart near you. | Found, from wave 6. |
| **Quill** | an eagle | Dives on enemies that shoot from range. | *Keen.* Enemies she hits are marked for 5 s and take 25% more damage. | Clear wave 12. |
| **Greta** | a war bear | Mauls every enemy around her. | *Roar.* When you drop below 50% HP, she roars and stuns nearby enemies for 1.6 s (once every 14 s). | Beat the boss of wave 10. |
| **Ember** | a salamander | Spits fire at the nearest enemy. | *Trail.* Leaves a short trail of fire where it runs. | Collect 350 coins in one run. |
| **Mossback** | an old siege turtle | Slow, with a lot of HP. Walks ahead of you. | *Bulwark.* Nearby enemies attack him instead of you. His shell blocks shots. | Clear wave 20. |
| **Gilt** | a golden beetle | Every 4 s, digs under the nearest enemy and bursts up, stunning enemies around it for 0.5 s. | *Treasure.* Each burst has a 35% chance to dig up a coin. | Found, from wave 21. |
| **Rime** | a small ice golem | Walks by you. Enemies near it are slowed by 35%. | *Cold Snap.* Every 10 s, freezes every enemy near it for 1 s. | Found, from wave 31. |
| **Tam** | a squire with the banner | Stays near you with the banner raised. | *Rally.* You and companions near the banner attack 6% faster. Once per run, he revives you at 25% HP. | Clear wave 35. |
| **Snap** | a reef crab | Grabs the toughest enemy near you and holds it still for 2 s. | *Hard Shell.* Takes 40% less damage. | Found, from wave 41. |
| **Boom** | a little field gun | Stays behind you. Every 3.2 s, fires a shell where enemies are thickest. | *Big Powder.* Its shells knock enemies far back and stun them for 0.5 s. | Found, from wave 51. |
| **Thistle** | a great stag | Charges through enemies and scatters them. | *Stampede.* Enemies he knocks aside are stunned for 1 s. | Kill 2500 enemies in total. |
| **Nettle** | a hedge herbalist | Stays by you and heals you every 6 s. | *Tonic.* Once per wave, when you drop below 30% HP, heals you for 20% of your Max HP. | Hidden: "I come to those who nearly fell, and stood." (clear a wave under 15% HP) |
| **Clank** | a clockwork guard | Stands by you and punches enemies that come close. | *Aegis.* Every 9 s, gives you a ward that blocks the next hit completely. | Hidden: "Make one perfect thing, and I will wake." (a weapon at tier IV) |
| **Smoke** | a grey wolf | Runs down the weakest enemy on the field. | *Cull.* Its bite kills any enemy below 20% HP. Not bosses. | Hidden: "Run three waves where nothing touches you." |

Each is drawn with a unit the kit already had (the herbalist is the kit's leecher, Rime its ice golem, Clank its automaton, Boom its cannon, Hive its beekeeper, Snap its reef crab, Smoke its dire wolf, Gilt its scarab).

## Between runs: Upgrades

Between runs the player goes to **Upgrades** from the title (it was called the Hold until the owner asked for "something familiar"; the code still says Hold). What a player keeps between runs is **each hero's own mastery**. The owner: "as for permanent upgrades, it'll be hero based, so as you finish more with your hero, you get to unlock permanent upgrades for that hero, e.g more skill, more quirks of the hero unlocked as you go".

- **Mastery.** Every run pays mastery to the hero who played it, when it ends: 2 for each wave cleared, 10 for each boss beaten, 25 for the win, 20% more of all of it for each vow sworn, and what each quest done in the run pays. So a run that dies early still moves its hero on. The day's run pays nobody: it is the same run for everyone.
- **A track for each hero**, twelve levels (`mastery.ts`), at 12, 35, 70, 115, 170, 240, 320, 410, 520, 650, 800 and 980 mastery in all. Every hero's has the same shape, and what is in it is theirs:
  1. a stat step; 2. their skill deals 40% more damage; 3. their second passive; 4. a stat step; 5. **pick one**: their own weapon's first way, or its second way; 6. Fury fills 20% faster; 7. a stat step; 8. a relic every run of theirs starts with; 9. their third passive; 10. **pick one**: their skill is 30% bigger, or after it Fury starts 40% full; 11. a stat step; 12. a title.
  A pick can be changed at any time; it counts from the next run. What a hero has unlocked is given to a run as it begins (`termsOf`, `masteryBoons` in `hold.ts`), and the run keeps it to its end.

| Hero | Stat steps | Second and third passive | Relic | Title |
| --- | --- | --- | --- | --- |
| Wren | +16% Damage, +10 Max HP, +12% Attack Speed, +16% Damage | *Long Shot* (Your hits deal up to 30% more damage the farther the target is: full at 300 range.) and *Slip Away* (When you are hit, move 40% faster for 2 s.) | Hunter's Horn | the Uncaught |
| Bram | +2 Melee Damage, +3 Armor, +25% Damage, +15 Max HP | *Shield Bash* (While your shield is raised, enemies that hit you up close are knocked back and stunned for 0.6 s.) and *Hold the Line* (While your shield is raised, heal 1% of your Max HP every second.) | Thornmail | the Gate That Held |
| Orrin | +2 Magic Damage, +10% Attack Speed, +8 Max HP, +10% Damage | *Overflow* (Every 10th kill bursts with magic: 2x weapon damage to enemies around it.) and *Arcane Ward* (Every 12 s, a ward blocks the next hit on you completely.) | Stormglass | the Finished |
| Fenn | +5% Damage, +6 Max HP, +4% Crit Chance, +5% Attack Speed | *Pickpocket* (Kills have a 12% chance to drop an extra coin.) and *Lucky Break* (After you dodge a hit, your next 2 hits are crits.) | Magpie Feather | the Rich |
| Old Nan | +3 Magic Damage, +10 Max HP, +15% Damage, +4 HP Regen | *Warm Hands* (Heal 1 HP every second for each burning enemy near you, up to 3 a second.) and *Hearth* (Stand still for 2 s to light a ring of fire around you. It burns enemies in it.) | Bellows | the Last Hearth |
| Isaura | +5 Melee Damage, +30 Max HP, +60% Damage, +6 Armor | *Trample* (While your lance is couched, enemies you ride into take half your weapon damage and are knocked aside.) and *For the Ninth* (A kill with a Tilt thrust gives you 25% Attack Speed for 3 s.) | Harrier's Spurs | Captain of the Dawn |
| Hroth | +8 Max HP, +1 Melee Damage, +1 Armor, +5% Damage | *Bloodied* (Below 50% HP, take 10% less damage.) and *Hungry Axe* (Kills with your axe heal 1 HP at any HP, at most 4 times a second.) | Last Candle | the Thrice Buried |
| Aldous | +4 HP Regen, +10 Max HP, +2 Armor, +25% Damage | *Last Rites* (When a companion is downed, enemies near it are stunned for 1.5 s.) and *The Flock* (+4% damage for each companion on its feet.) | Kennel Whistle | the Morning Bell |
| Ysolde | +3 Magic Damage, +12 Max HP, +25% Damage, +8% Dodge | *Cold Skin* (Enemies that hit you up close are slowed by 50% for 2 s.) and *Snowfall* (Every 8 s, a gust of snow slows every enemy within 170 for 2 s.) | Frostbite Charm | the Thaw |
| Maren | +1 Melee Damage, +8 Max HP, +1 Armor, +8% Damage | *Dawnlight* (Take 10% less damage while you stand on your holy ground.) and *Radiance* (Enemies that die on your holy ground burst with light: 0.4x weapon damage around them.) | Banner of the Fallen | the Oath Kept |

- **Renown is gone,** and with it the board, the oaths, the hall's and kennels' prices and the places in the band. Mastery is the one thing a player gathers: renown would have been a second currency with nothing left to buy. What a save from before had spent on the board and held in renown is given back as mastery to the hero it played most.
- **Unlocks.** A hero is unlocked by their feat (the table above), a companion by its way, a slot by the best wave. What is locked is dark with "???" and says what unlocks it, and nothing else; a hidden companion says only its riddle.
- **The Armory**: weapons, items and relics start as a smaller pool and the rest come in crates by theme. A crate is unlocked by its own quest only (3 Bow weapons held in one run unlocks the fletcher's), so that playing a way unlocks more of that way. The weapons a run may be offered are one input it is given when it begins (`Terms.pool`).
- **Vows**: hard rules sworn before a run, in any mix. A first win unlocks the first three and two more unlock for each vow a win was sworn under. Each vow sworn pays 20% more mastery, and a hero's badge is the most vows they have won under, and which. In the game's words:
  - Double Time: Enemies move 15% faster.
  - Lean Coffers: Everything in the shop costs 20% more.
  - Bare Fields: Enemies drop no hearts.
  - Champions Abroad: A champion joins every wave from wave 3.
  - One Hand Fewer: 1 less weapon slot.
  - The Early Dark: Every wave is at night: it is dark, and enemies move 20% faster.
  - Open Wounds: No healing between waves: you start each wave with the HP you had left.
  - Second Wind: Every boss revives once with 40% HP.
- **The Daily Road**: one run a day with a hero, a companion and a seed that are the same for everyone, worked out from the date: the whole armory, one slot, no mastery and no vow. Its best wave and its time are kept.
- **Quests**, each paying its hero mastery once, and at the end of every run the nearest ones not yet done and how far along each is. Hidden ones are never listed among them.
- **The Codex**: every hero, companion, enemy, weapon and relic met, and "???" for the rest.

What the player reads calls these by the usual names: deeds are Quests, the Chronicle is the Codex, the Daily Road is the Daily Run, wares are Items, a captain is a Boss. Vow and Mastery keep their names, and the Hold is called Upgrades.

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
