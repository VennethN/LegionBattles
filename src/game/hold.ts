// The Hold: the rules of what a player keeps and grows between runs. Its
// lists and numbers are in holdData.ts and mastery.ts, and what is kept is
// in the save (state.ts). Everything here is plain functions on a save, so
// that the pace report can play a whole career without a screen.
//
// A run pays mastery, when it ends, to the hero who played it (mastery.ts):
// each level of a hero's track unlocks something for that hero alone.
// Companions are unlocked by reaching a wave, by a quest, by a hidden quest,
// or by finding them in a cage on the field; the slots to bring them in are
// opened by the best wave ever cleared. A win opens the vows: hard rules
// sworn before a run, in any mix, for more mastery. Each crate of the armory
// is unlocked by its own quest, and each day has a run that is the same for
// everyone. The Codex remembers everything met.

import { BAND, COMPANIONS, ENEMIES, HEROES, ITEMS, LAST_WAVE, OMENS, RELICS, ROAD, SLOT_WAVES, TIERS, WEAPONS, bossWave, byId, ownRules, weaponOf, type CompanionDef, type Feat } from './data';
import { CRATES, DEEDS, VOW, VOWS, noBoons, thingKey, type Boons, type CrateDef, type DeedTest, type Thing, type VowId } from './holdData';
import { KINDS } from './kinds';
import { LEVEL_XP, PAY, PERKS, levelAt, mastered, trackOf, type Gift, type Level } from './mastery';
import { Rng } from './rng';
import type { Stat } from './stats';
import { kindCounts, newRun, survived, type RunData, type Terms, type Told } from './run';
import { STATS, STAT_INFO, statText } from './stats';
import { bandFor, bestWave, featDone, featShare, isFriend, isOpen, type SaveData } from './state';

// ---------------------------------------------------------------- what a run pays

export interface TallyLine {
  why: string;
  /** How many of them, where there is a count: waves, bosses. */
  count: number;
  xp: number;
}

/** What a run paid its hero in mastery, line by line, for the screen that shows it. */
export interface Tally {
  hero: string;
  lines: TallyLine[];
  /** How many vows the run was sworn under. */
  vows: number;
  total: number;
}

/** True if a run has come through the last written wave. */
export function hasWon(run: RunData): boolean {
  return survived(run) >= LAST_WAVE;
}

/**
 * What a run pays its hero as it stands. The waves, the bosses and the win
 * are paid more for each vow the run was sworn under; a quest pays what it
 * pays, once.
 */
export function tallyOf(run: RunData): Tally {
  const waves = survived(run);
  const lines: TallyLine[] = [];
  if (waves > 0) lines.push({ why: 'Waves cleared', count: waves, xp: waves * PAY.wave });
  if (run.felled.length > 0) lines.push({ why: 'Bosses beaten', count: run.felled.length, xp: run.felled.length * PAY.boss });
  if (hasWon(run)) lines.push({ why: `Wave ${LAST_WAVE} cleared`, count: 1, xp: PAY.win });
  const base = lines.reduce((n, l) => n + l.xp, 0);
  const more = Math.round(base * PAY.vow * run.vows.length);
  if (more > 0) lines.push({ why: 'Vow bonus', count: run.vows.length, xp: more });
  for (const id of run.deeds) {
    const deed = DEEDS.find((d) => d.id === id);
    if (deed) lines.push({ why: deed.name, count: 1, xp: deed.xp });
  }
  return { hero: run.hero, lines, vows: run.vows.length, total: lines.reduce((n, l) => n + l.xp, 0) };
}

// ---------------------------------------------------------------- mastery

/** A hero's mastery, and the level it comes to. */
export function masteryXp(save: SaveData, hero: string): number {
  return save.mastery[hero] ?? 0;
}

export function masteryLevel(save: SaveData, hero: string): number {
  return levelAt(masteryXp(save, hero));
}

/** What a gift of a hero's track does, in a line a player reads. */
export function giftSays(hero: string, gift: Gift): string {
  switch (gift.kind) {
    case 'stat':
      return `${statText(gift.stat, gift.by)} ${STAT_INFO[gift.stat].name}`;
    case 'skill':
      return gift.part === 'harm'
        ? `Skill deals ${Math.round(gift.by * 100)}% more damage`
        : gift.part === 'fill'
          ? `Fury fills ${Math.round(gift.by * 100)}% faster`
          : gift.part === 'area'
            ? `Skill is ${Math.round(gift.by * 100)}% bigger`
            : `After your skill, Fury starts ${Math.round(gift.by * 100)}% full`;
    case 'perk': {
      const p = PERKS.find((x) => x.id === gift.perk);
      return p ? `New passive, ${p.name}: ${p.says}` : 'A new passive';
    }
    case 'way': {
      const weapon = weaponOf(byId(HEROES, hero).weapon);
      const alt = ownRules(weapon.id, TIERS - 1, true).find((r) => r.alt);
      return gift.alt ? `${weapon.name}, second way${alt ? `: ${alt.says}` : ''}` : `${weapon.name}, first way: keep its rules as they are`;
    }
    case 'relic':
      return `Start every run with the relic ${byId(RELICS, gift.relic).name}`;
    case 'title':
      return `New title: ${gift.title}`;
  }
}

/** A gift in two or three words, for under its medallion on the track: what it gives at a glance. */
export function giftShort(gift: Gift): string {
  switch (gift.kind) {
    case 'stat': {
      const short: Partial<Record<Stat, string>> = { maxHp: 'HP', regen: 'REGEN', lifesteal: 'LEECH', damage: 'DMG', might: 'MELEE', aim: 'RANGED', lore: 'MAGIC', haste: 'ATK SPD', crit: 'CRIT', reach: 'RANGE', armor: 'ARMOR', dodge: 'DODGE', speed: 'SPEED', luck: 'LUCK', bounty: 'COINS', pickup: 'PICKUP' };
      return `${statText(gift.stat, gift.by)} ${short[gift.stat] ?? STAT_INFO[gift.stat].name.toUpperCase()}`;
    }
    case 'skill':
      return gift.part === 'harm' ? 'SKILL DMG' : gift.part === 'fill' ? 'FURY' : gift.part === 'area' ? 'BIG SKILL' : 'FURY KEPT';
    case 'perk':
      return 'PASSIVE';
    case 'way':
      return 'WEAPON';
    case 'relic':
      return 'RELIC';
    case 'title':
      return 'TITLE';
  }
}

export interface TrackRow {
  /** The level, counted from 1. */
  level: number;
  /** Mastery needed in all to reach it. */
  xp: number;
  reached: boolean;
  /** Its gifts, each with what it says; two where the player picks one. */
  gifts: Array<{ gift: Gift; says: string; picked: boolean }>;
}

/** A hero's whole track as a screen shows it: every level, what it gives, whether it is reached, and what was picked. */
export function trackRows(save: SaveData, hero: string): TrackRow[] {
  const reached = masteryLevel(save, hero);
  const picks = save.picks[hero] ?? {};
  return trackOf(hero).map((lv: Level, i): TrackRow => ({
    level: i + 1,
    xp: lv.xp,
    reached: i < reached,
    gifts: lv.gifts.map((gift, j) => ({ gift, says: giftSays(hero, gift), picked: lv.gifts.length === 1 || (picks[i] ?? 0) === j })),
  }));
}

/** Mastery to the next level, and what that level needs in all; null when the track is full. */
export function nextLevel(save: SaveData, hero: string): { xp: number; need: number; left: number } | null {
  const xp = masteryXp(save, hero);
  const need = LEVEL_XP.find((n) => n > xp);
  return need === undefined ? null : { xp, need, left: need - xp };
}

/** Picks one of a pair at a level of a hero's track. It may be picked again at any time; it counts once the level is reached. */
export function pickGift(save: SaveData, hero: string, level: number, i: number): boolean {
  const lv = trackOf(hero)[level];
  if (!lv || lv.gifts.length < 2 || i < 0 || i >= lv.gifts.length) return false;
  save.picks[hero] = { ...(save.picks[hero] ?? {}), [level]: i };
  return true;
}

/** What a hero is called besides their name: the title their track gave, once it has, or the one they began with. */
export function epithetOf(save: SaveData, hero: string): string {
  return mastered(hero, masteryXp(save, hero), save.picks[hero]).title || byId(HEROES, hero).epithet;
}

/** What a run of this hero begins with from their mastery, as the run keeps it. */
export function masteryBoons(save: SaveData, hero: string): { boons: Boons; relic: string; alt: boolean } {
  const m = mastered(hero, masteryXp(save, hero), save.picks[hero]);
  const boons = noBoons();
  boons.stats = { ...m.stats };
  boons.fury = Math.round(m.fill * 100);
  boons.harm = m.harm;
  boons.area = m.area;
  boons.again = m.again;
  boons.perks = [...m.perks];
  return { boons, relic: m.relic, alt: m.alt };
}

// ---------------------------------------------------------------- companions and their slots

/** How many companion slots are unlocked: by the best wave ever cleared, with any hero. */
export function slotsOf(save: SaveData): number {
  const best = bestWave(save);
  return Math.min(BAND.places, SLOT_WAVES.filter((w) => best >= w).length);
}

/** The wave that unlocks the next slot, or 0 when all are unlocked. */
export function nextSlot(save: SaveData): number {
  return SLOT_WAVES.find((w) => bestWave(save) < w) ?? 0;
}

/** How a companion is unlocked, as a line a player reads. A hidden one is a riddle; the deed is not told. */
export function routeSays(c: CompanionDef): string {
  const u = c.unlock;
  switch (u.kind) {
    case 'start':
      return 'Unlocked from the start.';
    case 'wave':
      return `Unlock: clear wave ${u.wave}.`;
    case 'deed':
      // A boss's wave is taken from its land, so a longer road never leaves the line wrong.
      if (u.test.kind === 'boss') return `Unlock: ${featSays(u.test)[0].toLowerCase()}${featSays(u.test).slice(1)}`;
      return `Unlock: ${u.says[0].toLowerCase()}${u.says.slice(1)}`;
    case 'hidden':
      return `Hidden. "${u.riddle}"`;
    case 'found':
      return `Found in a cage on the field, from wave ${u.from}. Break the cage to unlock it.`;
  }
}

export interface FriendRow {
  def: CompanionDef;
  unlocked: boolean;
  /** Its name, or "???" while it is locked. */
  name: string;
  /** How it is unlocked, said as `routeSays` says it. */
  how: string;
  /** How far along, 0 to 1, where that can be said from the save. */
  share: number;
}

/** Every companion, unlocked or not, for the screen that lists them. */
export function friendRows(save: SaveData): FriendRow[] {
  return COMPANIONS.map((def) => {
    const unlocked = isFriend(save, def.id);
    const u = def.unlock;
    const share = unlocked ? 1 : u.kind === 'wave' ? Math.min(1, bestWave(save) / u.wave) : u.kind === 'deed' ? deedShare(save, u.test) : 0;
    return { def, unlocked, name: unlocked ? def.name : '???', how: routeSays(def), share };
  });
}

/** The found companions still locked: a run may meet one of them in a cage. */
export function seekOf(save: SaveData): string[] {
  return COMPANIONS.filter((c) => c.unlock.kind === 'found' && !isFriend(save, c.id)).map((c) => c.id);
}

/** True if a companion's way of being unlocked is done, by the save and the run as they stand. */
function friendDue(save: SaveData, run: RunData | null, told: Told | null, c: CompanionDef): boolean {
  const u = c.unlock;
  switch (u.kind) {
    case 'start':
      return true;
    case 'wave':
      return bestWave(save) >= u.wave;
    case 'deed':
    case 'hidden':
      return run ? deedMet(save, run, told, u.test) : isFeat(u.test) && featDone(save, u.test);
    case 'found':
      return !!run && run.found.includes(c.id);
  }
}

const isFeat = (t: DeedTest): t is Feat => t.kind === 'wave' || t.kind === 'boss' || t.kind === 'coins' || t.kind === 'kills' || t.kind === 'runs';

/**
 * Unlocks every companion whose way is done, and puts each into a slot of
 * the band that is free. Returns who was unlocked.
 */
export function unlockFriends(save: SaveData, run: RunData | null = null, told: Told | null = null): string[] {
  const out: string[] = [];
  for (const c of COMPANIONS) {
    if (isFriend(save, c.id) || !friendDue(save, run, told, c)) continue;
    save.friends.push(c.id);
    out.push(c.id);
  }
  fillBand(save, out);
  return out;
}

/**
 * Whoever is named takes a slot that is free, and nobody else does: a slot
 * the player emptied on purpose stays empty (to go alone, for a quest).
 * The band is also cut to the slots there are.
 */
export function fillBand(save: SaveData, who: readonly string[]): void {
  const slots = slotsOf(save);
  save.band = save.band.filter((id) => isFriend(save, id)).slice(0, slots);
  for (const id of who) {
    if (save.band.length >= slots) break;
    if (isFriend(save, id) && !save.band.includes(id)) save.band.push(id);
  }
}

/** The companions unlocked and waiting, not in the band: whoever a new slot takes first. */
export function waitingOf(save: SaveData): string[] {
  return save.friends.filter((id) => !save.band.includes(id));
}

// ---------------------------------------------------------------- the chronicle

export type MetKind = 'hero' | 'friend' | 'foe' | 'weapon' | 'item' | 'relic' | 'omen';

const key = (kind: MetKind, id: string): string => `${kind}:${id}`;

/** True if the player has met it: only then is it named anywhere. */
export function met(save: SaveData, kind: MetKind, id: string): boolean {
  return save.seen[key(kind, id)] !== undefined;
}

/** The count kept with a thing met (see `seen` in the save). */
export function count(save: SaveData, kind: MetKind, id: string): number {
  return save.seen[key(kind, id)] ?? 0;
}

function meet(save: SaveData, kind: MetKind, id: string, more = 0): void {
  const k = key(kind, id);
  save.seen[k] = (save.seen[k] ?? 0) + more;
}

export interface ChronicleEntry {
  kind: MetKind;
  id: string;
  /** Its name, or "???" for what has not been met. */
  name: string;
  /** What there is to tell of it, or '' for what has not been met. */
  says: string;
  met: boolean;
  count: number;
  /** What the count is of, for the line under it: "slain", "runs", "runs held", "times taken". */
  counted: string;
}

export interface ChroniclePage {
  kind: MetKind;
  title: string;
  /** How many of the page have been met. */
  met: number;
  entries: ChronicleEntry[];
}

/** The whole Chronicle: every hero, companion, enemy, weapon, ware, relic and road, met or not. */
export function chronicleOf(save: SaveData): ChroniclePage[] {
  const page = (kind: MetKind, title: string, counted: string, list: ReadonlyArray<{ id: string; name: string; says: string }>): ChroniclePage => {
    const entries = list.map((e): ChronicleEntry => {
      const known = met(save, kind, e.id);
      return { kind, id: e.id, name: known ? e.name : '???', says: known ? e.says : '', met: known, count: count(save, kind, e.id), counted };
    });
    return { kind, title, met: entries.filter((e) => e.met).length, entries };
  };
  return [
    page('hero', 'Heroes', 'runs', HEROES.map((h) => ({ id: h.id, name: h.name, says: `${h.epithet[0].toUpperCase()}${h.epithet.slice(1)}. ${h.who}` }))),
    page('friend', 'Companions', 'runs', COMPANIONS.map((c) => ({ id: c.id, name: c.name, says: `${c.kind[0].toUpperCase()}${c.kind.slice(1)}. ${c.says}` }))),
    page('foe', 'Enemies', 'killed', ENEMIES.filter((e) => !e.prop).map((e) => ({ id: e.id, name: e.name, says: e.ai === 'boss' ? 'A boss.' : FOE_SAYS[e.ai] ?? '' }))),
    page('weapon', 'Weapons', 'runs held', [...HEROES.map((h) => weaponOf(h.weapon)), ...WEAPONS].map((w) => ({ id: w.id, name: w.name, says: `${w.kinds.map((k) => byId(KINDS, k).name).join(' and ')}. ${w.says}` }))),
    page('item', 'Items', 'runs held', ITEMS.map((it) => ({ id: it.id, name: it.name, says: STATS.filter((st) => it.stats[st]).map((st) => `${statText(st, it.stats[st] ?? 0)} ${STAT_INFO[st].name}`).join(', ') }))),
    page('relic', 'Relics', 'runs held', RELICS.map((r) => ({ id: r.id, name: r.name, says: r.says }))),
    page('omen', 'Roads', 'times taken', OMENS.map((o) => ({ id: o.id, name: o.name, says: `Risk: ${o.says} Reward: ${o.prize}.` }))),
  ];
}

/** How each way of fighting is told in the Chronicle. */
const FOE_SAYS: Record<string, string> = {
  walk: 'Walks at you.',
  shoot: 'Keeps its distance and shoots.',
  charge: 'Charges at you in a line.',
  bomb: 'Runs in and explodes.',
  summon: 'Summons other enemies.',
  boost: 'Makes nearby enemies faster.',
  still: 'Does not move.',
};

// ---------------------------------------------------------------- deeds

/** True if a deed's test is met by the save and the run as they stand. `told` is what the last waves told. */
function deedMet(save: SaveData, run: RunData, told: Told | null, test: DeedTest): boolean {
  switch (test.kind) {
    case 'wave':
    case 'boss':
    case 'coins':
    case 'kills':
    case 'runs':
      return featDone(save, test);
    case 'win':
      return hasWon(run) && run.vows.length >= (test.vows ?? 0);
    case 'wins':
      return Object.keys(save.won).length >= test.heroes;
    case 'alone':
      // A stray let out of a cage on the way is not a band that was brought.
      return hasWon(run) && run.band.every((b) => b.stray);
    case 'kinds': {
      const counts = kindCounts(run) as Record<string, number>;
      return (test.of ? (counts[test.of] ?? 0) : Math.max(0, ...Object.values(counts))) >= test.held;
    }
    case 'relics':
      return run.relics.length >= test.held;
    case 'unstruck':
      return !!told && told.unstruck.length > 0;
    case 'clean':
      return run.clean >= test.waves;
    case 'slain':
      return run.kills >= test.kills;
    case 'risen':
      return run.rose >= 0 && survived(run) >= test.wave;
    case 'level':
      return run.level >= test.level;
    case 'bond':
      return run.band.some((b) => b.bond >= BAND.bonds);
    case 'purse':
      return run.gold >= test.gold;
    case 'tier':
      return run.weapons.some((w) => w.tier >= TIERS - 1);
    case 'roads':
      return OMENS.filter((o) => count(save, 'omen', o.id) > 0).length >= (test.count ?? OMENS.length);
    case 'count':
      return (run.counts?.[test.of] ?? 0) >= test.n;
    case 'brink':
      return run.phase !== 'over' && run.wave > 1 && run.left > 0 && run.left < BRINK;
  }
}

/** The share of their health under which a wave cleared is cleared on the brink: a hidden quest asks for it. */
const BRINK = 0.15;

/** How far along a deed is, 0 to 1, where that can be said from the save alone. */
function deedShare(save: SaveData, test: DeedTest): number {
  switch (test.kind) {
    case 'wave':
    case 'boss':
    case 'coins':
    case 'kills':
    case 'runs':
      return featShare(save, test);
    case 'wins':
      return Math.min(1, Object.keys(save.won).length / test.heroes);
    case 'roads':
      return Math.min(1, OMENS.filter((o) => count(save, 'omen', o.id) > 0).length / (test.count ?? OMENS.length));
    default:
      return 0;
  }
}

/** What unlocks a hero, as a line a player reads. A boss is not named: it may not have been met. */
export function featSays(feat: Feat): string {
  switch (feat.kind) {
    case 'wave':
      return `Clear wave ${feat.wave}.`;
    case 'boss':
      return `Beat the boss of wave ${bossWave(feat.boss)}.`;
    case 'coins':
      return `Collect ${feat.coins} coins in one run.`;
    case 'kills':
      return `Kill ${feat.kills} enemies in total.`;
    case 'runs':
      return feat.runs === 1 ? 'Finish a run.' : `Finish ${feat.runs} runs.`;
  }
}

export interface DeedRow {
  id: string;
  /** What kind of quest it is: one that unlocks a hero or a companion, one that pays mastery, or a crate's own. */
  kind: 'opens' | 'quest' | 'crate';
  name: string;
  says: string;
  done: boolean;
  /** How far along, 0 to 1. */
  share: number;
  /** The mastery it pays the hero who does it, or 0. */
  xp: number;
  /** What it unlocks, as words, or ''. */
  opens: string;
}

/**
 * Every quest there is, done or not: the ones that unlock a hero or a
 * companion (whoever it unlocks is "???" until it does; a hidden one says
 * its riddle and nothing else), the crates' own, and the ones that pay
 * mastery. Those still to do come before those done.
 */
export function deedsOf(save: SaveData): DeedRow[] {
  const rows: DeedRow[] = [];
  for (const h of HEROES) {
    if (!h.unlock) continue;
    const done = isOpen(save, h.id);
    rows.push({ id: `hero-${h.id}`, kind: 'opens', name: done ? h.name : '???', says: featSays(h.unlock), done, share: done ? 1 : featShare(save, h.unlock), xp: 0, opens: done ? h.name : 'a hero' });
  }
  for (const f of friendRows(save)) {
    if (f.def.unlock.kind === 'start') continue;
    rows.push({ id: `friend-${f.def.id}`, kind: 'opens', name: f.name, says: f.how, done: f.unlocked, share: f.share, xp: 0, opens: f.unlocked ? f.def.name : 'a companion' });
  }
  for (const c of CRATES) {
    const done = save.crates.includes(c.id);
    rows.push({ id: `crate-${c.id}`, kind: 'crate', name: c.name, says: c.deedSays, done, share: done ? 1 : deedShare(save, c.deed), xp: 0, opens: 'the crate' });
  }
  for (const d of DEEDS) {
    const done = save.deeds.includes(d.id);
    rows.push({ id: d.id, kind: 'quest', name: d.name, says: d.test.kind === 'boss' ? featSays(d.test) : d.says, done, share: done ? 1 : deedShare(save, d.test), xp: d.xp, opens: '' });
  }
  return [...rows.filter((r) => !r.done), ...rows.filter((r) => r.done)];
}

/** The nearest quests not yet done, for the end of a run: "what next". The ones furthest along come first. */
export function nextDeeds(save: SaveData, n = 3): DeedRow[] {
  const open = deedsOf(save).filter((r) => !r.done && !(r.kind === 'opens' && r.says.startsWith('Hidden')));
  const far = open.filter((r) => r.share > 0).sort((a, b) => b.share - a.share);
  const rest = open.filter((r) => r.share === 0 && r.kind === 'quest');
  return [...far, ...rest].slice(0, Math.max(0, n));
}

// ---------------------------------------------------------------- vows

/** How many vows a win has ever been sworn under at most, or -1 if nothing has been won. */
function mostVows(save: SaveData): number {
  return Math.max(-1, ...Object.values(save.won).map((v) => v.length));
}

/** The vows that may be sworn: none until a run is won, then the first few, and more for each vow a win was sworn under. */
export function vowsOpen(save: SaveData): VowId[] {
  const most = mostVows(save);
  return most < 0 ? [] : VOWS.slice(0, VOW.first + VOW.more * most).map((v) => v.id);
}

/** What opens the next vows, as a line, or '' when all are open. */
export function vowsNext(save: SaveData): string {
  const most = mostVows(save);
  if (most < 0) return `Clear wave ${LAST_WAVE}.`;
  if (VOW.first + VOW.more * most >= VOWS.length) return '';
  return most === 0 ? 'Win a run with 1 vow.' : `Win a run with ${most + 1} vows.`;
}

/** Swears a vow for the next run, or takes it back. */
export function toggleVow(save: SaveData, id: string): boolean {
  if (!vowsOpen(save).includes(id as VowId)) return false;
  save.vows = save.vows.includes(id) ? save.vows.filter((v) => v !== id) : VOWS.filter((v) => v.id === id || save.vows.includes(v.id)).map((v) => v.id);
  return true;
}

/** The vows a hero's best win was sworn under: their badge. None for a plain win; null for a hero who has not won. */
export function badge(save: SaveData, hero: string): string[] | null {
  return save.won[hero] ?? null;
}

// ---------------------------------------------------------------- the day's road

export interface Daily {
  date: string;
  hero: string;
  band: string[];
  seed: number;
}

/**
 * The day's road: one hero, one companion and one seed for a day, the same
 * for everyone, worked out from the date by the rules' own dice. Every
 * hero may come up, opened or not: it is a way to meet them.
 */
export function dailyOf(date: string): Daily {
  // The date as a number to seed the dice with: any day gives another.
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) h = Math.imul(h ^ date.charCodeAt(i), 16777619) >>> 0;
  const rng = new Rng(h || 1);
  const hero = rng.pick(HEROES).id;
  const band = [rng.pick(COMPANIONS).id];
  return { date, hero, band, seed: rng.int(0x7ffffffe) + 1 };
}

/** True if the day's road has been taken already: it is one try a day. */
export function dailyTaken(save: SaveData, date: string): boolean {
  return save.daily?.date === date;
}

/**
 * Sets out on the day's road. It is the same run for everyone: the whole
 * armory, two roads, one companion, no mastery and no vow.
 */
export function beginDaily(save: SaveData, date: string): RunData | null {
  if (dailyTaken(save, date)) return null;
  const d = dailyOf(date);
  save.daily = { date, wave: 0, seconds: 0 };
  return newRun(d.hero, d.seed, d.band, ROAD.roads, { daily: date, slots: 1 });
}

// ---------------------------------------------------------------- what a run tells the Hold

export interface Chronicled {
  deeds: string[];
  /** Companions unlocked, and crates their quests have unlocked. */
  friends: string[];
  crates: string[];
  /** What the run paid its hero, at its end; and the levels of mastery that came with it. */
  tally: Tally | null;
  levels: number;
}

/**
 * Takes what a run has to tell, after every wave and at its end: who was
 * met and slain goes into the Codex, quests done are marked, a companion
 * or a crate whose way is done is unlocked, a win is counted, the day's
 * run is written down, and when the run is over its hero is paid, once.
 */
export function chronicle(save: SaveData, run: RunData): Chronicled {
  const told = run.told;
  if (told) {
    for (const id of told.met) meet(save, 'foe', id);
    for (const [id, n] of Object.entries(told.slain)) meet(save, 'foe', id, n);
    for (const id of told.roads) meet(save, 'omen', id, 1);
  }
  // Whoever is on the run and whatever it holds or has been shown is met.
  meet(save, 'hero', run.hero);
  meet(save, 'weapon', byId(HEROES, run.hero).weapon);
  for (const b of run.band) meet(save, 'friend', b.id);
  for (const w of run.weapons) meet(save, 'weapon', w.id);
  for (const id of run.items) meet(save, 'item', id);
  for (const id of [...run.relics, ...run.relicChoices]) meet(save, 'relic', id);
  for (const o of run.offers) meet(save, o.kind, o.id);
  for (const r of [run.road, ...run.roads]) meet(save, 'omen', r.omen);
  // A win is counted when the last written wave is come through, though the run may go on. The badge is the win under the most vows.
  if (hasWon(run) && !run.won) {
    run.won = true;
    const best = save.won[run.hero];
    if (!best || run.vows.length > best.length) save.won[run.hero] = [...run.vows];
  }
  const out: Chronicled = { deeds: [], friends: [], crates: [], tally: null, levels: 0 };
  for (const d of DEEDS) {
    if (save.deeds.includes(d.id) || !deedMet(save, run, told, d.test)) continue;
    save.deeds.push(d.id);
    run.deeds.push(d.id);
    out.deeds.push(d.id);
  }
  out.friends = unlockFriends(save, run, told);
  for (const c of CRATES) {
    if (save.crates.includes(c.id) || !deedMet(save, run, told, c.deed)) continue;
    save.crates.push(c.id);
    out.crates.push(c.id);
  }
  // The day's road is written down as it goes, so that a day's try that is shut half way still counts for what it came to.
  if (run.daily && save.daily?.date === run.daily) {
    save.daily.wave = Math.max(save.daily.wave, survived(run));
    save.daily.seconds = Math.round(run.time);
    save.dailyBest = Math.max(save.dailyBest, save.daily.wave);
  }
  run.told = null;
  if (run.phase !== 'over' || run.paid) return out;
  // The run has ended: what it held is counted, and it is paid.
  run.paid = true;
  meet(save, 'hero', run.hero, 1);
  for (const b of run.band) meet(save, 'friend', b.id, 1);
  for (const id of new Set([byId(HEROES, run.hero).weapon, ...run.weapons.map((w) => w.id)])) meet(save, 'weapon', id, 1);
  for (const id of new Set(run.items)) meet(save, 'item', id, 1);
  for (const id of new Set(run.relics)) meet(save, 'relic', id, 1);
  // The day's run is the same for everyone: it pays no hero.
  const tally = tallyOf(run);
  if (!run.daily) {
    const was = masteryLevel(save, run.hero);
    save.mastery[run.hero] = masteryXp(save, run.hero) + tally.total;
    out.levels = masteryLevel(save, run.hero) - was;
  }
  save.tally = tally;
  out.tally = tally;
  return out;
}

// ---------------------------------------------------------------- the armory

/** Everything a crate holds, for the list of what is shut. */
const CRATED: ReadonlySet<string> = new Set(CRATES.flatMap((c) => c.things.map(thingKey)));

/** True if the armory offers a thing: it was there from the start, or its crate is open. */
export function inArmory(save: SaveData, t: Thing): boolean {
  if (!CRATED.has(thingKey(t))) return true;
  return CRATES.some((c) => save.crates.includes(c.id) && c.things.some((x) => x.kind === t.kind && x.id === t.id));
}

/** What a run that begins now is never offered: the things in the crates not open. */
export function shutOf(save: SaveData): string[] {
  return CRATES.filter((c) => !save.crates.includes(c.id)).flatMap((c) => c.things.map(thingKey));
}

/** The weapons a run that begins now may be offered, by name. */
export function poolOf(save: SaveData): string[] {
  return WEAPONS.filter((w) => inArmory(save, { kind: 'weapon', id: w.id })).map((w) => w.id);
}

export interface CrateThing extends Thing {
  /** Its name, or "???" for a thing the player has never seen. */
  name: string;
  met: boolean;
}

/** A crate's contents as they may be shown before it is opened: what has been met by name, the rest dark. */
export function crateThings(save: SaveData, crate: CrateDef): CrateThing[] {
  return crate.things.map((t) => {
    const known = met(save, t.kind, t.id);
    const name = t.kind === 'weapon' ? weaponOf(t.id).name : t.kind === 'item' ? byId(ITEMS, t.id).name : byId(RELICS, t.id).name;
    return { ...t, name: known ? name : '???', met: known };
  });
}

// ---------------------------------------------------------------- a run begins

/** What the Hold gives a run that a hero begins now. */
export function termsOf(save: SaveData, hero = ''): Terms {
  const open = vowsOpen(save);
  const m = hero ? masteryBoons(save, hero) : { boons: noBoons(), relic: '', alt: false };
  return {
    vows: save.vows.filter((v) => open.includes(v as VowId)), shut: shutOf(save), pool: poolOf(save), boons: m.boons, relic: m.relic, alt: m.alt,
    slots: slotsOf(save), friends: [...save.friends], seek: seekOf(save),
  };
}

/** How many roads a run that begins now is offered at once. */
export function forksNow(_save: SaveData): number {
  return ROAD.roads;
}

/** A new run as the Hold sends it out: the band chosen, the vows sworn, the armory as it is, and what the hero's mastery has unlocked. */
export function beginRun(save: SaveData, hero: string, seed: number): RunData {
  return newRun(hero, seed, bandFor(save, hero), forksNow(save), { ...termsOf(save, hero), first: save.ended === 0 });
}
