// The rules: what everything is worth, given a save. Pure arithmetic with
// no clock and no dice, so that it can be tested, and so that the pacing
// tool (scripts/pace.ts) plays by exactly the rules the game does.

import {
  ABILITIES, BASE_HP, BONUS_AT, BONUS_DOUBLED_AT, BOSS, BOSS_SECONDS, CAMP, CAPTAIN, CRIT_CHANCE, CRIT_POWER, FEATS, FEAT_SHARE, GOLD_SHARE,
  HEROES, HERO_COST, HERO_COST_STEP, HERO_DPS, HERO_DPS_STEP, HONORS, HP_GROWTH, LANDS, LAND_STAGES, LAUREL_DAMAGE, LEVEL_GROWTH, MILESTONES,
  MILESTONE_EVERY, OFFLINE_HOURS, OFFLINE_HOURS_STEP, OFFLINE_LEAST, OFFLINE_SHARE, PACK_EVERY, PACK_KILLS, REBIRTH_STAGE, SPAWN_SECONDS,
  STAGE_ENEMIES, TAP_BASE, TAP_SHARE, type CampEffect, type FeatDef, type HonorEffect, type LandDef, type LegionBonus,
} from './data';
import { newRun, type SaveData } from './state';

// ------------------------------------------------------------ the road

export type StageKind = 'troop' | 'captain' | 'boss';

export function kindOf(stage: number): StageKind {
  const n = stage % LAND_STAGES;
  return n === 0 ? 'boss' : n === LAND_STAGES / 2 ? 'captain' : 'troop';
}

export function landOf(stage: number): LandDef {
  return LANDS[Math.floor((stage - 1) / LAND_STAGES) % LANDS.length];
}

/** How many times the road has been through every land before this stage: 0 the first time. */
export function lapOf(stage: number): number {
  return Math.floor((stage - 1) / (LAND_STAGES * LANDS.length));
}

const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

/** A land's name as the road comes to it: "Thornwood", then "Thornwood II" the second time through. */
export function landName(stage: number): string {
  const lap = lapOf(stage);
  return landOf(stage).name + (lap < ROMAN.length ? ROMAN[lap] : ` ${lap + 1}`);
}

/** How many enemies have to fall for a stage to be cleared. */
export function enemiesIn(stage: number): number {
  return kindOf(stage) === 'troop' ? STAGE_ENEMIES : 1;
}

/** Who the enemy is: a stage's `n`th, from 0. The same every time. */
export function enemyAt(stage: number, n: number): string {
  const land = landOf(stage);
  const kind = kindOf(stage);
  if (kind === 'boss') return land.boss;
  if (kind === 'captain') return land.captain;
  // The last of a land's troops is its heaviest, and is kept for the later stages of it.
  const far = ((stage - 1) % LAND_STAGES) + 1;
  const pool = far <= 2 ? 2 : far <= 4 ? 3 : far <= 7 ? 4 : land.troops.length;
  return land.troops[(stage * 7 + n * 3 + ((n * n) % 5)) % pool];
}

/** A plain enemy's health at a stage. */
export function troopHp(stage: number): number {
  return Math.ceil(BASE_HP * Math.pow(HP_GROWTH, stage - 1));
}

export function enemyHp(stage: number): number {
  const kind = kindOf(stage);
  return troopHp(stage) * (kind === 'boss' ? BOSS.hp : kind === 'captain' ? CAPTAIN.hp : 1);
}

/** What an enemy of a stage pays, before anything the player has adds to it. */
export function baseGold(stage: number): number {
  const kind = kindOf(stage);
  return Math.max(1, Math.ceil(troopHp(stage) * GOLD_SHARE)) * (kind === 'boss' ? BOSS.gold : kind === 'captain' ? CAPTAIN.gold : 1);
}

// ------------------------------------------------------------ what the player has

function campLevel(save: SaveData, effect: CampEffect): number {
  let n = 0;
  for (let i = 0; i < CAMP.length; i++) if (CAMP[i].effect === effect) n += CAMP[i].per * save.run.camp[i];
  return n;
}

function honor(save: SaveData, effect: HonorEffect): number {
  let n = 0;
  for (let i = 0; i < HONORS.length; i++) if (HONORS[i].effect === effect) n += HONORS[i].per * save.honors[i];
  return n;
}

/** What the heroes of level 25 and over give the whole legion, of one kind. */
function legionBonus(save: SaveData, kind: LegionBonus): number {
  let n = 0;
  for (let i = 0; i < HEROES.length; i++) {
    const level = save.run.heroes[i];
    if (level < BONUS_AT || HEROES[i].bonus[0] !== kind) continue;
    n += HEROES[i].bonus[1] * (level >= BONUS_DOUBLED_AT ? 2 : 1);
  }
  return n;
}

/** What the feats done are worth, as a multiplier of damage and of gold. */
export function renown(save: SaveData): number {
  return 1 + FEAT_SHARE * save.feats.length;
}

// ------------------------------------------------------------ heroes

/** How many times a hero's own damage has doubled by a level. */
export function milestones(level: number): number {
  let n = 0;
  for (const m of MILESTONES) if (level >= m) n++;
  const last = MILESTONES[MILESTONES.length - 1];
  if (level > last) n += Math.floor((level - last) / MILESTONE_EVERY);
  return n;
}

/** The next level at which a hero's damage doubles. */
export function nextMilestone(level: number): number {
  for (const m of MILESTONES) if (level < m) return m;
  const last = MILESTONES[MILESTONES.length - 1];
  return last + (Math.floor((level - last) / MILESTONE_EVERY) + 1) * MILESTONE_EVERY;
}

/** A hero's damage a second at a level, before anything the legion shares. */
export function heroBase(hero: number, level: number): number {
  if (level <= 0) return 0;
  return HERO_DPS * Math.pow(HERO_DPS_STEP, hero) * level * Math.pow(2, milestones(level));
}

/** What multiplies every hero's damage: the banner, the heroes' own gifts, laurels, honors, renown. Not an ability's. */
export function damageMult(save: SaveData): number {
  return (1 + campLevel(save, 'damage')) * (1 + legionBonus(save, 'damage')) * (1 + LAUREL_DAMAGE * save.laurelsEver) * (1 + honor(save, 'damage')) * renown(save);
}

export function heroDps(save: SaveData, hero: number): number {
  return heroBase(hero, save.run.heroes[hero]) * damageMult(save);
}

/** The whole legion's damage a second, with no ability on. */
export function legionDps(save: SaveData): number {
  let base = 0;
  for (let i = 0; i < HEROES.length; i++) base += heroBase(i, save.run.heroes[i]);
  return base * damageMult(save);
}

/** What the next `count` levels of a hero cost, from the level it is at. */
export function heroCost(save: SaveData, hero: number, count = 1): number {
  const level = save.run.heroes[hero];
  const first = HERO_COST * Math.pow(HERO_COST_STEP, hero) * Math.pow(LEVEL_GROWTH, level) * (1 - campLevel(save, 'discount'));
  return Math.ceil((first * (Math.pow(LEVEL_GROWTH, count) - 1)) / (LEVEL_GROWTH - 1));
}

/** How many levels of a hero the purse buys. */
export function heroAffordable(save: SaveData, hero: number): number {
  const one = heroCost(save, hero, 1);
  if (save.run.gold < one) return 0;
  let n = Math.floor(Math.log(1 + (save.run.gold * (LEVEL_GROWTH - 1)) / one) / Math.log(LEVEL_GROWTH));
  // The sum is rounded up, so the last level may be a coin short.
  while (n > 0 && heroCost(save, hero, n) > save.run.gold) n--;
  return n;
}

/** How many levels a press buys: the setting's number, or with 0 all the purse allows, and never none. */
export function buyCount(save: SaveData, hero: number): number {
  const want = save.settings.buy;
  if (want > 0) return want;
  return Math.max(1, heroAffordable(save, hero));
}

/** True if a hero can be hired or leveled at all: the one before it has to be in the legion. */
export function heroOpen(save: SaveData, hero: number): boolean {
  return hero === 0 || save.run.heroes[hero - 1] > 0;
}

/** Buys levels of a hero. Returns how many were bought. */
export function buyHero(save: SaveData, hero: number, count = buyCount(save, hero)): number {
  if (!heroOpen(save, hero) || count <= 0) return 0;
  const cost = heroCost(save, hero, count);
  if (cost > save.run.gold) return 0;
  save.run.gold -= cost;
  save.run.heroes[hero] += count;
  return count;
}

export function heroesHired(save: SaveData): number {
  let n = 0;
  for (const level of save.run.heroes) if (level > 0) n++;
  return n;
}

// ------------------------------------------------------------ the camp

export function campCost(save: SaveData, i: number): number {
  return Math.ceil(CAMP[i].cost * Math.pow(CAMP[i].growth, save.run.camp[i]));
}

export function buyCamp(save: SaveData, i: number): boolean {
  if (save.run.camp[i] >= CAMP[i].max) return false;
  const cost = campCost(save, i);
  if (cost > save.run.gold) return false;
  save.run.gold -= cost;
  save.run.camp[i]++;
  return true;
}

// ------------------------------------------------------------ gold, taps, time

/** True while an ability is on, at a moment by the clock on the wall. */
export function abilityOn(save: SaveData, i: number, now: number): boolean {
  return save.abilities[i].until > now;
}

export function abilityOpen(save: SaveData, i: number): boolean {
  return save.best >= ABILITIES[i].stage;
}

const RALLY = ABILITIES.findIndex((a) => a.id === 'rally');
const VOLLEY = ABILITIES.findIndex((a) => a.id === 'volley');
const PLUNDER = ABILITIES.findIndex((a) => a.id === 'plunder');
export const ABILITY = { RALLY, VOLLEY, PLUNDER } as const;

/** What an ability that is on multiplies damage by, at a moment. */
export function rallyMult(save: SaveData, now: number): number {
  return abilityOn(save, RALLY, now) ? ABILITIES[RALLY].power : 1;
}

/** What multiplies gold, with no ability on. */
export function goldMult(save: SaveData): number {
  return (1 + campLevel(save, 'gold')) * (1 + legionBonus(save, 'gold')) * (1 + honor(save, 'gold')) * renown(save);
}

/** What an enemy of a stage pays the player, at a moment. */
export function goldFor(save: SaveData, stage: number, now: number): number {
  return Math.ceil(baseGold(stage) * goldMult(save) * (abilityOn(save, PLUNDER, now) ? ABILITIES[PLUNDER].power : 1));
}

/** What multiplies a tap. */
export function tapMult(save: SaveData): number {
  return (1 + campLevel(save, 'tap')) * (1 + legionBonus(save, 'tap')) * (1 + honor(save, 'tap'));
}

/** What one tap strikes for, before a telling blow. A share of the legion's damage is in it, so that a tap is never nothing. */
export function tapDamage(save: SaveData, now = 0): number {
  return Math.max(1, Math.round((TAP_BASE + TAP_SHARE * legionDps(save) * rallyMult(save, now)) * tapMult(save) * renown(save)));
}

/** What a tap is worth on average, telling blows and all. */
export function tapAverage(save: SaveData): number {
  return tapDamage(save) * (1 + CRIT_CHANCE * (CRIT_POWER - 1));
}

/** How many times a second the watchtower strikes as a tap does. */
export function volleyRate(save: SaveData): number {
  return campLevel(save, 'volley');
}

/** Seconds between one enemy falling and the next standing to fight. */
export function spawnSeconds(save: SaveData): number {
  return Math.max(0.2, SPAWN_SECONDS * (1 - campLevel(save, 'march')) * (1 - honor(save, 'march')));
}

/** Seconds the legion has to bring a captain or a boss down. */
export function bossSeconds(save: SaveData): number {
  return BOSS_SECONDS + campLevel(save, 'bossTime') + honor(save, 'bossTime');
}

/** Whether the legion, left to itself, brings a stage's enemy down in the time it has. Plain enemies have all the time there is. */
export function canBeat(save: SaveData, stage: number): boolean {
  if (kindOf(stage) === 'troop') return true;
  const dps = legionDps(save) + volleyRate(save) * tapDamage(save);
  return dps > 0 && enemyHp(stage) / dps <= bossSeconds(save) * 0.9;
}

// ------------------------------------------------------------ away

/** The stage the legion earns at while nobody is looking: where it is, or the stage before a captain or a boss it could not be left with. */
export function farmStage(save: SaveData): number {
  const s = save.run.stage;
  return kindOf(s) === 'troop' || canBeat(save, s) ? s : Math.max(1, s - 1);
}

/** Gold a second the legion earns by itself where it stands, nobody tapping. */
export function income(save: SaveData): number {
  const dps = legionDps(save) + volleyRate(save) * tapDamage(save);
  if (dps <= 0) return 0;
  const stage = farmStage(save);
  return (baseGold(stage) * goldMult(save)) / (enemyHp(stage) / dps + spawnSeconds(save));
}

export function offlineHours(save: SaveData): number {
  let levels = 0;
  for (let i = 0; i < CAMP.length; i++) if (CAMP[i].effect === 'offline') levels += save.run.camp[i];
  for (let i = 0; i < HONORS.length; i++) if (HONORS[i].effect === 'offline') levels += save.honors[i];
  return OFFLINE_HOURS + OFFLINE_HOURS_STEP * levels;
}

export function offlineShare(save: SaveData): number {
  return Math.min(1, OFFLINE_SHARE + campLevel(save, 'offline') + honor(save, 'offline'));
}

export interface Away {
  /** Seconds away that count, and whether there were more that do not. */
  seconds: number;
  capped: boolean;
  gold: number;
}

/** What the legion earned while the game was shut, from then until now. Null if it was not away long enough to say. */
export function away(save: SaveData, now: number): Away | null {
  if (save.seen <= 0) return null;
  const gone = (now - save.seen) / 1000;
  if (gone < OFFLINE_LEAST) return null;
  const most = offlineHours(save) * 3600;
  const seconds = Math.min(gone, most);
  const gold = Math.floor(income(save) * offlineShare(save) * seconds);
  if (gold <= 0) return null;
  return { seconds, capped: gone > most, gold };
}

// ------------------------------------------------------------ supply packs

/** Seconds of play to the next pack, from a roll of the dice between 0 and 1. */
export function packWait(save: SaveData, roll: number): number {
  return (PACK_EVERY[0] + (PACK_EVERY[1] - PACK_EVERY[0]) * roll) * Math.max(0.4, 1 - honor(save, 'packs'));
}

/** What a pack of gold holds. */
export function packGold(save: SaveData): number {
  return Math.ceil(baseGold(farmStage(save)) * goldMult(save) * PACK_KILLS * (1 + honor(save, 'packs')));
}

// ------------------------------------------------------------ rebirth

/** Laurels a run that reached a stage is worth. */
export function laurelsFor(top: number): number {
  if (top < REBIRTH_STAGE) return 0;
  return Math.floor(Math.pow((top - REBIRTH_STAGE) / 5 + 1, 1.5));
}

export function canRebirth(save: SaveData): boolean {
  return save.run.top >= REBIRTH_STAGE;
}

/** The stage a new run starts at. */
export function startStage(save: SaveData): number {
  return 1 + honor(save, 'start');
}

/**
 * Musters the legion again: the road, the purse, the heroes' levels and the
 * camp are given up for laurels, which stay. Returns how many were won, or
 * 0 if the run has not gone far enough to be given up.
 */
export function rebirth(save: SaveData): number {
  if (!canRebirth(save)) return 0;
  const won = laurelsFor(save.run.top);
  save.laurels += won;
  save.laurelsEver += won;
  save.rebirths++;
  save.run = newRun();
  const start = startStage(save);
  save.run.stage = start;
  save.run.top = start;
  // A legion that starts down the road is given what it would have had in its purse there.
  if (start > 1) save.run.gold = baseGold(start) * STAGE_ENEMIES * 3;
  for (const a of save.abilities) {
    a.ready = 0;
    a.until = 0;
  }
  return won;
}

export function honorCost(save: SaveData, i: number): number {
  return HONORS[i].cost + HONORS[i].step * save.honors[i];
}

export function buyHonor(save: SaveData, i: number): boolean {
  if (save.honors[i] >= HONORS[i].max) return false;
  const cost = honorCost(save, i);
  if (cost > save.laurels) return false;
  save.laurels -= cost;
  save.honors[i]++;
  return true;
}

// ------------------------------------------------------------ feats

/** How far a feat has come: the number it is counted in. */
export function featProgress(save: SaveData, feat: FeatDef): number {
  switch (feat.kind) {
    case 'stage': return save.best;
    case 'heroes': return heroesHired(save);
    case 'levels': return save.run.heroes.reduce((a, b) => a + b, 0);
    case 'taps': return save.stats.taps;
    case 'bosses': return save.stats.bosses;
    case 'gold': return save.stats.gold;
    case 'camp': return save.run.camp.reduce((a, b) => a + b, 0);
    case 'packs': return save.stats.packs;
    case 'rebirths': return save.rebirths;
  }
}

/** Marks every feat that has just been done as done. Returns them, for the game to cheer. */
export function claimFeats(save: SaveData): FeatDef[] {
  const done: FeatDef[] = [];
  for (const feat of FEATS) {
    if (save.feats.includes(feat.id)) continue;
    if (featProgress(save, feat) >= feat.need) {
      save.feats.push(feat.id);
      done.push(feat);
    }
  }
  return done;
}

/** Seconds a plain enemy of the stage takes the legion, nobody tapping. For the pacing tool and the interface. */
export function killSeconds(save: SaveData, stage: number): number {
  const dps = legionDps(save) + volleyRate(save) * tapDamage(save);
  return dps > 0 ? enemyHp(stage) / dps : Infinity;
}
