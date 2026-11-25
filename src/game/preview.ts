// What a choice between waves would change, before it is made: the numbers a
// card shows as before and after. The owner asked for the choices to be made
// "WAY more clearer ... to make it clear what that does". A scene never works
// a number out (CLAUDE.md), so it asks here, and here the choice is made on
// a copy of the run and the copy's numbers are read. What is shown is then
// what the rules would do, not a second guess at them.

import { ITEMS, WEAPONS, byId, weaponOf } from './data';
import { KINDS, kindStep, KIND_STEPS, type Kind } from './kinds';
import { buy, choose, heroOf, kindCounts, ownDef, statsOf, twinOf, type RunData } from './run';
import { STATS, STAT_INFO, hasteRate, type Stat, type Stats } from './stats';

/** One number a choice changes, as a card shows it. */
export interface Change {
  /** The stat it is, or '' for a line that is not a stat (a weapon's damage). */
  stat: Stat | '';
  name: string;
  /** What the stat does, in a few words, for whoever does not know it. */
  says: string;
  before: string;
  after: string;
  /** The change as a player reads it beside the two: "+25%", "+3". */
  by: string;
  /** True if after is better than before. */
  up: boolean;
}

/** A weapon's numbers as the hero would fight with it now. */
export interface WeaponFacts {
  name: string;
  /** Damage of one hit. */
  dmg: number;
  /** Hits a second. */
  rate: number;
  /** Damage a second, the two together. */
  dps: number;
  range: number;
}

/** A weapon type the hero would hold more of, and the set bonus before and after. */
export interface SetStep {
  kind: Kind;
  name: string;
  /** How many of the type are held now, and would be after. */
  held: number;
  after: number;
  /** How many the next step of the bonus needs, and the step's own number (1 to 3). */
  at: number;
  /** What the bonus gives now ('' for nothing yet), and what it would give after. */
  now: string;
  then: string;
  /** True if this buy reaches a new step of the bonus. */
  steps: boolean;
}

/** Everything a card of a choice says in numbers. */
export interface Preview {
  changes: Change[];
  /** For a weapon: its own numbers, and those of the one of its kind already held to set beside them, if any. */
  weapon?: { facts: WeaponFacts; held: WeaponFacts | null; joins: boolean };
  sets: SetStep[];
}

const copy = (run: RunData): RunData => JSON.parse(JSON.stringify(run)) as RunData;

/** A stat as a player reads it on its own: Max HP 32, Damage +10%. */
function shown(stat: Stat, value: number): string {
  const v = Math.round(value * 10) / 10;
  if (stat === 'maxHp' || stat === 'armor' || stat === 'regen' || stat === 'might' || stat === 'aim' || stat === 'lore' || stat === 'reach') return `${v}`;
  return `${v > 0 ? '+' : ''}${v}%`;
}

/** How far a stat moved, as a player reads it beside the two numbers. */
function moved(stat: Stat, before: number, after: number): string {
  const d = Math.round((after - before) * 10) / 10;
  const sign = d > 0 ? '+' : '';
  // A plain count (health, armor) is said as a count and, where it is big enough to mean something, as a share too.
  if (stat === 'maxHp' && before > 0) return `${sign}${d} (${sign}${Math.round((d / before) * 100)}%)`;
  return `${sign}${d}${STAT_INFO[stat].percent ? '%' : ''}`;
}

/** Every stat that differs between two sets of stats, as lines before and after. */
export function compare(before: Stats, after: Stats): Change[] {
  const out: Change[] = [];
  for (const stat of STATS) {
    if (Math.abs(after[stat] - before[stat]) < 1e-6) continue;
    const info = STAT_INFO[stat];
    out.push({ stat, name: info.name, says: info.says, before: shown(stat, before[stat]), after: shown(stat, after[stat]), by: moved(stat, before[stat], after[stat]), up: after[stat] > before[stat] });
  }
  return out;
}

/** A weapon's numbers for this run as it stands: its damage after the hero's stats, and how often it strikes. */
export function weaponFacts(run: RunData, id: string, tier: number): WeaponFacts {
  const own = id === heroOf(run).weapon;
  const def = own ? ownDef(run) : weaponOf(id);
  const s = statsOf(run);
  const base = def.dmg[tier] + (def.scale.might ?? 0) * s.might + (def.scale.aim ?? 0) * s.aim + (def.scale.lore ?? 0) * s.lore;
  const dmg = Math.max(1, Math.round(base * Math.max(0.1, 1 + s.damage / 100)));
  const rate = hasteRate(s.haste) / def.every[tier];
  return { name: def.name, dmg, rate: Math.round(rate * 100) / 100, dps: Math.round(dmg * rate * 10) / 10, range: def.range };
}

/** The hero's own weapon before and after, as one line, if the choice changes how it hits. */
function ownLine(before: RunData, after: RunData): Change[] {
  const id = heroOf(before).weapon;
  const tier = 0;
  const a = weaponFacts(before, id, tier);
  const b = weaponFacts(after, id, tier);
  const out: Change[] = [];
  if (b.dmg !== a.dmg) out.push({ stat: '', name: `${a.name} damage`, says: 'Damage of one hit of your own weapon.', before: `${a.dmg}`, after: `${b.dmg}`, by: `${b.dmg > a.dmg ? '+' : ''}${Math.round(((b.dmg - a.dmg) / a.dmg) * 100)}%`, up: b.dmg > a.dmg });
  if (Math.abs(b.rate - a.rate) > 0.004) out.push({ stat: '', name: `${a.name} hits/s`, says: 'How many times a second your own weapon hits.', before: a.rate.toFixed(2), after: b.rate.toFixed(2), by: `${b.rate > a.rate ? '+' : ''}${Math.round(((b.rate - a.rate) / a.rate) * 100)}%`, up: b.rate > a.rate });
  return out;
}

/** The set bonuses that change if a weapon of these types is added. */
function setSteps(run: RunData, kinds: readonly Kind[]): SetStep[] {
  const counts = kindCounts(run);
  return kinds.map((kind): SetStep => {
    const def = KINDS.find((k) => k.id === kind) as (typeof KINDS)[number];
    const held = counts[kind];
    const after = held + 1;
    const step = kindStep(held);
    const next = kindStep(after);
    // How many the step after this buy needs; at the last step, the last step's own count.
    const at = KIND_STEPS[Math.min(next, KIND_STEPS.length - 1)];
    return { kind, name: def.name, held, after, at, now: step > 0 ? def.says[step - 1] : '', then: next > 0 ? def.says[next - 1] : '', steps: next > step };
  });
}

/** What the level's choice `i` would change. A bond with a companion changes no stat of the hero's: its card says so in words. */
export function previewLevel(run: RunData, i: number): Preview {
  const after = copy(run);
  if (!choose(after, i)) return { changes: [], sets: [] };
  return { changes: [...compare(statsOf(run), statsOf(after)), ...ownLine(run, after)], sets: [] };
}

/**
 * What buying the camp's ware `i` would change. An item, its stats; a
 * weapon, its own numbers beside those of the same weapon held, if one is,
 * and the set bonuses it would move; a relic changes a rule, not a number,
 * and its card says the rule. A ware that cannot be bought is still shown as
 * if it could: a player wants to know what it would do before saving for it.
 */
export function previewOffer(run: RunData, i: number): Preview {
  const o = run.offers[i];
  if (!o) return { changes: [], sets: [] };
  const after = copy(run);
  // Bought on the copy whatever the purse holds: the numbers are what matter here.
  after.gold = Math.max(after.gold, o.price);
  after.phase = 'camp';
  const bought = buy(after, i);
  const changes = bought ? [...compare(statsOf(run), statsOf(after)), ...ownLine(run, after)] : [];
  if (o.kind !== 'weapon') return { changes, sets: [] };
  const def = byId(WEAPONS, o.id);
  const facts = weaponFacts(run, o.id, o.tier);
  const mine = run.weapons.filter((w) => w.id === o.id).sort((a, b) => b.tier - a.tier)[0];
  const joins = twinOf(run, o.id, o.tier) >= 0;
  return { changes, weapon: { facts, held: mine ? weaponFacts(run, mine.id, mine.tier) : null, joins }, sets: setSteps(run, def.kinds) };
}

/** What an item gives, as lines before and after, without a camp: for a card shown anywhere. */
export function previewItem(run: RunData, id: string): Change[] {
  const after = copy(run);
  after.items.push(byId(ITEMS, id).id);
  return [...compare(statsOf(run), statsOf(after)), ...ownLine(run, after)];
}
