import { describe, expect, it } from 'vitest';
import { iconArt } from '../src/art/icons';
import { DUNGEONS } from '../src/data/expeditions';
import { packById } from '../src/data/packs';
import {
  EFFECTS, EFFECT_NAME, PLAYER_MAX_LEVEL, POINTS_PER_LEVEL, TREE, UPGRADES, playerXpToNext, treeNode,
} from '../src/data/player';
import { STAGES } from '../src/data/stages';
import { SOURCES, bonus, bonusParts, bonuses, fieldBonus } from '../src/game/bonuses';
import { addCard } from '../src/game/cards';
import { afterFloor, floorInput, startRun } from '../src/game/expeditions';
import {
  addPlayerXp, buyUpgrade, playerHasNews, pointsEarned, pointsFree, pointsSpent, rankOf, rankUp, resetTree, tidyTree, upgradeCost, upgradeLevel,
  whyNoRank,
} from '../src/game/player';
import { cardMult } from '../src/game/rarity';
import {
  DROP_CHANCE, bestTeam, buyPack, fighting, finishStage, payOf, priceOf, stageInput, stagePay, stageXp, startingSave, teamPlacements, xpOf,
} from '../src/game/rules';
import { repair, type SaveData } from '../src/game/state';

/** The icons there are to wear. */
const ICONS = iconArt().map((i) => i.name);

function at(index: number, level = 1): SaveData {
  const save = startingSave(21);
  save.cleared = index;
  save.at = Math.min(index, STAGES.length - 1);
  save.player.level = level;
  return save;
}

describe('the player\'s level', () => {
  it('a new player is at level 1, and each level takes more than the last', () => {
    const save = startingSave(1);
    expect(save.player).toEqual({ level: 1, xp: 0 });
    for (let l = 1; l < PLAYER_MAX_LEVEL; l++) expect(playerXpToNext(l + 1)).toBeGreaterThan(playerXpToNext(l));
    // The first comes within a handful of first battles.
    expect(playerXpToNext(1)).toBeLessThan(stageXp(0, true) * 6);
  });

  it('experience makes levels, the rest is kept toward the next, and the last level is the last', () => {
    const save = startingSave(1);
    expect(addPlayerXp(save, playerXpToNext(1) - 1)).toBe(0);
    expect(save.player).toEqual({ level: 1, xp: playerXpToNext(1) - 1 });
    expect(addPlayerXp(save, 1 + playerXpToNext(2) + 7)).toBe(2);
    expect(save.player).toEqual({ level: 3, xp: 7 });
    expect(addPlayerXp(save, 1e9)).toBe(PLAYER_MAX_LEVEL - 3);
    expect(save.player).toEqual({ level: PLAYER_MAX_LEVEL, xp: 0 });
    expect(addPlayerXp(save, 500)).toBe(0);
    expect(save.player.xp).toBe(0);
  });

  it('a battle teaches the player what it teaches each card, won or lost', () => {
    const save = startingSave(4);
    const won = finishStage(save, 0, true);
    expect(won.playerXp).toBe(stageXp(0, true));
    expect(won.playerXp).toBe(won.xp);
    const lost = finishStage(save, 1, false);
    expect(lost.playerXp).toBe(stageXp(1, false));
    expect(lost.playerXp).toBeGreaterThan(0);
    // Enough battles make a level, and the result says so.
    let levels = 0;
    for (let i = 0; i < 12; i++) levels += finishStage(save, 0, true).playerLevels;
    expect(levels).toBeGreaterThan(0);
    expect(save.player.level).toBe(1 + won.playerLevels + lost.playerLevels + levels);
  });

  it('a player who walks the whole line ends well up the levels, with fewer points than the tree has ranks', () => {
    const save = startingSave(4);
    // One win at every stage, and half as many again lost: about what the simulated players take.
    for (const s of STAGES) addPlayerXp(save, stageXp(s.index, true) + stageXp(s.index, false) * 1.2);
    expect(save.player.level).toBeGreaterThan(25);
    expect(save.player.level).toBeLessThan(PLAYER_MAX_LEVEL);
    const ranks = TREE.reduce((n, node) => n + node.ranks, 0);
    expect(pointsEarned(save)).toBeLessThan(ranks);
    expect((PLAYER_MAX_LEVEL - 1) * POINTS_PER_LEVEL).toBeLessThan(ranks);
  });
});

describe('the skill tree', () => {
  it('every node gives one of the effects there are, stands on a place of its own, and needs a node that comes before it', () => {
    const places = new Set<string>();
    TREE.forEach((node, i) => {
      expect(EFFECTS, node.id).toContain(node.effect);
      expect(node.ranks, node.id).toBeGreaterThan(0);
      expect(node.perRank, node.id).toBeGreaterThan(0);
      expect(node.text, node.id).toContain('{amount}');
      expect(ICONS, `${node.id}: icon ${node.icon}`).toContain(node.icon);
      expect(places.has(node.at.join()), node.id).toBe(false);
      places.add(node.at.join());
      if (node.needs) {
        const before = TREE.findIndex((n) => n.id === node.needs!.node);
        expect(before, node.id).toBeGreaterThanOrEqual(0);
        expect(before, node.id).toBeLessThan(i);
        expect(node.needs.ranks, node.id).toBeLessThanOrEqual(TREE[before].ranks);
      }
    });
    expect(TREE.filter((n) => !n.needs).map((n) => n.id)).toEqual(['command']);
    expect(new Set(TREE.map((n) => n.id)).size).toBe(TREE.length);
    for (const e of EFFECTS) expect(EFFECT_NAME[e]).toBeTruthy();
  });

  it('a level is a point, a point is a rank, and a node opens when the one before it has ranks enough', () => {
    const save = at(0, 1);
    expect(pointsFree(save)).toBe(0);
    expect(rankUp(save, 'command')).toBe(false);
    expect(whyNoRank(save, treeNode('command')!)).toBe('points');
    save.player.level = 6;
    expect(pointsEarned(save)).toBe(5 * POINTS_PER_LEVEL);
    // Nothing before the root.
    expect(whyNoRank(save, treeNode('edge')!)).toBe('needs');
    expect(rankUp(save, 'edge')).toBe(false);
    expect(rankUp(save, 'command')).toBe(true);
    expect(whyNoRank(save, treeNode('command')!)).toBe('full');
    expect(rankUp(save, 'command')).toBe(false);
    expect(rankUp(save, 'edge')).toBe(true);
    expect(rankUp(save, 'edge')).toBe(true);
    // Battle Fury needs three ranks of Keen Edge.
    expect(whyNoRank(save, treeNode('fury')!)).toBe('needs');
    expect(rankUp(save, 'edge')).toBe(true);
    expect(whyNoRank(save, treeNode('fury')!)).toBeNull();
    expect(rankUp(save, 'fury')).toBe(true);
    expect(pointsSpent(save)).toBe(5);
    expect(pointsFree(save)).toBe(0);
    expect(rankUp(save, 'fury')).toBe(false);
    expect(rankUp(save, 'nothing')).toBe(false);
    expect(rankOf(save, 'edge')).toBe(3);
    // Every point comes back, to be spent again.
    resetTree(save);
    expect(pointsFree(save)).toBe(5);
    expect(rankOf(save, 'edge')).toBe(0);
  });

  it('a tree a save brings in wrong is put right', () => {
    const save = at(0, 4);
    // A node with nothing under it, more ranks than a node has, and a node there is not.
    save.tree = { fury: 2, command: 9, nothing: 3 };
    tidyTree(save);
    expect(save.tree).toEqual({ command: 1 });
    // More points than the level earned: all of it is taken back.
    save.tree = { command: 1, edge: 5, drill: 5 };
    tidyTree(save);
    expect(save.tree).toEqual({});
    const loaded = repair({ ...JSON.parse(JSON.stringify(at(0, 9))), tree: { command: 1, edge: 3, fury: 2, bogus: 4 } }, 1);
    expect(loaded.tree).toEqual({ command: 1, edge: 3, fury: 2 });
    expect(loaded.player.level).toBe(9);
    // A save from before there were levels starts at the first, with nothing bought.
    const old = JSON.parse(JSON.stringify(at(30, 12)));
    delete old.player;
    delete old.tree;
    delete old.upgrades;
    const fresh = repair(old, 1);
    expect(fresh.player).toEqual({ level: 1, xp: 0 });
    expect(fresh.tree).toEqual({});
    expect(fresh.upgrades).toEqual({});
  });
});

describe('upgrades', () => {
  it('each gives one of the effects there are, and each level costs more than the last', () => {
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(UPGRADES.length);
    for (const up of UPGRADES) {
      expect(EFFECTS, up.id).toContain(up.effect);
      expect(ICONS, `${up.id}: icon ${up.icon}`).toContain(up.icon);
      expect(up.text, up.id).toContain('{amount}');
      const save = at(0);
      let last = 0;
      for (let l = 0; l < up.levels; l++) {
        save.upgrades[up.id] = l;
        const cost = upgradeCost(save, up)!;
        expect(cost, `${up.id} level ${l + 1}`).toBeGreaterThan(last);
        expect(cost % 5).toBe(0);
        last = cost;
      }
      save.upgrades[up.id] = up.levels;
      expect(upgradeCost(save, up)).toBeNull();
      // The first is within reach in the first world, and the last is something to save for.
      expect(up.cost).toBeLessThan(STAGES[9].coins * 3);
      expect(last).toBeGreaterThan(STAGES[STAGES.length - 1].coins);
    }
  });

  it('coins buy the next level, and nothing is bought that the coins will not pay for', () => {
    const save = at(5);
    const up = UPGRADES[0];
    save.coins = upgradeCost(save, up)! - 1;
    expect(buyUpgrade(save, up.id)).toBe(false);
    expect(upgradeLevel(save, up.id)).toBe(0);
    expect(playerHasNews(save)).toBe(false);
    save.coins = 100000;
    expect(playerHasNews(save)).toBe(true);
    const first = upgradeCost(save, up)!;
    expect(buyUpgrade(save, up.id)).toBe(true);
    expect(save.coins).toBe(100000 - first);
    expect(upgradeLevel(save, up.id)).toBe(1);
    save.coins = 1e12;
    for (let i = 0; i < 99; i++) buyUpgrade(save, up.id);
    expect(upgradeLevel(save, up.id)).toBe(up.levels);
    expect(buyUpgrade(save, up.id)).toBe(false);
    expect(buyUpgrade(save, 'nothing')).toBe(false);
  });
});

describe('bonuses', () => {
  const maxed = (): SaveData => {
    const save = at(60, PLAYER_MAX_LEVEL);
    for (const node of TREE) save.tree[node.id] = node.ranks;
    for (const up of UPGRADES) save.upgrades[up.id] = up.levels;
    return save;
  };

  it('are added up in one place, from every source, and a player with nothing has none', () => {
    const none = at(10);
    for (const e of EFFECTS) expect(bonus(none, e)).toBe(0);
    expect(bonuses(none)).toEqual([]);
    expect(fieldBonus(none, false)).toEqual({ hp: 1, damage: 1 });
    const save = at(10, 12);
    save.tree = { command: 1, drill: 3 };
    save.upgrades = { rations: 4, ledgers: 2 };
    expect(bonus(save, 'health')).toBeCloseTo(0.02 + 3 * 0.02 + 4 * 0.01, 9);
    expect(bonusParts(save, 'health').map((p) => p.source)).toEqual(['tree', 'upgrades']);
    expect(bonusParts(save, 'health').reduce((n, p) => n + p.amount, 0)).toBeCloseTo(bonus(save, 'health'), 9);
    expect(bonus(save, 'coins')).toBeCloseTo(0.04, 9);
    expect(bonus(save, 'damage')).toBe(0);
    expect(bonuses(save).map((b) => b.effect).sort()).toEqual(['coins', 'health']);
    // Every effect the data names has a source that can give it, and the total is the sum of the sources.
    const all = maxed();
    for (const e of EFFECTS) {
      expect(bonus(all, e), e).toBeGreaterThan(0);
      const sum = SOURCES.reduce((n, src) => n + src.of(all, e), 0);
      expect(bonus(all, e)).toBeLessThanOrEqual(sum + 1e-9);
    }
    // A pack is never free, however much is taken off it.
    expect(bonus(all, 'packCost')).toBeLessThanOrEqual(0.5);
  });

  it('health and damage reach everything the player fields, and structures have a bonus of their own on top', () => {
    const save = at(40, 30);
    for (const u of ['paladin', 'mage', 'watchtower']) addCard(save, u, 2);
    save.team = bestTeam(save);
    const plain = teamPlacements(save, STAGES[40].field);
    save.tree = { command: 1, edge: 5, drill: 5, masonry: 5 };
    save.upgrades = { whetstones: 10 };
    const boosted = teamPlacements(save, STAGES[40].field);
    const health = 1 + bonus(save, 'health');
    const damage = 1 + bonus(save, 'damage');
    const built = bonus(save, 'structures');
    expect(built).toBeGreaterThan(0);
    boosted.forEach((p, i) => {
      const tower = p.unit === 'watchtower';
      expect(p.hpMult! / plain[i].hpMult!, p.unit).toBeCloseTo(tower ? health + built : health, 9);
      expect(p.damageMult! / plain[i].damageMult!, p.unit).toBeCloseTo(tower ? damage + built : damage, 9);
    });
    // The battle is fought with them, and so is a dungeon's floor.
    expect(stageInput(save, 40).teams[0]).toEqual(boosted);
    const card = save.cards[0];
    expect(fighting(save, card).hpMult).toBeCloseTo(cardMult(card.grade, card.level) * health, 9);
    save.cleared = 60;
    const run = startRun(save, DUNGEONS[0], 0);
    if (!run) throw new Error('no run');
    const floor = floorInput(save, run, DUNGEONS[0]).teams[0];
    const mine = floor.find((p) => p.unit === card.unit)!;
    expect(mine.hpMult).toBeCloseTo(cardMult(card.grade, card.level) * health, 9);
  });

  it('coins, experience, drops and prices are what they were, and more or less by what the player has', () => {
    const plain = at(20);
    expect(payOf(plain, 20, true)).toBe(stagePay(20, true));
    expect(xpOf(plain, 20, true)).toBe(stageXp(20, true));
    expect(priceOf(plain, packById('recruit'))).toBe(packById('recruit').cost);
    const save = at(20, 40);
    save.tree = { command: 1, tithe: 5, study: 5, scouts: 5, haggle: 5 };
    save.upgrades = { ledgers: 10, tutors: 10 };
    expect(payOf(save, 20, true)).toBe(Math.round(stagePay(20, true) * (1 + 0.2 + 0.2)));
    expect(xpOf(save, 20, false)).toBe(Math.round(stageXp(20, false) * (1 + 0.2 + 0.2)));
    const won = finishStage(save, 20, true);
    expect(won.coins).toBe(Math.round(stagePay(20, true) * 1.4));
    expect(won.xp).toBe(Math.round(stageXp(20, true) * 1.4));
    expect(won.playerXp).toBe(won.xp);
    // Packs cost less, to the nearest five, and are bought at that price.
    const pack = packById('recruit');
    const price = priceOf(save, pack);
    expect(price).toBe(Math.round((pack.cost * 0.85) / 5) * 5);
    const before = save.coins;
    expect(buyPack(save, 'recruit')).toBe(true);
    expect(save.coins).toBe(before - price);
    // And a win drops a pack more often: over many wins at a stage already cleared, about as often as the two add up to.
    const lucky = at(30, 40);
    lucky.tree = { command: 1, tithe: 5, study: 5, scouts: 5 };
    const dull = at(30, 40);
    let a = 0;
    let b = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) {
      a += finishStage(lucky, 3, true).packs.length;
      b += finishStage(dull, 3, true).packs.length;
    }
    expect(b / n).toBeGreaterThan(DROP_CHANCE - 0.03);
    expect(b / n).toBeLessThan(DROP_CHANCE + 0.03);
    expect(a / n).toBeGreaterThan(DROP_CHANCE + 0.1 - 0.03);
    expect(a / n).toBeLessThan(DROP_CHANCE + 0.1 + 0.03);
  });

  it('a dungeon pays and teaches by them too', () => {
    const base = at(60, 30);
    for (const u of ['paladin', 'mage', 'knight', 'archer']) Object.assign(addCard(base, u, 6), { level: 20 });
    base.team = bestTeam(base);
    const boosted: SaveData = JSON.parse(JSON.stringify(base));
    boosted.tree = { command: 1, tithe: 5, study: 5 };
    const results = [base, boosted].map((save) => {
      const d = DUNGEONS[0];
      const run = startRun(save, d, 0);
      if (!run) throw new Error('no run');
      const coins = save.coins;
      let xp = 0;
      let prize = 0;
      while (!run.over) {
        const r = afterFloor(save, run, d, true, run.roster.filter((x) => x.fielded).map(() => 1));
        xp = r.xp;
        if (r.prize) prize = r.prize.coins;
      }
      return { xp, prize, gained: save.coins - coins, level: save.player };
    });
    // A fifth more of each, to within the rounding of the two.
    expect(Math.abs(results[1].xp - results[0].xp * 1.2)).toBeLessThanOrEqual(1);
    expect(Math.abs(results[1].prize - results[0].prize * 1.2)).toBeLessThanOrEqual(1);
    expect(results[1].gained).toBe(results[1].prize);
    // The player learns from a dungeon as from the line.
    expect(results[0].level.xp + results[0].level.level).toBeGreaterThan(30);
  });
});
