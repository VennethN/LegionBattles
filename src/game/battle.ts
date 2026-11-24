// The fight as it runs: one enemy at a time stands before the legion, each
// hero strikes it when its own time comes round, the player's taps and the
// watchtower's shots land between, and when it falls the next walks up.
//
// It holds only what does not need keeping (whose blow is how far along,
// how much health the enemy has left): close the game in the middle of an
// enemy and that enemy is fresh when it opens again. Everything else is in
// the save, and is changed here by the rules.
//
// It tells what happened in events, which the screen reads after each tick
// to show blows, numbers and coins. The events are a fixed row of objects
// used again every tick: nothing is made while the game runs.

import { ABILITIES, CRIT_CHANCE, CRIT_POWER, FEATS, HEROES, PACK_WAITS } from './data';
import {
  ABILITY, abilityOpen, bossSeconds, canBeat, claimFeats, damageMult, enemiesIn, enemyHp, goldFor, heroBase, kindOf, legionDps, packGold, packWait,
  rallyMult, spawnSeconds, tapDamage, volleyRate,
} from './rules';
import type { SaveData } from './state';

export type EventKind =
  | 'swing' // a hero starts a blow that lands in WINDUP seconds: a is the hero
  | 'hit' // it lands: a is the hero, b the damage
  | 'tap' // the player's blow: b is the damage, flag is true for a telling one
  | 'shot' // the watchtower's: b is the damage
  | 'storm' // the Volley ability: b is the damage
  | 'kill' // the enemy falls: b is the gold it paid, flag is true for a captain or a boss
  | 'spawn' // the next enemy stands to fight: a is its place in the stage
  | 'stage' // a stage is cleared: a is the stage the legion is at now, flag is true if it went on
  | 'fail' // a captain or a boss was not brought down in time: a is the stage fallen back to
  | 'pack' // a supply pack has come
  | 'packGone' // and gone, unopened
  | 'feat'; // a feat is done: a is its place in FEATS

export interface BattleEvent {
  kind: EventKind;
  a: number;
  b: number;
  flag: boolean;
}

/** Seconds between a hero starting a blow and the blow landing. */
export const WINDUP = 0.28;

export interface PackPrize {
  kind: 'gold' | 'rally' | 'plunder';
  gold: number;
  seconds: number;
}

export class Battle {
  /** The enemy's health, and what it stood up with. */
  hp = 0;
  maxHp = 0;
  /** "spawn" while the next enemy walks up, "fight" while one stands. */
  phase: 'spawn' | 'fight' = 'spawn';
  /** Seconds until the enemy stands, while one is walking up. */
  wait = 0;
  /** Seconds left to bring a captain or a boss down. 0 against a plain enemy. */
  bossLeft = 0;
  /** Seconds a supply pack that has come will wait to be opened. 0 when there is none. */
  packLeft = 0;

  readonly events: BattleEvent[] = [];
  count = 0;

  private readonly timers = new Float64Array(HEROES.length);
  private readonly swung = new Uint8Array(HEROES.length);
  private shotT = 0;
  private featT = 0;

  constructor(readonly save: SaveData) {
    for (let i = 0; i < 64; i++) this.events.push({ kind: 'spawn', a: 0, b: 0, flag: false });
    // Not everyone strikes on the same beat.
    for (let i = 0; i < HEROES.length; i++) this.timers[i] = (HEROES[i].period * ((i * 7) % 10)) / 14;
    this.walkUp(0.4);
  }

  private emit(kind: EventKind, a = 0, b = 0, flag = false): void {
    if (this.count >= this.events.length) return;
    const e = this.events[this.count++];
    e.kind = kind;
    e.a = a;
    e.b = b;
    e.flag = flag;
  }

  /** A number from 0 up to 1, from the save's own dice. */
  private roll(): number {
    const s = this.save;
    s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
    return s.rng / 4294967296;
  }

  private walkUp(seconds: number): void {
    this.phase = 'spawn';
    this.wait = seconds;
    this.hp = 0;
    this.bossLeft = 0;
  }

  /** The stage's kind, for the screen. */
  get kind(): 'troop' | 'captain' | 'boss' {
    return kindOf(this.save.run.stage);
  }

  /**
   * Moves the fight on by `dt` seconds. `now` is the clock on the wall, in
   * milliseconds, which abilities run by. The events of this tick are in
   * `events`, the first `count` of them.
   */
  tick(dt: number, now: number): void {
    this.count = 0;
    const save = this.save;
    const run = save.run;
    save.stats.seconds += dt;

    // Supply packs come as the game is played, and do not wait for ever.
    if (this.packLeft > 0) {
      this.packLeft -= dt;
      if (this.packLeft <= 0) {
        this.packLeft = 0;
        save.packIn = packWait(save, this.roll());
        this.emit('packGone');
      }
    } else {
      save.packIn -= dt;
      if (save.packIn <= 0) {
        this.packLeft = PACK_WAITS;
        this.emit('pack');
      }
    }

    this.featT += dt;
    if (this.featT >= 1) {
      this.featT = 0;
      this.feats();
    }

    if (this.phase === 'spawn') {
      this.wait -= dt;
      if (this.wait > 0) return;
      this.maxHp = enemyHp(run.stage);
      this.hp = this.maxHp;
      this.bossLeft = kindOf(run.stage) === 'troop' ? 0 : bossSeconds(save);
      this.phase = 'fight';
      this.emit('spawn', run.kills);
      return;
    }

    if (this.bossLeft > 0) {
      this.bossLeft -= dt;
      if (this.bossLeft <= 0) {
        this.fail();
        return;
      }
    }

    const mult = damageMult(save) * rallyMult(save, now);
    for (let i = 0; i < HEROES.length; i++) {
      const level = run.heroes[i];
      if (level <= 0) continue;
      const period = HEROES[i].period;
      this.timers[i] += dt;
      if (!this.swung[i] && this.timers[i] >= period - WINDUP) {
        this.swung[i] = 1;
        this.emit('swing', i);
      }
      if (this.timers[i] >= period) {
        this.timers[i] -= period;
        this.swung[i] = 0;
        const damage = heroBase(i, level) * mult * period;
        this.emit('hit', i, damage);
        if (this.hurt(damage, now)) return;
      }
    }

    const rate = volleyRate(save);
    if (rate > 0) {
      this.shotT += dt * rate;
      while (this.shotT >= 1) {
        this.shotT -= 1;
        const damage = tapDamage(save, now);
        this.emit('shot', 0, damage);
        if (this.hurt(damage, now)) return;
      }
    }
  }

  /** Takes health off the enemy. True if that brought it down. */
  private hurt(damage: number, now: number): boolean {
    this.hp -= damage;
    if (this.hp > 0) return false;
    this.kill(now);
    return true;
  }

  private kill(now: number): void {
    const save = this.save;
    const run = save.run;
    const big = kindOf(run.stage) !== 'troop';
    const gold = goldFor(save, run.stage, now);
    run.gold += gold;
    save.stats.gold += gold;
    save.stats.kills++;
    if (big) save.stats.bosses++;
    this.emit('kill', 0, gold, big);
    run.kills++;
    if (run.kills >= enemiesIn(run.stage)) this.cleared();
    this.walkUp(spawnSeconds(save));
  }

  private cleared(): void {
    const save = this.save;
    const run = save.run;
    run.kills = 0;
    const next = run.stage + 1;
    if (run.holding) {
      // A legion that fell back goes on again by itself once it can bring down what stopped it.
      if (save.settings.advance && canBeat(save, next)) run.holding = false;
      else {
        this.emit('stage', run.stage, 0, false);
        return;
      }
    }
    this.goTo(next);
  }

  private goTo(stage: number): void {
    const save = this.save;
    save.run.stage = stage;
    if (stage > save.run.top) save.run.top = stage;
    if (stage > save.best) save.best = stage;
    this.emit('stage', stage, 0, true);
  }

  private fail(): void {
    const run = this.save.run;
    run.stage = Math.max(1, run.stage - 1);
    run.holding = true;
    run.kills = 0;
    this.emit('fail', run.stage);
    this.walkUp(spawnSeconds(this.save) + 0.8);
  }

  private feats(): void {
    const done = claimFeats(this.save);
    for (const feat of done) this.emit('feat', FEATS.indexOf(feat));
  }

  /** The player strikes. Returns the damage done: 0 while no enemy stands. */
  tap(now: number): number {
    this.save.stats.taps++;
    if (this.phase !== 'fight') return 0;
    const crit = this.roll() < CRIT_CHANCE;
    const damage = tapDamage(this.save, now) * (crit ? CRIT_POWER : 1);
    this.emit('tap', 0, damage, crit);
    this.hurt(damage, now);
    return damage;
  }

  /** Uses an ability. False if it is not the player's yet, not ready, or has nothing to strike. */
  use(i: number, now: number): boolean {
    const save = this.save;
    const def = ABILITIES[i];
    const mine = save.abilities[i];
    if (!abilityOpen(save, i) || now < mine.ready) return false;
    if (i === ABILITY.VOLLEY) {
      if (this.phase !== 'fight') return false;
      mine.ready = now + def.cooldown * 1000;
      const damage = Math.max(1, legionDps(save) * rallyMult(save, now) * def.power);
      this.emit('storm', 0, damage);
      this.hurt(damage, now);
      return true;
    }
    mine.ready = now + def.cooldown * 1000;
    mine.until = now + def.seconds * 1000;
    return true;
  }

  /** Opens the supply pack that is waiting. Null if there is none. */
  openPack(now: number): PackPrize | null {
    if (this.packLeft <= 0) return null;
    const save = this.save;
    this.packLeft = 0;
    save.stats.packs++;
    save.packIn = packWait(save, this.roll());
    const roll = this.roll();
    // A pack may hold a moment of an ability the player has, at no cost to the ability itself.
    for (const [i, from, to] of [[ABILITY.RALLY, 0.6, 0.8], [ABILITY.PLUNDER, 0.8, 1]] as const) {
      if (roll >= from && roll < to && abilityOpen(save, i)) {
        const mine = save.abilities[i];
        mine.until = Math.max(mine.until, now) + ABILITIES[i].seconds * 1000;
        return { kind: ABILITIES[i].id as 'rally' | 'plunder', gold: 0, seconds: ABILITIES[i].seconds };
      }
    }
    const gold = packGold(save);
    save.run.gold += gold;
    save.stats.gold += gold;
    return { kind: 'gold', gold, seconds: 0 };
  }

  /** The player sends a legion that is holding on to the next stage, now. */
  challenge(): void {
    const run = this.save.run;
    if (!run.holding) return;
    run.holding = false;
    run.kills = 0;
    this.count = 0;
    this.goTo(run.stage + 1);
    this.walkUp(spawnSeconds(this.save));
  }

  /** The player says whether the legion goes on by itself or stays at its stage. */
  setAdvance(on: boolean): void {
    this.save.settings.advance = on;
    this.save.run.holding = !on;
  }

  /** Starts again from the save as it is now: after a rebirth, or a save that was read anew. */
  reset(): void {
    this.timers.fill(0);
    this.swung.fill(0);
    this.packLeft = 0;
    this.count = 0;
    this.walkUp(0.6);
  }
}
