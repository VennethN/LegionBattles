// Relics. Each is one of a kind and bends a rule: it is not a line of
// stats. A run finds them: one of three from every captain, one of three
// for coming through a road of champions or a night march, and now and
// then one among the camp's wares at a high price. A run holds as many as
// it finds.
//
// What each does is in the wave (world.ts) or the run (run.ts), which read
// the numbers here.

export interface RelicDef {
  id: string;
  name: string;
  /** What it does, in a line a player reads. */
  says: string;
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
    every: 10,
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
    /** What each wave come through adds to the hero's own weapon. */
    each: 0.03,
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
} as const;

export const RELICS: readonly RelicDef[] = [
  { id: 'bellows', name: 'Bellows', says: 'What dies burning sets its neighbors alight.' },
  { id: 'echobell', name: 'Echo Bell', says: `Every tenth blow of your own weapon lands twice.` },
  { id: 'wolfskin', name: 'Wolfskin', says: 'A fifth more harm while a companion is close by.' },
  { id: 'lastcandle', name: 'Last Candle', says: 'The first blow that would kill you in a wave leaves one health.' },
  { id: 'magpie', name: 'Magpie Feather', says: 'Coins fly to you from anywhere on the field.' },
  { id: 'thornmail', name: 'Thornmail', says: 'Who strikes you up close takes three times your Armor.' },
  { id: 'stormglass', name: 'Stormglass', says: 'Every eight seconds lightning strikes the strongest of them.' },
  { id: 'horn', name: "Hunter's Horn", says: 'The first blow on anyone unhurt is critical.' },
  { id: 'spade', name: "Gravedigger's Spade", says: 'One in eight of the slain gets up on your side for a while.' },
  { id: 'twinquiver', name: 'Twin Quiver', says: 'A shot splits in two when it first hits.' },
  { id: 'ageswhet', name: 'Whetstone of Ages', says: 'Each wave you come through, your own weapon does 3% more.' },
  { id: 'crown', name: 'Cracked Crown', says: 'You deal double harm, and take double.' },
  { id: 'ledger', name: "Paymaster's Ledger", says: 'Coins not spent in a camp earn a tenth more, 30 at most.' },
  { id: 'shell', name: "Pilgrim's Shell", says: 'Standing in one place for two seconds starts mending you.' },
  { id: 'spurs', name: "Harrier's Spurs", says: 'Running builds speed. A blow that lands on you loses it.' },
  { id: 'whistle', name: 'Kennel Whistle', says: 'Companions get up twice as fast and hit a quarter harder.' },
  { id: 'bonedice', name: 'Bone Dice', says: 'Each wave one stat is rolled up by 15 and one down by 10.' },
  { id: 'emberheart', name: 'Ember Heart', says: 'Every fifth kill bursts into flame.' },
  { id: 'frostbite', name: 'Frostbite Ring', says: 'The slowed do a quarter less harm.' },
  { id: 'mirror', name: 'Mirror Shard', says: 'A blow you dodge is thrown back at who struck.' },
  { id: 'fallen', name: 'Banner of the Fallen', says: 'Each champion or captain you kill gives 2 health for the run.' },
  { id: 'sands', name: 'Running Sands', says: 'Waves are five seconds shorter, and fury fills a third faster.' },
  { id: 'bowl', name: "Beggar's Bowl", says: 'Hearts mend double, and fill your fury.' },
  { id: 'tithe', name: 'Tithe Box', says: 'Takes ten coins at each wave. If it gets them, a quarter more harm.' },
  { id: 'oldmap', name: 'Old Map', says: 'One more road to choose from.' },
  { id: 'seal', name: "Merchant's Seal", says: 'The first look at other wares in each camp is free.' },
];

export function relicOf(id: string): RelicDef {
  const found = RELICS.find((r) => r.id === id);
  if (!found) throw new Error(`relics: no relic is called "${id}"`);
  return found;
}
