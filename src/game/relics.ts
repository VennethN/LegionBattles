// Relics. Each is one of a kind and bends a rule: it is not a line of
// stats. A run finds them: one of three from every captain, one from the
// lone champion of the third wave, one of three for coming through a road
// that pays one (road.ts), and now and then one among the camp's wares at
// a high price. A run holds as many as
// it finds.
//
// What each does is in the wave (world.ts) or the run (run.ts), which read
// the numbers here.

export interface RelicDef {
  id: string;
  name: string;
  /** What it does, in a line a player reads. */
  says: string;
  /** A relic made of two others when both are held: it does what both did, and more. Never offered by itself. */
  of?: readonly [string, string];
}

/** The numbers of each relic. */
export const RELIC = {
  /** What a relic costs among the camp's wares at the first wave's prices, and the chance that a camp has one, from which wave on. */
  price: 90,
  ware: 0.09,
  wareFrom: 3,
  /** Coins given in place of a relic when a run holds every one there is. */
  instead: 40,
  bellows: {
    /** How near what dies burning its neighbors are set alight, and for how many seconds. */
    r: 74,
    seconds: 3,
  },
  echobell: {
    /** Every this many blows of the hero's own weapon, one lands twice. */
    every: 4,
  },
  wolfskin: {
    /** How near a companion has to be, and how much more the hero's blows do then. */
    r: 180,
    more: 0.2,
  },
  lastcandle: {
    /** Seconds nothing can hurt the hero after the candle has saved them. */
    grace: 1,
  },
  thornmail: {
    /** How many times the hero's Armor whoever strikes them up close takes, and the least that is. */
    times: 3,
    least: 3,
  },
  stormglass: {
    /** Seconds between strikes, how wide one lands, how many of the hero's own blows it is, and seconds it stuns. */
    every: 8,
    r: 48,
    harm: 2.5,
    stun: 0.4,
  },
  spade: {
    /** The chance that one of the slain gets up on the hero's side, for how long, and the most that stand at once. */
    chance: 0.125,
    seconds: 6,
    most: 5,
    /** What a blow of theirs is, in the hero's own blows, and seconds between them. */
    harm: 0.4,
    every: 0.8,
  },
  twinquiver: {
    /** How far aside the two halves of a split shot fly, in radians, and the share of the shot's harm each does. */
    spread: 0.45,
    share: 0.6,
  },
  ageswhet: {
    /** What each wave come through adds to every weapon the hero carries. */
    each: 0.02,
  },
  seal: {
    /** The share of its price the dearest ware in a camp costs. */
    share: 0.5,
  },
  crown: {
    /** How many times the harm, dealt and taken. */
    dealt: 2,
    taken: 2,
  },
  ledger: {
    /** The share coins not spent in a camp earn, and the most that comes to. */
    share: 0.1,
    most: 30,
  },
  shell: {
    /** Seconds of standing before the mending starts, and seconds between one health and the next. */
    after: 2,
    every: 0.9,
  },
  spurs: {
    /** Seconds of running to the full speed, and how much more that is. */
    seconds: 4,
    most: 0.3,
  },
  whistle: {
    /** The share of the usual time a companion sits out for, and how much harder it hits. */
    down: 0.5,
    harder: 1.25,
  },
  bonedice: {
    /** What the stat rolled up gains and the stat rolled down loses, in its own points. */
    up: 15,
    down: 10,
  },
  emberheart: {
    /** Every this many kills one bursts: how wide, how many of the hero's own blows, and how hot it leaves them burning. */
    every: 5,
    r: 74,
    harm: 0.7,
    burns: 4,
  },
  frostbite: {
    /** The share of their harm the slowed still do. */
    lets: 0.75,
  },
  mirror: {
    /** A dodged blow comes back as this many of the hero's own. */
    harm: 1.5,
  },
  fallen: {
    /** Health for the rest of the run for each champion or captain killed. */
    health: 2,
  },
  sands: {
    /** Seconds shorter a wave is, the least a wave is left, and how much faster fury fills. */
    shorter: 5,
    least: 15,
    fury: 1.33,
  },
  bowl: {
    /** How many times as much a heart gives back, and how much fury. */
    times: 2,
    fury: 0.15,
  },
  tithe: {
    /** Coins paid at a wave's start, and how much more harm for it. */
    coins: 10,
    more: 0.25,
  },
  // The relics made of two: what each does more than its two halves.
  forgeheart: {
    /** Every this many kills one bursts, in place of Ember Heart's 5th. */
    every: 3,
  },
  thunderbell: {
    /** Seconds between strikes, in place of Stormglass's 8. */
    every: 5,
  },
  packbanner: {
    /** How near a companion has to be for Wolfskin's damage, in place of its 180. */
    r: 360,
  },
} as const;

export const RELICS: readonly RelicDef[] = [
  { id: 'bellows', name: 'Bellows', says: 'Enemies that die burning set nearby enemies on fire for 3 s.' },
  { id: 'echobell', name: 'Echo Bell', says: 'Every 4th hit of your own weapon hits twice.' },
  { id: 'wolfskin', name: 'Wolfskin', says: '+20% damage while a companion is near you.' },
  { id: 'lastcandle', name: 'Last Candle', says: 'Once per wave, a killing blow leaves you at 1 HP.' },
  { id: 'magpie', name: 'Magpie Feather', says: 'Coins fly to you from anywhere.' },
  { id: 'thornmail', name: 'Thornmail', says: 'Enemies that hit you in melee take 3x your Armor as damage.' },
  { id: 'stormglass', name: 'Stormglass', says: 'Every 8 s, lightning strikes the toughest enemy for 2.5x weapon damage.' },
  { id: 'horn', name: "Hunter's Horn", says: 'Your first hit on a full-health enemy is always a crit.' },
  { id: 'spade', name: "Gravedigger's Spade", says: '1 in 8 enemies you kill fights for you for 6 s.' },
  { id: 'twinquiver', name: 'Twin Quiver', says: 'Shots split in two on the first enemy hit. Each half deals 60% damage.' },
  { id: 'ageswhet', name: 'Whetstone of Ages', says: 'Each wave you clear: +2% damage for all your weapons.' },
  { id: 'crown', name: 'Cracked Crown', says: 'Deal 2x damage. Take 2x damage.' },
  { id: 'ledger', name: "Paymaster's Ledger", says: 'When you leave a camp, gain 10% of your unspent coins (max 30).' },
  { id: 'shell', name: "Pilgrim's Shell", says: 'Stand still for 2 s to start healing 1 HP every 0.9 s.' },
  { id: 'spurs', name: "Harrier's Spurs", says: 'Moving builds up to +30% Move Speed over 4 s. Getting hit resets it.' },
  { id: 'whistle', name: 'Kennel Whistle', says: 'Companions recover 2x faster and deal 25% more damage.' },
  { id: 'bonedice', name: 'Bone Dice', says: 'Each wave: one random stat +15, another -10.' },
  { id: 'emberheart', name: 'Ember Heart', says: 'Every 5th kill explodes in flames.' },
  { id: 'frostbite', name: 'Frostbite Charm', says: 'Slowed enemies deal 25% less damage.' },
  { id: 'mirror', name: 'Mirror Shard', says: 'When you dodge a hit, the attacker takes 1.5x weapon damage.' },
  { id: 'fallen', name: 'Banner of the Fallen', says: 'Each boss or champion you kill: +2 Max HP for the run.' },
  { id: 'sands', name: 'Running Sands', says: 'Waves are 5 s shorter. Fury fills 33% faster.' },
  { id: 'bowl', name: "Beggar's Bowl", says: 'Hearts heal 2x and fill 15% of your Fury.' },
  { id: 'tithe', name: 'Tithe Box', says: 'Costs 10 coins at the start of each wave. If you can pay: +25% damage that wave.' },
  { id: 'oldmap', name: 'Old Map', says: '+1 road to choose from.' },
  { id: 'seal', name: "Merchant's Seal", says: 'The most expensive item in every shop costs 50% less.' },
];

/**
 * The relics made of two others. Holding both halves makes one of these in their place, at once: it does what both
 * did and more, and takes one place in the row where it took two. They are a thing to chase once a run holds many.
 */
export const FUSED: readonly RelicDef[] = [
  { id: 'forgeheart', name: 'Forge Heart', says: 'Bellows and Ember Heart in one: every 3rd kill explodes in flames.', of: ['bellows', 'emberheart'] },
  { id: 'thunderbell', name: 'Thunder Bell', says: 'Echo Bell and Stormglass in one: lightning strikes every 5 s.', of: ['echobell', 'stormglass'] },
  { id: 'packbanner', name: 'Pack Banner', says: 'Wolfskin and Kennel Whistle in one: +20% damage with a companion twice as far.', of: ['wolfskin', 'whistle'] },
];

/** The two relics a fused one is made of, or none for a plain one: what the fused one counts as holding. */
export function partsOf(id: string): readonly string[] {
  return FUSED.find((r) => r.id === id)?.of ?? [];
}

export function relicOf(id: string): RelicDef {
  const found = RELICS.find((r) => r.id === id) ?? FUSED.find((r) => r.id === id);
  if (!found) throw new Error(`relics: no relic is called "${id}"`);
  return found;
}
