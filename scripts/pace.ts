// npm run pace -- [--runs=12] [--hero=bram] [--band=biscuit,pip] [--friends] [--waves=40] [--brief] [--each] [--why] [--quiet] [--norelics] [--nokinds] [--first]
//                 [--vows=3|march,lean] [--board=none|all] [--pool=all|start]
// npm run pace -- --career[=3]
//
// Plays runs with the plain player (src/game/bot.ts) and says how they go:
// how many come through each wave, how much health is left at its end, how
// many coins it gave and what the hero stood at. It is how the numbers in
// src/game are set: run it before and after changing one, and say what
// moved.
//
// --band names who goes along. --friends plays one hero (Bram unless
// --hero names another) alone and then with each companion in turn.
// --brief prints one line to a hero. --each prints every run's last wave.
//
// It also says which roads were taken and how each went, how many relics a
// run held at its end and which were taken most, and how far the kinds of
// weapon were built up. --quiet keeps every run to the quiet road,
// --norelics fights every wave as if no relic were held, and --nokinds
// leaves the gifts of the kinds out: what each of the three is worth.
// --first plays every run as a player's first: Biscuit in the cage on the
// second wave, and with --pool=start, only the armory's first weapons in the camps.
//
// It says how long the fighting of a run took, in minutes of the game's
// own time, for the runs that came through all twenty waves and for all.
//
// What the Hold gives a run is an input: --vows is the vows the runs are
// sworn under (a number for the first so many, or their names),
// --board=all gives them every place on the board, and --pool=start
// offers them only what the armory has before any crate is bought (all of
// it is offered otherwise, as before the Hold).
//
// --career plays a player's whole time with the game, from a new save:
// run after run with whoever is open, the renown spent on the cheapest
// thing the Hold sells, until there is nothing left to open. It says how
// many runs that took and when each thing came.

import { BOARD, COMPANIONS, CRATES, HEROES, LAST_WAVE, OMENS, VOWS, relicOf, type Omen } from '../src/game/data';
import { botCamp, botSteer } from '../src/game/bot';
import { beginRun, boardFull, buyWare, count, forksNow, holdFull, termsOf, waresOf, type Ware } from '../src/game/hold';
import { endWave, kindsOf, newRun, setupOf, survived } from '../src/game/run';
import { featShare, freshSave, isFriend, isOpen, record, type SaveData } from '../src/game/state';
import { STEP, World } from '../src/game/world';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const runs = Number(option('runs', '12'));
const most = Number(option('waves', '40'));
const only = option('hero', '');
const band = option('band', '').split(',').filter(Boolean);
const friends = args.includes('--friends');
const each = args.includes('--each');
const brief = args.includes('--brief') || friends;
// --why says who hurt the hero on each wave: how a wall is found.
const why = args.includes('--why');
const asked = option('vows', '');
const vows: string[] = /^\d+$/.test(asked) ? VOWS.slice(0, Number(asked)).map((v) => v.id) : VOWS.filter((v) => asked.split(',').includes(v.id)).map((v) => v.id);

/** The Hold as the measure's options have it: what its runs begin with. */
function holdOf(): SaveData {
  const save = freshSave();
  // Every vow is open to the measure: a win under all of them is on its record.
  save.won = { [HEROES[0].id]: VOWS.map((v) => v.id) };
  save.vows = vows;
  if (option('pool', 'all') === 'all') save.crates = CRATES.map((c) => c.id);
  if (option('board', 'none') === 'all') save.board = BOARD.map((n) => n.id);
  return save;
}
const hold = holdOf();

interface WaveRow {
  came: number;
  through: number;
  hpLeft: number;
  gold: number;
  kills: number;
  level: number;
  hands: number;
  /** The share of the wave the band was on its feet for, and how many moves were let loose. */
  up: number;
  moves: number;
  by: Record<string, number>;
}

/** The waves in which the pay wagon was broken open. */
const wagons = new WeakSet<World>();

const median = (list: number[]): number => {
  const s = [...list].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

function measure(hero: string, who: readonly string[], label: string): void {
  const rows: WaveRow[] = [];
  const ends: number[] = [];
  /** Minutes of fighting in the written waves: of every run, and of those that came through all of them. */
  const minutes: number[] = [];
  const wonMinutes: number[] = [];
  const roads = Object.fromEntries(OMENS.map((o) => [o.id, { taken: 0, through: 0, prize: 0 }])) as Record<Omen, { taken: number; through: number; prize: number }>;
  const relics: Record<string, number> = {};
  /** What the runs counted for the oaths about a passive (heroes.ts, COUNTS). */
  const counts: Record<string, number[]> = {};
  let held = 0;
  let steps3 = 0;
  let strays = 0;
  for (let n = 0; n < runs; n++) {
    const run = newRun(hero, 1000 + n * 7919, who, forksNow(hold), { ...termsOf(hold, hero), first: args.includes('--first') });
    let fought = 0;
    while (run.phase !== 'over' && run.wave <= most) {
      if (args.includes('--quiet')) run.road = { omen: 'quiet' };
      const setup = setupOf(run);
      if (args.includes('--norelics')) setup.relics = [];
      // For finding out what a part of a hero is worth: the same runs without their move, their quirk, or their own weapon's growing.
      if (args.includes('--nomove')) setup.move = null;
      if (args.includes('--noquirk')) setup.quirk = null;
      if (args.includes('--nogrow') && setup.own) setup.own = { id: setup.own.id, tier: 0 };
      const world = new World(setup);
      if (args.includes('--nokinds')) Object.assign(world, { gifts: new World({ ...setup, own: null, weapons: [] }).gifts });
      const road = roads[world.omen];
      // The first wave and a captain's are not roads anyone chose.
      const chosen = run.wave > 1 && !world.wave.boss;
      if (chosen) road.taken++;
      const row = (rows[run.wave - 1] ??= { came: 0, through: 0, hpLeft: 0, gold: 0, kills: 0, level: 0, hands: 0, up: 0, moves: 0, by: {} });
      row.came++;
      let guard = 0;
      let up = 0;
      let steps = 0;
      while (!world.over && guard++ < 60 * 200) {
        world.step(botSteer(world), STEP);
        steps++;
        if (world.band.length) up += world.band.filter((a) => a.down <= 0).length / world.band.length;
        for (const e of world.drain()) {
          if (e.t === 'move') row.moves++;
          if (e.t === 'wagon' && e.how === 'broken') wagons.add(world);
        }
      }
      row.up += steps ? up / steps : 0;
      if (run.wave <= LAST_WAVE) fought += world.time;
      if (world.over === 'cleared') {
        row.through++;
        row.hpLeft += world.hero.hp / world.hero.maxHp;
        row.gold += world.gold;
        row.kills += world.kills;
      }
      for (const [k, v] of Object.entries(world.hurtBy)) row.by[k] = (row.by[k] ?? 0) + v;
      if (chosen && world.over === 'cleared') {
        road.through++;
        // Whether the road's prize was had: the wagon broken, the shrine filled, the cage opened. The rest are had by coming through.
        const won = world.omen === 'wagon' ? wagons.has(world) : world.omen === 'shrine' ? world.blessed : world.omen === 'stray' ? world.freed !== '' : true;
        if (won) road.prize++;
      }
      endWave(run, world);
      if ((run.phase as string) !== 'over') {
        row.level += run.level;
        row.hands += run.weapons.length;
        botCamp(run);
      }
    }
    ends.push(survived(run));
    minutes.push(fought / 60);
    if (survived(run) >= LAST_WAVE) wonMinutes.push(fought / 60);
    held += run.relics.length;
    for (const [of, c] of Object.entries(run.counts)) (counts[of] ??= []).push(c);
    for (const id of run.relics) relics[id] = (relics[id] ?? 0) + 1;
    steps3 += Math.max(0, ...kindsOf(run).map((k) => k.step));
    strays += run.band.filter((b) => b.stray).length;
  }
  const mean = ends.reduce((a, b) => a + b, 0) / ends.length;
  // The written game is twenty waves: past them a run that got away says little, so the mean is also taken with every run stopped there.
  const written = ends.reduce((a, b) => a + Math.min(b, LAST_WAVE), 0) / ends.length;
  const won = ends.filter((e) => e >= LAST_WAVE).length;
  console.log(`${brief ? '' : '\n'}${label.padEnd(34)} ${runs} runs, waves come through: half ${String(median(ends)).padStart(2)}, mean ${mean.toFixed(1).padStart(4)} (${written.toFixed(1).padStart(4)} of the written ${LAST_WAVE}, ${won} won), least ${String(Math.min(...ends)).padStart(2)}, most ${String(Math.max(...ends)).padStart(2)}${each ? `  [${ends.join(' ')}]` : ''}`);
  const avg = (list: number[]): string => (list.length ? (list.reduce((a, b) => a + b, 0) / list.length).toFixed(1) : '-');
  console.log(`${''.padEnd(34)} minutes fought: ${avg(minutes)} a run, ${avg(wonMinutes)} for one that came through all ${LAST_WAVE}`);
  const top = Object.entries(relics).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => `${relicOf(id).name} ${n}`).join(', ');
  console.log(`${''.padEnd(34)} relics held at the end ${(held / runs).toFixed(1)}${brief ? '' : ` (${top})`}, best kind's step ${(steps3 / runs).toFixed(1)} of 3, strays ${(strays / runs).toFixed(1)}`);
  // What half the runs counted at least, and the most any did: an oath about a passive is priced from this.
  const said = Object.entries(counts).map(([of, list]) => `${of} ${median([...list, ...new Array<number>(runs - list.length).fill(0)])} (most ${Math.max(...list)})`);
  if (said.length) console.log(`${''.padEnd(34)} counted in a run, half reach: ${said.join(', ')}`);
  if (brief) return;
  console.log('road        taken  come through  prize had');
  for (const o of OMENS) {
    const r = roads[o.id];
    if (r.taken === 0) continue;
    console.log(`${o.id.padEnd(10)} ${String(r.taken).padStart(6)}  ${`${Math.round((100 * r.through) / r.taken)}%`.padStart(12)}  ${`${Math.round((100 * r.prize) / Math.max(1, r.through))}%`.padStart(9)}`);
  }
  console.log('wave  came  through  health left  coins  kills  level  hands  band up  moves');
  rows.forEach((r, i) => {
    if (i >= 12 && (i + 1) % 2 === 1 && i + 1 !== LAST_WAVE) return;
    const t = Math.max(1, r.through);
    const cells = [
      String(i + 1).padStart(4),
      String(r.came).padStart(4),
      String(r.through).padStart(7),
      `${Math.round((100 * r.hpLeft) / t)}%`.padStart(11),
      String(Math.round(r.gold / t)).padStart(5),
      String(Math.round(r.kills / t)).padStart(5),
      (r.level / t).toFixed(1).padStart(5),
      (r.hands / t).toFixed(1).padStart(5),
      (who.length ? `${Math.round((100 * r.up) / r.came)}%` : '').padStart(7),
      (r.moves / r.came).toFixed(1).padStart(5),
    ];
    const hurt = Object.entries(r.by).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `${k} ${(v / r.came).toFixed(1)}`).join(', ');
    console.log(cells.join('  ') + (why ? `   ${hurt}` : ''));
  });
}

// ---------------------------------------------------------------- a whole career

/** Plays one run to its end as the game does, the save taking what each wave leaves. */
function playRun(save: SaveData, hero: string, seed: number): number {
  const run = beginRun(save, hero, seed);
  save.runs++;
  while (run.phase !== 'over' && run.wave <= most) {
    const world = new World(setupOf(run));
    let guard = 0;
    while (!world.over && guard++ < 60 * 200) world.step(botSteer(world), STEP);
    const kills = world.kills;
    endWave(run, world);
    if ((run.phase as string) !== 'over') {
      record(save, run, kills);
      botCamp(run);
    } else record(save, run, kills);
  }
  // A run stopped at the measure's last wave ends there.
  if (run.phase !== 'over') {
    run.phase = 'over';
    record(save, run, 0);
  }
  return survived(run);
}

/** What a careful player buys next: the place in the band first, then the cheapest thing, but nobody whose deed is nearly done. */
function wish(save: SaveData): Ware | null {
  const wares = waresOf(save).filter((w) => {
    const hero = w.kind === 'hero' ? HEROES.find((h) => h.id === w.id) : undefined;
    const friend = w.kind === 'friend' ? COMPANIONS.find((c) => c.id === w.id) : undefined;
    const feat = hero?.unlock ?? friend?.unlock;
    return !feat || featShare(save, feat) < 0.6;
  });
  const place = wares.find((w) => w.kind === 'place');
  if (place) return place.can ? place : null;
  const can = wares.filter((w) => w.can).sort((a, b) => a.price - b.price);
  return can[0] ?? null;
}

function career(n: number): number {
  const save = freshSave();
  const came: string[] = [];
  const open = new Set<string>([...HEROES.filter((h) => isOpen(save, h.id)).map((h) => h.id)]);
  let runs = 0;
  let waves = 0;
  let place = 0;
  let wins = 0;
  const marks: Record<number, number> = {};
  let bought30 = 0;
  let boardAt = 0;
  while (!holdFull(save) && runs < 400) {
    runs++;
    // Whoever is open and has been out the least goes: a player tries the new one.
    const hero = HEROES.filter((h) => isOpen(save, h.id)).sort((a, b) => count(save, 'hero', a.id) - count(save, 'hero', b.id))[0].id;
    const got = playRun(save, hero, 5000 + n * 104729 + runs * 7919);
    waves += Math.min(got, LAST_WAVE);
    if (got >= LAST_WAVE) wins++;
    let any = false;
    for (let w = wish(save); w; w = wish(save)) {
      if (!buyWare(save, w)) break;
      any = true;
      came.push(`${runs}: ${w.name} (bought, ${w.price})`);
      if (w.kind === 'place') place = runs;
    }
    if (any && runs <= 30) bought30++;
    if (!boardAt && boardFull(save)) boardAt = runs;
    for (const h of HEROES) if (isOpen(save, h.id) && !open.has(h.id)) (open.add(h.id), came.push(`${runs}: ${h.name}${came.some((c) => c.includes(h.name)) ? '' : ' (deed)'}`));
    for (const c of COMPANIONS) if (isFriend(save, c.id) && !open.has(c.id)) (open.add(c.id), came.push(`${runs}: ${c.name}${came.some((x) => x.includes(c.name)) ? '' : ' (deed)'}`));
    for (const at of [5, 10, 20, 40]) if (runs === at) marks[at] = open.size - 2;
  }
  console.log(`\ncareer ${n + 1}: something bought after ${bought30} of the first 30 runs; the board full after run ${boardAt || '-'};`);
  console.log(`career ${n + 1}: oaths kept ${save.oaths.length} of 30, crates opened by their deeds ${CRATES.length - came.filter((c) => /Crate|Reliquary/.test(c)).length} of ${CRATES.length};`);
  console.log(`career ${n + 1}: everything open after ${runs} runs${holdFull(save) ? '' : ' (not all of it: stopped)'}; second place in the band after run ${place}; ${wins} runs won; mean ${(waves / runs).toFixed(1)} waves;`);
  console.log(`  renown earned ${save.earned} (${(save.earned / runs).toFixed(1)} a run), deeds done ${save.deeds.length}; heroes and companions opened by run 5, 10, 20, 40: ${[5, 10, 20, 40].map((a) => marks[a] ?? open.size - 2).join(', ')} of ${HEROES.length + COMPANIONS.length - 2}`);
  if (!brief) for (const line of came.filter((c) => !/^\d+: .*\(bought/.test(c) || true)) console.log(`  ${line}`);
  return runs;
}

const careers = args.find((a) => a === '--career' || a.startsWith('--career='));
if (careers) {
  const n = Number(careers.split('=')[1] ?? '3');
  const all: number[] = [];
  for (let i = 0; i < n; i++) all.push(career(i));
  console.log(`\n${n} careers: everything open after ${all.join(', ')} runs`);
} else if (friends) {
  const hero = only || HEROES[0].id;
  measure(hero, [], `${hero} alone`);
  for (const c of COMPANIONS) measure(hero, [c.id], `${hero} with ${c.name}`);
} else {
  for (const hero of HEROES.filter((h) => !only || h.id === only)) measure(hero.id, band, band.length ? `${hero.name} with ${band.join(', ')}` : hero.name);
}
