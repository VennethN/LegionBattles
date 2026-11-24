import { describe, expect, it } from 'vitest';
import { PACKS, packById } from '../src/data/packs';
import { DAILY, GIFT_PACK, PLAYTIME } from '../src/data/rewards';
import { STAGES, WORLDS, stageAt } from '../src/data/stages';
import { UNITS } from '../src/data/units';
import { GRADES } from '../src/game/rarity';
import {
  addPlaytime, claimDaily, claimPlaytime, dailyNext, dailyReady, dailyRound, dayOf, give, playedToday, playtimeLeft, playtimeState, rewardCoins,
  rewardPack, rewardsWaiting,
} from '../src/game/rewards';
import {
  buyPack, frontier, known, openPack, packHolds, packNow, packOdds, packOpen, packPool, packShown, stageEnemies, stagePay, startingSave, teamSize, unitsIn,
} from '../src/game/rules';
import { repair } from '../src/game/state';

const DAY = 20000;

describe('the day', () => {
  it('turns at midnight by the clock it is told, not by the world', () => {
    const noon = Date.UTC(2026, 10, 24, 12);
    expect(dayOf(noon, 0)).toBe(dayOf(noon + 11 * 3600e3, 0));
    expect(dayOf(noon + 12 * 3600e3, 0)).toBe(dayOf(noon, 0) + 1);
    // Nine hours ahead of UTC, the day turned at three in the afternoon of the day before.
    expect(dayOf(noon + 4 * 3600e3, -540)).toBe(dayOf(noon, 0) + 1);
    // Eight hours behind, it has not turned at six the next morning.
    expect(dayOf(noon + 18 * 3600e3, 480)).toBe(dayOf(noon, 0));
  });
});

describe('the daily calendar', () => {
  it('has seven days, and its second and its seventh give a card no pack holds', () => {
    expect(DAILY.length).toBe(7);
    for (const i of [1, 6]) {
      const r = DAILY[i];
      expect(r.kind, `day ${i + 1}`).toBe('unit');
      if (r.kind !== 'unit') continue;
      const unit = UNITS[r.unit];
      expect(unit, r.unit).toBeDefined();
      expect(unit.prize).toBe(true);
      for (const pack of PACKS) expect(packHolds(pack, unit), `${pack.id} holds ${unit.id}`).toBe(false);
    }
    // And no other day does: the two are the calendar's alone.
    expect(DAILY.filter((r) => r.kind === 'unit').length).toBe(2);
    const prizes = Object.values(UNITS).filter((u) => u.prize).map((u) => u.id).sort();
    expect(prizes).toEqual(DAILY.flatMap((r) => (r.kind === 'unit' ? [r.unit] : [])).sort());
  });

  it('gives one day each day, in order, and a day missed loses nothing', () => {
    const s = startingSave(1);
    expect(dailyReady(s, DAY)).toBe(true);
    expect(dailyNext(s)).toBe(0);
    const coins = s.coins;
    const first = claimDaily(s, DAY);
    expect(first?.coins).toBeGreaterThan(0);
    expect(s.coins).toBe(coins + (first?.coins ?? 0));
    // Not twice in a day.
    expect(dailyReady(s, DAY)).toBe(false);
    expect(claimDaily(s, DAY)).toBeNull();
    expect(dailyNext(s)).toBe(1);
    // Five days away: the next claim is still the second day's, the card.
    const second = claimDaily(s, DAY + 5);
    expect(second?.card?.unit).toBe('lamplighter');
    expect(second?.card?.outcome).toBe('new');
    expect(s.cards.some((c) => c.unit === 'lamplighter')).toBe(true);
    expect(known(s, UNITS.lamplighter)).toBe(true);
    expect(dailyNext(s)).toBe(2);
  });

  it('claims nothing when the clock is set back', () => {
    const s = startingSave(1);
    claimDaily(s, DAY);
    expect(dailyReady(s, DAY - 1)).toBe(false);
    expect(claimDaily(s, DAY - 3)).toBeNull();
    expect(dailyReady(s, DAY + 1)).toBe(true);
  });

  it('goes round again after the seventh, with its cards a grade better each time', () => {
    const s = startingSave(1);
    const grades: number[][] = [];
    for (let round = 0; round < 6; round++) {
      const got: number[] = [];
      for (let i = 0; i < DAILY.length; i++) {
        expect(dailyRound(s)).toBe(round);
        const g = claimDaily(s, DAY + round * 7 + i);
        expect(g, `round ${round} day ${i + 1}`).not.toBeNull();
        if (g?.card) got.push(g.card.grade);
      }
      grades.push(got);
    }
    expect(grades[0]).toEqual([2, 3]);
    expect(grades[1]).toEqual([3, 4]);
    // Never past the best grade there is.
    const top = GRADES.length - 1;
    expect(grades[5]).toEqual([top, top]);
    expect(s.cards.filter((c) => c.unit === 'honorguard').length).toBe(6);
  });

  it('hands a card into the team when there is a place for it, as a pack does', () => {
    const s = startingSave(1);
    expect(unitsIn(s.team)).toBeLessThan(teamSize(s));
    claimDaily(s, DAY);
    const g = claimDaily(s, DAY + 1);
    expect(g?.card?.joined).toBe(true);
    expect(s.team.some((p) => p.card === g?.card?.id)).toBe(true);
    // The team is full now: the next card waits among the units.
    s.rewards.claimed = 6;
    const guard = claimDaily(s, DAY + 2);
    expect(guard?.card?.unit).toBe('honorguard');
    expect(guard?.card?.joined).toBe(false);
  });

  it('gives coins and packs sized to where the player stands', () => {
    const early = startingSave(1);
    const late = startingSave(1);
    late.cleared = 60;
    const coins = DAILY[0];
    expect(rewardCoins(late, coins)).toBeGreaterThan(rewardCoins(early, coins) * 5);
    if (coins.kind === 'coins') expect(rewardCoins(early, coins)).toBe(Math.round((coins.wins * stagePay(0, false)) / 10) * 10);
    // The land's pack is the pack the stage they have come to drops, on its difficulty.
    const packs = DAILY[2];
    expect(rewardPack(early, packs)).toBe(stageAt(0).pack);
    expect(rewardPack(late, packs)).toBe(stageAt(60).pack);
    expect(stageAt(60).pack).toContain('@');
    const g = give(late, packs);
    expect(g.pack).toBe(stageAt(60).pack);
    expect(late.packs[stageAt(60).pack]).toBe(packs.kind === 'packs' ? packs.count : 0);
    // With every stage cleared it is the last stage's.
    late.cleared = STAGES.length;
    expect(rewardPack(late, packs)).toBe(stageAt(STAGES.length - 1).pack);
  });
});

describe('the playtime track', () => {
  it('gives the pack no shop sells at ten minutes', () => {
    const ten = PLAYTIME.find((p) => p.minutes === 10);
    expect(ten?.reward).toEqual({ kind: 'packs', pack: GIFT_PACK, count: 1 });
    // The steps come in order of their minutes.
    for (let i = 1; i < PLAYTIME.length; i++) expect(PLAYTIME[i].minutes).toBeGreaterThan(PLAYTIME[i - 1].minutes);
  });

  it('counts the time played today, and a step is ready once its minutes are in', () => {
    const s = startingSave(1);
    expect(playedToday(s, DAY)).toBe(0);
    expect(playtimeState(s, 0, DAY)).toBe('ahead');
    addPlaytime(s, 119, DAY);
    expect(playtimeState(s, 0, DAY)).toBe('ahead');
    expect(playtimeLeft(s, DAY)).toBe(1);
    addPlaytime(s, 1, DAY);
    expect(playtimeState(s, 0, DAY)).toBe('ready');
    expect(playtimeState(s, 1, DAY)).toBe('ahead');
    // Not before its time, and not twice.
    expect(claimPlaytime(s, 2, DAY)).toBeNull();
    const coins = s.coins;
    expect(claimPlaytime(s, 0, DAY)?.coins).toBeGreaterThan(0);
    expect(s.coins).toBeGreaterThan(coins);
    expect(playtimeState(s, 0, DAY)).toBe('taken');
    expect(claimPlaytime(s, 0, DAY)).toBeNull();
  });

  it('hands the Faithful Pack over at ten minutes, and it opens to a card of the Faithful', () => {
    const s = startingSave(1);
    const pack = packById(GIFT_PACK);
    // Never sold, and dark in the shop until one is in hand.
    expect(packOpen(s, pack)).toBe(false);
    expect(packShown(s, pack)).toBe(false);
    s.coins = 1e6;
    expect(buyPack(s, GIFT_PACK)).toBe(false);
    addPlaytime(s, 600, DAY);
    const at = PLAYTIME.findIndex((p) => p.minutes === 10);
    const g = claimPlaytime(s, at, DAY);
    expect(g?.pack).toBe(GIFT_PACK);
    expect(s.packs[GIFT_PACK]).toBe(1);
    expect(packShown(s, pack)).toBe(true);
    const pull = openPack(s, GIFT_PACK);
    expect(pull).not.toBeNull();
    expect(UNITS[pull!.unit].set).toBe('faithful');
    expect(UNITS[pull!.unit].prize).toBeUndefined();
    // Opened, it is still known for what it is.
    expect(packShown(s, pack)).toBe(true);
    // Its cards are four, and their chances add up to one.
    const odds = packOdds(s, pack);
    expect(odds.map((o) => o.unit.id).sort()).toEqual(['beekeeper', 'bellringer', 'blacksmith', 'gravedigger']);
    expect(odds.reduce((n, o) => n + o.chance, 0)).toBeCloseTo(1, 6);
    expect(packPool(s, pack).length).toBe(4);
  });

  it('starts again each day, and what was not claimed is gone', () => {
    const s = startingSave(1);
    addPlaytime(s, 700, DAY);
    claimPlaytime(s, 0, DAY);
    expect(rewardsWaiting(s, DAY)).toBe(3);
    // The next morning: nothing played, nothing taken, and the calendar's day waits.
    expect(playedToday(s, DAY + 1)).toBe(0);
    expect(playtimeState(s, 0, DAY + 1)).toBe('ahead');
    expect(playtimeState(s, 1, DAY + 1)).toBe('ahead');
    expect(rewardsWaiting(s, DAY + 1)).toBe(1);
    addPlaytime(s, 120, DAY + 1);
    expect(playedToday(s, DAY + 1)).toBe(120);
    expect(playtimeState(s, 0, DAY + 1)).toBe('ready');
    expect(s.rewards.taken).toEqual([]);
    // A clock set back does not start the day again.
    addPlaytime(s, 10, DAY - 4);
    expect(s.rewards.played).toBe(130);
    expect(s.rewards.playDay).toBe(DAY + 1);
  });

  it('says how many rewards wait: the day of the calendar and each step that is ready', () => {
    const s = startingSave(1);
    expect(rewardsWaiting(s, DAY)).toBe(1);
    claimDaily(s, DAY);
    expect(rewardsWaiting(s, DAY)).toBe(0);
    addPlaytime(s, 30 * 60, DAY);
    expect(rewardsWaiting(s, DAY)).toBe(PLAYTIME.length);
    expect(playtimeLeft(s, DAY)).toBe(-1);
    for (let i = 0; i < PLAYTIME.length; i++) expect(claimPlaytime(s, i, DAY)).not.toBeNull();
    expect(rewardsWaiting(s, DAY)).toBe(0);
  });
});

describe('the Faithful', () => {
  it('are in no pack that is sold, and no stage fields them', () => {
    const faithful = Object.values(UNITS).filter((u) => u.set === 'faithful');
    expect(faithful.length).toBe(6);
    for (const pack of PACKS.filter((p) => !p.gift)) for (const u of faithful) expect(packHolds(pack, u), `${pack.id} holds ${u.id}`).toBe(false);
    for (const stage of STAGES) for (const e of stageEnemies(stage.index)) expect(UNITS[e.unit].set, `stage ${stage.index + 1}`).not.toBe('faithful');
    // Unknown until held: they are met nowhere.
    const s = startingSave(1);
    s.cleared = STAGES.length;
    for (const u of faithful) expect(known(s, u), u.id).toBe(false);
  });

  it('come out of their pack at grades that rise with the difficulty the line has come to', () => {
    const s = startingSave(1);
    const pack = packById(GIFT_PACK);
    expect(pack.grows).toBe(true);
    const top = GRADES.length - 1;
    let last = packNow(s, pack);
    expect([last.gradeMin, last.gradeMax]).toEqual([pack.gradeMin, pack.gradeMax]);
    for (const world of WORLDS) {
      s.cleared = world.first;
      expect(worldOfFrontier(s)).toBe(world.lap);
      const now = packNow(s, pack);
      expect(now.gradeMin).toBeGreaterThanOrEqual(last.gradeMin);
      expect(now.gradeMax).toBeGreaterThanOrEqual(last.gradeMax);
      last = now;
    }
    expect([last.gradeMin, last.gradeMax]).toEqual([top - 1, top]);
    // What it rolls is inside what it says.
    s.packs[GIFT_PACK] = 40;
    for (let i = 0; i < 40; i++) {
      const pull = openPack(s, GIFT_PACK);
      expect(pull!.grade).toBeGreaterThanOrEqual(top - 1);
    }
    // A pack that does not grow is as it is written, wherever the line is.
    expect(packNow(s, packById('recruit'))).toBe(packById('recruit'));
  });
});

/** The difficulty of the world the line has come to. */
function worldOfFrontier(s: ReturnType<typeof startingSave>): number {
  return WORLDS.find((w) => frontier(s) >= w.first && frontier(s) <= w.last)!.lap;
}

describe('the rewards in the save', () => {
  it('are kept, and a save from before there were any has claimed nothing', () => {
    const s = startingSave(7);
    claimDaily(s, DAY);
    addPlaytime(s, 301, DAY);
    claimPlaytime(s, 0, DAY);
    const back = repair(JSON.parse(JSON.stringify(s)), 1);
    expect(back.rewards).toEqual(s.rewards);
    expect(back.rewards).toEqual({ claimed: 1, day: DAY, playDay: DAY, played: 301, taken: [0] });
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    delete old.rewards;
    expect(repair(old, 1).rewards).toEqual({ claimed: 0, day: null, playDay: 0, played: 0, taken: [] });
    // Nonsense is dropped.
    old.rewards = { claimed: -3, day: 'soon', playDay: null, played: 'x', taken: [1, 1, -2, 'a', 2.5] };
    expect(repair(old, 1).rewards).toEqual({ claimed: 0, day: null, playDay: 0, played: 0, taken: [1] });
  });
});
