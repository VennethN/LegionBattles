// A player made of rules, for the measure (scripts/pace.ts) and for the
// scripts that film the game. It plays a hunt decently and no better: it
// sees a tell a moment after it appears, walks out of it, rolls when
// walking will not do, strikes in the openings, and uses what it brought
// when a careful player would. It reads only what a player can see: the
// tells, where things stand, and what is ready.

import type { BuildingDef } from './content';
import { FIELD, CAMP } from './content';
import { inside } from './geometry';
import type { Hunt, Hunter, Steer, Tell } from './hunt';

export interface BotOpts {
  /** Seconds before it sees a tell that has appeared. A careful player is about a quarter of a second. */
  react?: number;
  /** The chance it does not see a tell at all. A careful player misses about one in fourteen. */
  slip?: number;
  /** False for a bot that never uses its abilities, or never blows the horn: to measure what they are worth. */
  abilities?: boolean;
  horn?: boolean;
  /** Which of the party it steers: 0, the player, unless it is a partner's brain. */
  who?: number;
  /** True for a partner's brain: it keeps out of the player's way, helps the fallen up, and leaves building and the horn to the player. */
  partner?: boolean;
}

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

/** True while the boss is about to strike: no time to stand and swing at it. */
const safeLater = (h: Hunt): boolean => h.monster.state === 'tell';

export class Bot {
  private readonly react: number;
  private readonly slip: number;
  private readonly abilities: boolean;
  private readonly horn: boolean;
  /** The tells it has decided not to see: a slip is for the whole of a tell. */
  private readonly unseen = new Set<number>();
  private readonly judged = new Set<number>();
  private plan: Array<{ id: string; x: number; y: number; tries: number }> | null = null;
  private dice: number;
  private side = 1;
  private readonly who: number;
  private readonly partner: boolean;

  constructor(seed = 1, o: BotOpts = {}) {
    this.react = o.react ?? 0.24;
    this.slip = o.slip ?? 0.07;
    this.abilities = o.abilities ?? true;
    this.horn = (o.horn ?? true) && !o.partner;
    this.who = o.who ?? 0;
    this.partner = !!o.partner;
    this.dice = seed >>> 0 || 1;
    this.side = this.who % 2 === 0 ? 1 : -1;
  }

  /** The hunter it steers. */
  private me(h: Hunt): Hunter {
    return h.party[this.who] ?? h.hunter;
  }

  private roll(): number {
    // Its own small dice: the hunt's are not its to draw from.
    this.dice = (Math.imul(this.dice, 1664525) + 1013904223) >>> 0;
    return this.dice / 0x100000000;
  }

  /** How it is steered now, in camp or in the hunt. */
  steer(h: Hunt): Steer {
    if (h.phase === 'camp') return this.partner ? this.keepBy(h) : this.camp(h);
    if (this.me(h).down) return { x: 0, y: 0 };
    const s = this.fight(h);
    // In a hunt that teaches it does what the step asks for, as someone reading the plate would.
    const t = this.partner ? null : h.teaching;
    if (t) {
      if (t.step.wants === 'skill') {
        // It waits for the red to show where the step shows an attack, and presses a moment after.
        const shown = h.tells.some((x) => x.foe && x.of - x.left > this.react);
        if (!t.step.attack || shown) {
          if (t.step.skill === 0) s.a = true;
          else s.b = true;
        }
      } else if (t.step.wants === 'dodge' && this.seen(h).length > 0) s.dodge = true;
    }
    return s;
  }

  // ------------------------------------------------------------ camp

  /** Where each kind of building is wanted: along the way from the monster to where the hunter starts. */
  private wanted(h: Hunt): Array<{ id: string; x: number; y: number; tries: number }> {
    const m = h.monster;
    const hx = h.hunter.x;
    const hy = h.hunter.y;
    const d = dist(hx, hy, m.x, m.y) || 1;
    const ux = (hx - m.x) / d;
    const uy = (hy - m.y) / d;
    const at = (along: number, across: number): { x: number; y: number } => ({ x: m.x + ux * along - uy * across, y: m.y + uy * along + ux * across });
    const spots: Record<Exclude<BuildingDef['kind'], 'cart'>, Array<{ x: number; y: number }>> = {
      // Barricades where a charge at the hunter would run; a fire and a bell where the fight will be; a ballista behind it all.
      wall: [at(CAMP.clear + 70, 0), at(CAMP.clear + 70, 150), at(CAMP.clear + 70, -150)],
      fire: [at(CAMP.clear + 30, 80), at(CAMP.clear + 30, -230), at(CAMP.clear + 180, 230)],
      bell: [at(CAMP.clear + 40, -90), at(CAMP.clear + 40, 250), at(CAMP.clear + 200, -250)],
      ballista: [at(d - 40, 120), at(d - 40, -120), at(d - 40, 260)],
    };
    const plan: Array<{ id: string; x: number; y: number; tries: number }> = [];
    for (const [id, n] of Object.entries(h.toPlace)) {
      const kind = kindOf(id);
      for (let i = 0; i < n; i++) plan.push({ id, ...spots[kind][i % 3], tries: 0 });
    }
    return plan;
  }

  /** A partner in camp: by the player's side, out of their way. */
  private keepBy(h: Hunt): Steer {
    const me = this.me(h);
    const p = h.hunter;
    const tx = p.x - 50 + this.side * 20 * this.who;
    const ty = p.y + this.side * 70;
    const d = dist(me.x, me.y, tx, ty);
    return d > 24 ? { x: (tx - me.x) / d, y: (ty - me.y) / d } : { x: 0, y: 0 };
  }

  private camp(h: Hunt): Steer {
    // A contract that asks for nothing to be built: nothing is.
    this.plan ??= h.tasks.some((t) => t.id === 'nobuild') ? [] : this.wanted(h);
    const hu = h.hunter;
    const job = this.plan[0];
    if (!job) return { x: 0, y: 0, wake: true };
    // A building goes down a step in front of the hunter, the way they last walked: so it walks up to a step short of the place.
    const e = FIELD.edge + 20;
    const tx = Math.max(e, Math.min(h.w - e, job.x));
    const ty = Math.max(e, Math.min(h.h - e, job.y));
    const d = dist(hu.x, hu.y, tx, ty);
    if (d > 52) return { x: (tx - hu.x) / d, y: (ty - hu.y) / d };
    job.tries++;
    if (!h.whyNot(job.id) || job.tries > 40) {
      this.plan.shift();
      return { x: 0, y: 0, place: job.id };
    }
    // Not here: a little to one side, and try again.
    return { x: -(ty - hu.y) / (d || 1), y: (tx - hu.x) / (d || 1) };
  }

  // ------------------------------------------------------------ the hunt

  /** The tells it knows of: those shown long enough for it to have seen them, less the ones it missed. */
  private seen(h: Hunt): Tell[] {
    const out: Tell[] = [];
    for (const t of h.tells) {
      // A keg is shown as the boss's blows are, and hurts as they do: it is kept out of. A sapper's charge is not.
      if (!t.foe && !t.hurt) continue;
      if (!this.judged.has(t.id)) {
        this.judged.add(t.id);
        if (this.roll() < this.slip) this.unseen.add(t.id);
      }
      if (this.unseen.has(t.id) || t.of - t.left < this.react) continue;
      out.push(t);
    }
    return out;
  }

  private fight(h: Hunt): Steer {
    const hu = this.me(h);
    const m = h.monster;
    const tells = this.seen(h);
    const steer: Steer = { x: 0, y: 0 };
    const run = h.running;
    // The line the monster is running down is as bad as a tell.
    const lane: Tell | null = run ? { id: -1, kind: 'line', x: m.x, y: m.y, angle: run.angle, len: run.left + 40, w: m.def.r * 2 + 40, r: 0, half: 0, inner: 0, left: 0, of: 1, dmg: 1, foe: true, attack: 'charge', by: 0 } : null;
    const all = lane ? [...tells, lane] : tells;
    const safe = (x: number, y: number): boolean => {
      const e = FIELD.edge + 4;
      if (x < e || y < e || x > h.w - e || y > h.h - e) return false;
      // What stands on the field cannot be walked through: a way out that ends in a barricade is no way out.
      if (h.stones.some((st) => dist(x, y, st.x, st.y) < st.r + 14) || h.buildings.some((bd) => dist(x, y, bd.x, bd.y) < bd.def.r + 14)) return false;
      // A web holds whoever walks into it: walked round, as a player would.
      if (h.pools.some((p) => p.def.id === 'web' && p.life > 0 && dist(x, y, p.x, p.y) < p.r + 12)) return false;
      return !all.some((t) => inside(t, x, y, 18));
    };
    const threats = all.filter((t) => inside(t, hu.x, hu.y, 18));
    const dm = dist(hu.x, hu.y, m.x, m.y);
    const open = h.open;
    const [a, b] = hu.abilities;
    const ready = (i: 0 | 1): boolean => this.abilities && hu.waits[i] <= 0 && hu.roll <= 0;

    // ---- the horn
    if (this.horn && h.hornWait <= 0 && m.state !== 'shift') {
      const i = h.calls.findIndex((c) => c.left > 0);
      if (i >= 0) {
        const c = h.calls[i].def;
        // A line of pikes is called where it will stand between; the rest when the monster is near enough to matter.
        if (c.form !== 'line' ? dm < 520 : dm > 150 && dm < 360 && threats.length === 0) steer.call = i;
      }
    }

    // ---- abilities that answer a blow
    if (threats.length) {
      const soonest = threats.reduce((x, y) => (y.left < x.left ? y : x));
      const brace = a.kind === 'brace' ? 0 : b.kind === 'brace' ? 1 : -1;
      // With the halberd ready, a blow of the monster's own is stood against and turned.
      if (brace >= 0 && ready(brace as 0 | 1) && soonest.by === 0 && soonest.left < 0.55 && soonest.left > 0.05 && !soonest.root) {
        steer[brace === 0 ? 'a' : 'b'] = true;
        return steer;
      }
      if (hu.bracing > 0 && soonest.by === 0) return steer;
      const flare = a.kind === 'flare' ? 0 : b.kind === 'flare' ? 1 : -1;
      if (flare >= 0 && ready(flare as 0 | 1) && soonest.by === 0 && m.state === 'tell' && dm < (hu.abilities[flare as 0 | 1].r ?? 0) + m.def.r) steer[flare === 0 ? 'a' : 'b'] = true;
      const seton = a.kind === 'seton' ? 0 : b.kind === 'seton' ? 1 : -1;
      if (seton >= 0 && ready(seton as 0 | 1) && soonest.by === 0 && m.state === 'tell' && h.allies.some((x) => x.group === 'hound' && x.owner === hu.index && x.state !== 'down')) steer[seton === 0 ? 'a' : 'b'] = true;
      const ward = a.kind === 'ward' ? 0 : b.kind === 'ward' ? 1 : -1;
      if (ward >= 0 && ready(ward as 0 | 1) && hu.hp < hu.maxHp * 0.6) steer[ward === 0 ? 'a' : 'b'] = true;
      // Ida's pole puts the boss off a blow it is winding up, if she is in reach of it.
      const shove = a.kind === 'shove' ? 0 : b.kind === 'shove' ? 1 : -1;
      if (shove >= 0 && ready(shove as 0 | 1) && soonest.by === 0 && m.state === 'tell' && dm < (hu.abilities[shove as 0 | 1].r ?? 0) + m.def.r * m.size * 0.6) {
        steer[shove === 0 ? 'a' : 'b'] = true;
        steer.aim = Math.atan2(m.y - hu.y, m.x - hu.x);
        return steer;
      }

      // ---- out of it: the nearest ground nothing is about to land on
      let best: [number, number] | null = null;
      let least = 1e9;
      for (let ring = 1; ring <= 5; ring++) {
        for (let k = 0; k < 16; k++) {
          const ang = (k / 16) * Math.PI * 2;
          const d = ring * 44;
          const x = hu.x + Math.cos(ang) * d;
          const y = hu.y + Math.sin(ang) * d;
          if (!safe(x, y)) continue;
          // Nearer is better; a little is given for not running into the monster's arms or off toward a wall.
          const cost = d + (dist(x, y, m.x, m.y) < m.def.r + 30 ? 80 : 0);
          if (cost < least) [least, best] = [cost, [x, y]];
        }
        if (best) break;
      }
      if (best) {
        const d = dist(hu.x, hu.y, best[0], best[1]) || 1;
        steer.x = (best[0] - hu.x) / d;
        steer.y = (best[1] - hu.y) / d;
        // If walking will not get there before it lands, they roll. Water slows the walk.
        const wet = h.pools.find((p) => p.def.id === 'water' && dist(hu.x, hu.y, p.x, p.y) <= p.r);
        const need = d / (hu.def.speed * (wet ? 1 - (wet.def.share ?? 0) : 1));
        // A roll goes its whole length: not into a narrow safe band and out the other side of it.
        const ends = safe(hu.x + steer.x * hu.def.dodge.dist, hu.y + steer.y * hu.def.dodge.dist);
        if ((need > soonest.left - 0.05 || lane) && hu.rollWait <= 0 && hu.roll <= 0 && soonest.left < 0.45 && (ends || need > soonest.left + 0.3)) steer.dodge = true;
      } else if (hu.rollWait <= 0 && soonest.left < 0.25) {
        // Nowhere to go: a roll on the spot, timed to the blow.
        steer.x = hu.x - m.x;
        steer.y = hu.y - m.y;
        steer.dodge = true;
      }
      return steer;
    }

    // ---- abilities used when nothing is about to land
    for (const i of [0, 1] as const) {
      const s = hu.abilities[i];
      if (!ready(i)) continue;
      const near = h.helpers.filter((f) => dist(f.x, f.y, hu.x, hu.y) < (s.r ?? 0)).length;
      let use = false;
      if (s.kind === 'sweep') use = near >= 2 || (open && dm < (s.r ?? 0) + m.def.r);
      else if (s.kind === 'trap') use = m.state === 'walk' && dm < 300 && dm > 90 && h.traps.length < 2;
      else if (s.kind === 'pool') use = m.state !== 'shift' && m.state !== 'broken' && dm < (s.range ?? 300) && !h.pools.some((p) => p.def.kind === 'pool' && p.def.id === s.id);
      else if (s.kind === 'flare') use = near >= 3;
      else if (s.kind === 'seton') use = open && m.state !== 'broken' ? false : m.state === 'walk' && h.allies.some((x) => x.group === 'hound' && x.owner === hu.index && x.state !== 'down');
      else if (s.kind === 'whistle') use = hu.hp < hu.maxHp * 0.55 || h.allies.some((x) => x.group === 'hound' && x.owner === hu.index && x.state === 'down');
      else use = this.newSkill(h, s, open, dm);
      if (use) {
        steer[i === 0 ? 'a' : 'b'] = true;
        steer.aim = Math.atan2(m.y - hu.y, m.x - hu.x);
      }
    }

    // ---- a fallen one of the party: stand by them until they are up, when nothing is about to land
    const fallen = h.party.find((p) => p.down && p !== hu);
    if (fallen) {
      const d = dist(hu.x, hu.y, fallen.x, fallen.y);
      if (d > 40) {
        steer.x = (fallen.x - hu.x) / d;
        steer.y = (fallen.y - hu.y) / d;
      }
      return steer;
    }

    // ---- what the lair asks of a hunter who knows it: break the sacs and the mirrors, cut down the singing monks,
    // and break a barrel over a boss that runs hot
    const blow = hu.def.combo[0];
    const chore = this.chore(h, open);
    if (chore) {
      const d = dist(hu.x, hu.y, chore.x, chore.y);
      const want = blow.kind === 'bolt' ? blow.reach - 60 : Math.min(blow.reach - 20, 90);
      if (d > want) {
        if (chore.lure) {
          // Not near enough to the boss yet: wait by the barrel, beyond it from the boss, and the boss comes to them
          // past it. Up close for a blow; a bolt's length off for a bow.
          const back = blow.kind === 'bolt' ? 220 : 50;
          const away = Math.atan2(chore.y - m.y, chore.x - m.x);
          const tx = chore.x + Math.cos(away) * back;
          const ty = chore.y + Math.sin(away) * back;
          const dd = dist(hu.x, hu.y, tx, ty);
          if (dd > 12) [steer.x, steer.y] = [(tx - hu.x) / dd, (ty - hu.y) / dd];
          if (dm <= blow.reach + m.def.r * m.size - 10 && !safeLater(h)) {
            steer.attack = true;
            steer.aim = Math.atan2(m.y - hu.y, m.x - hu.x);
          }
          return steer;
        }
        steer.x = (chore.x - hu.x) / d;
        steer.y = (chore.y - hu.y) / d;
      } else if (!chore.lure) {
        steer.attack = true;
        steer.aim = Math.atan2(chore.y - hu.y, chore.x - hu.x);
      }
      if (!chore.lure || d <= want) return steer;
    }

    // ---- a marker the contract asks to be broken: gone for while the boss is busy elsewhere
    const marker = h.tasks.some((t) => t.id === 'markers' && !t.done && !t.failed) && !open
      ? h.helpers.filter((f) => f.marker).reduce<null | { x: number; y: number }>((best, f) => (!best || dist(f.x, f.y, hu.x, hu.y) < dist(best.x, best.y, hu.x, hu.y) ? f : best), null)
      : null;
    if (marker && (this.who === h.party.length - 1 || !this.partner || h.party.length === 1)) {
      const d = dist(hu.x, hu.y, marker.x, marker.y);
      const want = Math.min(blow.reach - 20, 90);
      if (d > want) {
        steer.x = (marker.x - hu.x) / d;
        steer.y = (marker.y - hu.y) / d;
      } else {
        steer.attack = true;
        steer.aim = Math.atan2(marker.y - hu.y, marker.x - hu.x);
      }
      return steer;
    }

    // ---- what the contract asks: who to keep the boss away from, and whether to play safe
    const live = (id: string): boolean => h.tasks.some((t) => t.id === id && !t.done && !t.failed);
    const kept = [
      ...(live('villagers') ? h.allies.filter((x) => x.group === 'villager') : []),
      ...(live('cart') ? h.buildings.filter((x) => x.def.id === 'cart') : []),
    ];
    const guard = kept.length ? { x: kept.reduce((n, k) => n + k.x, 0) / kept.length, y: kept.reduce((n, k) => n + k.y, 0) / kept.length } : null;
    const safeOnly = live('careful') || live('together');

    // ---- where to stand
    const s = hu.def.strike;
    let tx = hu.x;
    let ty = hu.y;
    // A partner goes round the boss to a side of its own, so that the party is not one target.
    const spread = this.partner ? this.side * (0.7 + 0.5 * Math.floor((this.who - 1) / 2)) : 0;
    if (s.kind === 'bolt') {
      // At a distance: far enough for the bolt's bite, and going round rather than straight back into a wall.
      const want = Math.min(s.reach - 40, (s.far?.beyond ?? 200) + 70) + (this.longArm(h) ? 70 : 0);
      // Kept people behind the boss: stand on the far side of it from them, so that it turns and strikes away from them.
      const away = guard ? Math.atan2(m.y - guard.y, m.x - guard.x) : null;
      const ang = (away ?? Math.atan2(hu.y - m.y, hu.x - m.x)) + this.side * 0.25 + spread * 0.3;
      tx = m.x + Math.cos(ang) * want;
      ty = m.y + Math.sin(ang) * want;
      const e = FIELD.edge + 30;
      if (tx < e || ty < e || tx > h.w - e || ty > h.h - e) {
        this.side = -this.side;
        tx = Math.max(e, Math.min(h.w - e, tx));
        ty = Math.max(e, Math.min(h.h - e, ty));
      }
      // Before a charge it likes a stone behind it.
      const stone = this.behind(h);
      if (stone && m.state === 'walk') [tx, ty] = stone;
    } else {
      // Up close: within reach of it, and of a helper if one is nearer.
      // Playing safe, it waits at the edge of reach until the boss is open.
      const want = Math.min(blow.reach, s.reach) + m.def.r * m.size - 22 + (safeOnly && !open ? 60 : 0);
      const away = guard ? Math.atan2(m.y - guard.y, m.x - guard.x) : null;
      const ang = (away ?? Math.atan2(hu.y - m.y, hu.x - m.x)) + (this.partner ? spread * 0.6 : 0);
      tx = m.x + Math.cos(ang) * want;
      ty = m.y + Math.sin(ang) * want;
      const helper = h.helpers.find((f) => !f.def.still && dist(f.x, f.y, hu.x, hu.y) < 150);
      if (helper && !open) {
        tx = helper.x + (hu.x - helper.x) * 0.4;
        ty = helper.y + (hu.y - helper.y) * 0.4;
      }
    }
    // A partner does not stand on top of the player or another of the party.
    if (this.partner) {
      for (const p of h.party) {
        if (p === hu || p.down) continue;
        const d = dist(tx, ty, p.x, p.y);
        if (d < 60) {
          tx += ((tx - p.x) / (d || 1)) * (60 - d);
          ty += ((ty - p.y) / (d || 1)) * (60 - d);
        }
      }
    }
    // A bell in reach is worth standing at while the monster prepares.
    if (m.state === 'tell') {
      const bell = h.buildings.find((x) => x.def.kind === 'bell' && x.cool <= 0 && dist(x.x, x.y, hu.x, hu.y) < 220);
      if (bell && safe(bell.x, bell.y + 40)) [tx, ty] = [bell.x, bell.y + 40];
    }
    const d = dist(hu.x, hu.y, tx, ty);
    if (d > 10 && safe(hu.x + ((tx - hu.x) / d) * 30, hu.y + ((ty - hu.y) / d) * 30)) {
      steer.x = (tx - hu.x) / d;
      steer.y = (ty - hu.y) / d;
    }

    // ---- attack: held while the boss is in reach and nothing is about to land; aimed at it, or at a helper in the way
    const awake = m.state !== 'asleep' && m.state !== 'dead' && m.state !== 'shift';
    const reach = blow.kind === 'bolt' ? blow.reach - 30 : blow.reach + m.def.r * m.size - 10;
    const helperNear = h.helpers.find((f) => !f.def.still && dist(f.x, f.y, hu.x, hu.y) < blow.reach + 10);
    // Playing safe, it attacks only into an opening, or from far off.
    const may = !safeOnly || open || blow.kind === 'bolt';
    // A bow shoots what has come close and is too quick to walk away from: it cannot stand and trade blows with it. The
    // slow it leaves behind.
    const close = blow.kind === 'bolt' ? h.helpers.find((f) => !f.def.still && f.def.speed >= hu.def.speed * 0.5 && dist(f.x, f.y, hu.x, hu.y) < 150) : undefined;
    if (close) {
      steer.attack = true;
      steer.aim = Math.atan2(close.y - hu.y, close.x - hu.x);
    } else if (awake && dm <= reach && may) {
      steer.attack = true;
      steer.aim = Math.atan2(m.y - hu.y, m.x - hu.x);
      // A melee hunter stands to strike: walking out of reach mid-chain wastes the blow.
      if (blow.kind !== 'bolt' && dm < reach - 10) {
        steer.x = 0;
        steer.y = 0;
      }
    } else if (helperNear) {
      steer.attack = true;
      steer.aim = Math.atan2(helperNear.y - hu.y, helperNear.x - hu.x);
    }
    return steer;
  }

  /** When to use one of the skills of the hunters who came later. */
  private newSkill(h: Hunt, s: Hunter['abilities'][number], open: boolean, dm: number): boolean {
    const m = h.monster;
    const body = m.def.r * m.size;
    // Open for a while yet: long enough for something with a fuse.
    const long = (m.state === 'recover' || m.state === 'dazed' || m.state === 'held') && m.left > (s.fuse ?? 0) + 0.2;
    const down = m.state === 'broken' && m.left > (s.fuse ?? 0) + 0.2;
    switch (s.kind) {
      case 'forge':
        return dm < (s.r ?? 120) + body * 0.8 - 10 && (open || m.state === 'walk');
      case 'anvil':
        return (long || down || m.state === 'walk') && Math.abs(dm - (s.range ?? 120)) < (s.r ?? 60) * 0.6 + body * 0.5;
      case 'keg':
        return (long || down) && dm < (s.range ?? 300);
      case 'cavein':
        return (long || down) && dm < (s.range ?? 300) - 20;
      case 'shove':
        return h.helpers.filter((f) => !f.def.still && dist(f.x, f.y, this.me(h).x, this.me(h).y) < (s.r ?? 200) * 0.8).length >= 2;
      case 'wake':
        return m.state !== 'shift' && dm < 420;
      case 'hook':
        return open && dm > 150 && dm < (s.range ?? 320) - 20;
      case 'hack':
        return (open && m.left > 0.6 || m.state === 'broken') && dm < (s.r ?? 100) + body * 0.8 - 12;
      default:
        return false;
    }
  }

  /**
   * Something on the field that is worth going out of the way for: a sac or a mirror while the boss is not open, a
   * monk singing for it, a barrel next to a boss that runs hot. `lure` for a barrel the boss is not yet near: then the
   * hunter waits by it, and the boss comes. In a party only one goes for sacs and mirrors, as a team would share it.
   */
  private chore(h: Hunt, open: boolean): { x: number; y: number; lure: boolean } | null {
    const me = this.me(h);
    const m = h.monster;
    const nearest = <T extends { x: number; y: number }>(list: T[]): T | null => list.reduce<T | null>((b, f) => (!b || dist(f.x, f.y, me.x, me.y) < dist(b.x, b.y, me.x, me.y) ? f : b), null);
    const heat = m.def.heat;
    if (heat && m.heat >= heat.hot) {
      const barrels = h.helpers.filter((f) => f.def.douse);
      const by = barrels.reduce<(typeof barrels)[number] | null>((b, f) => (!b || dist(f.x, f.y, m.x, m.y) < dist(b.x, b.y, m.x, m.y) ? f : b), null);
      if (by) {
        const reach = (by.def.douse?.r ?? 150) + m.def.r * m.size - 30;
        return { x: by.x, y: by.y, lure: dist(by.x, by.y, m.x, m.y) > reach };
      }
    }
    if (open) return null;
    const mine = h.party.length === 1 || this.who === h.party.length - 1;
    const singing = nearest(h.helpers.filter((f) => f.def.heals));
    if (singing && (mine || dist(singing.x, singing.y, me.x, me.y) < 260)) return { x: singing.x, y: singing.y, lure: false };
    // A bow leaves the sacs and mirrors to blades: it would spend the hunt on them.
    const props = h.helpers.filter((f) => f.def.still && !f.marker && (f.def.hatch || f.def.id === 'mirror'));
    const prop = mine && me.def.combo[0].kind !== 'bolt' ? nearest(props) : null;
    if (prop && dist(prop.x, prop.y, me.x, me.y) < 520) return { x: prop.x, y: prop.y, lure: false };
    return null;
  }

  /** True against a boss whose blows reach far from it, from the later four: a bow stands further off. */
  private longArm(h: Hunt): boolean {
    return !!(h.monster.def.props || h.monster.def.shallows || h.monster.def.heat);
  }

  /** A place to stand with a stone or a barricade behind it, on the far side from the monster: what a charge at the hunter would then run into. */
  private behind(h: Hunt): [number, number] | null {
    const m = h.monster;
    const hu = this.me(h);
    const things = [...h.stones.map((s) => ({ x: s.x, y: s.y, r: s.r })), ...h.buildings.filter((b) => b.def.kind === 'wall').map((b) => ({ x: b.x, y: b.y, r: b.def.r }))];
    let best: [number, number] | null = null;
    let least = 1e9;
    for (const t of things) {
      const d = dist(t.x, t.y, m.x, m.y);
      if (d < 200) continue;
      const x = t.x + ((m.x - t.x) / d) * (t.r + 44);
      const y = t.y + ((m.y - t.y) / d) * (t.r + 44);
      const walk = dist(x, y, hu.x, hu.y);
      if (walk < least) [least, best] = [walk, [x, y]];
    }
    return least < 420 ? best : null;
  }
}

import { BUILDINGS } from './content';

function kindOf(id: string): Exclude<BuildingDef['kind'], 'cart'> {
  return (BUILDINGS.find((b) => b.id === id) as BuildingDef).kind as Exclude<BuildingDef['kind'], 'cart'>;
}
