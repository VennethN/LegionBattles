// The rules of the two tracks of rewards (data/rewards.ts): what can be
// claimed, and what claiming gives. Pure: the day is passed in, so that the
// tests can turn the calendar's pages. The screens ask view/clock.ts for it.

import { packById } from '../data/packs';
import { DAILY, PLAYTIME, type Reward } from '../data/rewards';
import { stageAt } from '../data/stages';
import { UNITS } from '../data/units';
import { addCard, cardsOf } from './cards';
import { GRADES, type Rarity } from './rarity';
import { frontier, roomFor, stagePay, toggleTeam } from './rules';
import type { SaveData } from './state';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The day a moment falls in, by a clock: days since 1970 in its time zone.
 * `offset` is what Date.getTimezoneOffset gives, minutes behind UTC.
 */
export function dayOf(ms: number, offset: number): number {
  return Math.floor((ms - offset * 60000) / DAY_MS);
}

// ------------------------------------------------------------ what a reward comes to

/** Which pack a reward's packs are: its own, or the pack of the land the line has come to, on its difficulty. */
export function rewardPack(save: SaveData, reward: Reward): string | null {
  if (reward.kind !== 'packs') return null;
  return reward.pack === 'land' ? stageAt(frontier(save)).pack : reward.pack;
}

/** The coins a reward of coins comes to for this player today: so many wins where they stand, to the nearest ten. */
export function rewardCoins(save: SaveData, reward: Reward): number {
  if (reward.kind !== 'coins') return 0;
  return Math.max(10, Math.round((reward.wins * stagePay(frontier(save), false)) / 10) * 10);
}

/** The grade a reward's card comes at: its own, and one better for each time the calendar has gone round. */
export function rewardGrade(reward: Reward, round: number): number {
  if (reward.kind !== 'unit') return 0;
  return Math.min(GRADES.length - 1, reward.grade + Math.max(0, round));
}

/** What a claim gave, for the screen to show. */
export interface Given {
  reward: Reward;
  coins: number;
  /** The packs given, by id, and how many. */
  pack: string | null;
  count: number;
  /** The card given, if it was one: as a pack's pull is told. */
  card: {
    id: number;
    unit: string;
    rarity: Rarity;
    grade: number;
    outcome: 'new' | 'copy';
    held: number;
    joined: boolean;
  } | null;
}

/** Hands a reward over. Changes the save. */
export function give(save: SaveData, reward: Reward, round = 0): Given {
  const out: Given = { reward, coins: 0, pack: null, count: 0, card: null };
  if (reward.kind === 'coins') {
    out.coins = rewardCoins(save, reward);
    save.coins += out.coins;
  } else if (reward.kind === 'packs') {
    const id = rewardPack(save, reward) as string;
    // A pack that is no pack is a mistake in the data, and it should be found here.
    packById(id);
    save.packs[id] = (save.packs[id] ?? 0) + reward.count;
    out.pack = id;
    out.count = reward.count;
  } else {
    const def = UNITS[reward.unit];
    if (!def) throw new Error(`no unit "${reward.unit}" to give`);
    const before = cardsOf(save, def.id).length;
    const card = addCard(save, def.id, rewardGrade(reward, round));
    // It walks into the team if there is a place for it, as a card out of a pack does.
    const joined = roomFor(save, card.unit) && toggleTeam(save, card.id);
    out.card = { id: card.id, unit: def.id, rarity: def.rarity, grade: card.grade, outcome: before === 0 ? 'new' : 'copy', held: before + 1, joined };
  }
  return out;
}

// ------------------------------------------------------------ the calendar

/** The day of the calendar that is claimed next, from 0. */
export function dailyNext(save: SaveData): number {
  return save.rewards.claimed % DAILY.length;
}

/** How many times the calendar has gone round. */
export function dailyRound(save: SaveData): number {
  return Math.floor(save.rewards.claimed / DAILY.length);
}

/**
 * Whether the next day of the calendar can be claimed today: nothing has
 * been claimed yet today. A clock set back claims nothing: the day must be
 * later than the last.
 */
export function dailyReady(save: SaveData, day: number): boolean {
  return save.rewards.day === null || day > save.rewards.day;
}

/** Claims the next day of the calendar. Null if today's has been claimed. Changes the save. */
export function claimDaily(save: SaveData, day: number): Given | null {
  if (!dailyReady(save, day)) return null;
  const reward = DAILY[dailyNext(save)];
  const given = give(save, reward, dailyRound(save));
  save.rewards.claimed++;
  save.rewards.day = day;
  return given;
}

// ------------------------------------------------------------ time played

/** The record of today's play. A new day starts it again, and what was not claimed yesterday is gone. */
function turnDay(save: SaveData, day: number): void {
  const r = save.rewards;
  if (day > r.playDay) {
    r.playDay = day;
    r.played = 0;
    r.taken = [];
  }
}

/** Counts time played. Changes the save. */
export function addPlaytime(save: SaveData, seconds: number, day: number): void {
  turnDay(save, day);
  if (seconds > 0) save.rewards.played += seconds;
}

/** Seconds played today. */
export function playedToday(save: SaveData, day: number): number {
  return day > save.rewards.playDay ? 0 : save.rewards.played;
}

/** Where a step of the playtime track stands: taken, ready to be claimed, or still ahead. */
export function playtimeState(save: SaveData, index: number, day: number): 'taken' | 'ready' | 'ahead' {
  const step = PLAYTIME[index];
  if (!step) return 'ahead';
  if (day <= save.rewards.playDay && save.rewards.taken.includes(index)) return 'taken';
  return playedToday(save, day) >= step.minutes * 60 ? 'ready' : 'ahead';
}

/** Claims a step of the playtime track. Null if it is not ready. Changes the save. */
export function claimPlaytime(save: SaveData, index: number, day: number): Given | null {
  turnDay(save, day);
  if (playtimeState(save, index, day) !== 'ready') return null;
  save.rewards.taken.push(index);
  return give(save, PLAYTIME[index].reward);
}

/** Seconds until the next step that is still ahead, or -1 when none is. */
export function playtimeLeft(save: SaveData, day: number): number {
  const played = playedToday(save, day);
  for (const step of PLAYTIME) if (played < step.minutes * 60) return step.minutes * 60 - played;
  return -1;
}

/** How many rewards wait to be claimed: today's day of the calendar, and each step of the playtime track that is ready. */
export function rewardsWaiting(save: SaveData, day: number): number {
  let n = dailyReady(save, day) ? 1 : 0;
  for (let i = 0; i < PLAYTIME.length; i++) if (playtimeState(save, i, day) === 'ready') n++;
  return n;
}
