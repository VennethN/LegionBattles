// npm run pace [-- --hours=6 --taps=4 --each]
//
// Plays the game through by its own rules, in seconds, and says how long
// each stretch of the road takes: a player who only buys what is best, with
// or without tapping. The numbers in src/game/data.ts are set by looking at
// what this prints. Nothing here is the game's: it only presses what a
// player could.

import { ABILITIES, CAMP, HEROES, HONORS } from '../src/game/data';
import { Battle } from '../src/game/battle';
import {
  abilityOpen, buyCamp, buyHero, buyHonor, campCost, canRebirth, damageMult, goldMult, heroBase, heroCost, heroOpen, honorCost, income, killSeconds,
  laurelsFor, legionDps, rebirth, tapDamage, volleyRate,
} from '../src/game/rules';
import { newSave, type SaveData } from '../src/game/state';

const arg = (name: string, fallback: number): number => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? Number(a.split('=')[1]) : fallback;
};
const HOURS = arg('hours', 6);
const TAPS = arg('taps', 0);
/** Minutes without reaching a new stage before a player who can be reborn is. */
const STUCK = arg('stuck', 12);
const EACH = process.argv.includes('--each');

const time = (s: number): string => (s < 3600 ? `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, '0')}s` : `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`);

/** Buys what is worth most for its price, over and over, until nothing is worth buying now. */
function shop(save: SaveData): void {
  for (let guard = 0; guard < 400; guard++) {
    const dps = legionDps(save);
    const mult = damageMult(save);
    let best = -1;
    let bestWorth = 0;
    let bestCost = Infinity;
    let kind: 'hero' | 'camp' = 'hero';
    for (let i = 0; i < HEROES.length; i++) {
      if (!heroOpen(save, i)) continue;
      const cost = heroCost(save, i, 1);
      const level = save.run.heroes[i];
      const gain = (heroBase(i, level + 1) - heroBase(i, level)) * mult;
      // The first hero of all is worth having at any price, as nothing is earned without one.
      const worth = dps <= 0 ? 1 / cost : gain / cost;
      if (worth > bestWorth) {
        bestWorth = worth;
        best = i;
        bestCost = cost;
        kind = 'hero';
      }
    }
    for (let i = 0; i < CAMP.length; i++) {
      if (save.run.camp[i] >= CAMP[i].max) continue;
      const cost = campCost(save, i);
      const c = CAMP[i];
      let gain = 0;
      if (c.effect === 'damage') gain = (dps * c.per) / (1 + c.per * save.run.camp[i]);
      // Gold is worth a little less than damage: it has to be spent to become damage.
      else if (c.effect === 'gold') gain = ((dps * c.per) / (1 + c.per * save.run.camp[i])) * 0.8;
      else if (c.effect === 'volley') gain = tapDamage(save) * c.per;
      else if (c.effect === 'tap') gain = (TAPS + volleyRate(save)) * tapDamage(save) * (c.per / (1 + c.per * save.run.camp[i]));
      // The rest are conveniences: bought when they are cheap beside the purse.
      else if (cost < save.run.gold * 0.05) gain = dps;
      const worth = gain / cost;
      if (worth > bestWorth) {
        bestWorth = worth;
        best = i;
        bestCost = cost;
        kind = 'camp';
      }
    }
    if (best < 0 || bestCost > save.run.gold) return;
    if (kind === 'hero') buyHero(save, best, 1);
    else buyCamp(save, best);
  }
}

/** Spends laurels: damage and gold in turn, with the rest when they are cheap. */
function honors(save: SaveData): void {
  for (let guard = 0; guard < 200; guard++) {
    let best = -1;
    let bestCost = Infinity;
    for (let i = 0; i < HONORS.length; i++) {
      if (save.honors[i] >= HONORS[i].max) continue;
      const cost = honorCost(save, i);
      const main = HONORS[i].effect === 'damage' || HONORS[i].effect === 'gold';
      const weighed = main ? cost : cost * 2.5;
      if (cost <= save.laurels && weighed < bestCost) {
        bestCost = weighed;
        best = i;
      }
    }
    if (best < 0) return;
    buyHonor(save, best);
  }
}

const save = newSave(3);
const battle = new Battle(save);
let now = 1_000_000;
const DT = 0.1;
let t = 0;
let runStart = 0;
let lastTop = 0;
let lastTopAt = 0;
let tapT = 0;
const marks: string[] = [];
let nextMark = 10;
console.log(`pace: ${HOURS} hours, ${TAPS} taps a second, reborn after ${STUCK} minutes stuck`);
const header = (): void => console.log(`  run ${save.rebirths + 1}${save.laurelsEver ? ` (laurels ${save.laurelsEver}, honors ${save.honors.join('/')})` : ''}`);
header();
while (t < HOURS * 3600) {
  battle.tick(DT, now);
  // Nobody earns a coin before the first hero without tapping, so everyone taps until then.
  const taps = save.run.heroes[0] > 0 ? TAPS : Math.max(TAPS, 4);
  if (taps > 0) {
    tapT += DT * taps;
    while (tapT >= 1) {
      tapT -= 1;
      battle.tap(now);
    }
    for (let i = 0; i < ABILITIES.length; i++) if (abilityOpen(save, i)) battle.use(i, now);
  }
  if (battle.packLeft > 0 && TAPS > 0) battle.openPack(now);
  t += DT;
  now += DT * 1000;
  if (Math.round(t * 10) % 10 === 0) shop(save);
  const top = save.run.top;
  if (top > lastTop) {
    lastTop = top;
    lastTopAt = t;
    if (top >= nextMark) {
      marks.push(`${nextMark}:${time(t - runStart)}` + (EACH ? `[kill ${killSeconds(save, top).toFixed(2)}s hired ${save.run.heroes.filter((l) => l > 0).length} lv ${save.run.heroes.reduce((a, b) => a + b, 0)} dmg x${damageMult(save).toFixed(1)} gold x${goldMult(save).toFixed(1)}]\n     ` : ''));
      nextMark += 10;
    }
  }
  if (canRebirth(save) && t - lastTopAt > STUCK * 60) {
    const won = laurelsFor(save.run.top);
    console.log(`    ${marks.join('  ')}`);
    console.log(`    reborn at stage ${save.run.top} after ${time(t - runStart)} (at ${time(t)}), for ${won} laurels; hired ${save.run.heroes.filter((l) => l > 0).length}, levels ${EACH ? save.run.heroes.join(',') : save.run.heroes.reduce((a, b) => a + b, 0)}, camp ${save.run.camp.join('/')}, income ${income(save).toExponential(2)}/s`);
    rebirth(save);
    honors(save);
    battle.reset();
    runStart = t;
    lastTop = 0;
    lastTopAt = t;
    marks.length = 0;
    nextMark = 10;
    header();
  }
}
console.log(`    ${marks.join('  ')}`);
console.log(`  at the end: stage ${save.run.stage} (top ${save.run.top}, best ${save.best}), ${save.rebirths} rebirths, ${save.laurelsEver} laurels, feats ${save.feats.length}, hired ${save.run.heroes.filter((l) => l > 0).length}, levels ${save.run.heroes.join(',')}, camp ${save.run.camp.join('/')}`);
