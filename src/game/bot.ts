// A player made of rules, for the measure (scripts/pace.ts) and for the
// scripts that film the game. It plays a hunt decently and no better: it
// sees a tell a moment after it appears, walks out of it, rolls when
// walking will not do, strikes in the openings, and uses what it brought
// when a careful player would. It reads only what a player can see: the
// tells, where things stand, and what is ready.

import type { BuildingDef } from './content';
import { FIELD, CAMP } from './content';
import { inside, type Hunt, type Steer, type Tell } from './hunt';

export interface BotOpts {
  /** Seconds before it sees a tell that has appeared. A careful player is about a quarter of a second. */
  react?: number;
  /** The chance it does not see a tell at all. A careful player misses about one in fourteen. */
  slip?: number;
  /** False for a bot that never uses its abilities, or never blows the horn: to measure what they are worth. */
  abilities?: boolean;
  horn?: boolean;
}

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

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

  constructor(seed = 1, o: BotOpts = {}) {
    this.react = o.react ?? 0.24;
    this.slip = o.slip ?? 0.07;
    this.abilities = o.abilities ?? true;
    this.horn = o.horn ?? true;
    this.dice = seed >>> 0 || 1;
  }

  private roll(): number {
    // Its own small dice: the hunt's are not its to draw from.
    this.dice = (Math.imul(this.dice, 1664525) + 1013904223) >>> 0;
    return this.dice / 0x100000000;
  }

  /** How it is steered now, in camp or in the hunt. */
  steer(h: Hunt): Steer {
    return h.phase === 'camp' ? this.camp(h) : this.fight(h);
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
    const spots: Record<BuildingDef['kind'], Array<{ x: number; y: number }>> = {
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

  private camp(h: Hunt): Steer {
    this.plan ??= this.wanted(h);
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
      if (!t.foe) continue;
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
    const hu = h.hunter;
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
      return !all.some((t) => inside(t, x, y, 18));
    };
    const threats = all.filter((t) => inside(t, hu.x, hu.y, 18));
    const dm = dist(hu.x, hu.y, m.x, m.y);
    const open = h.open;
    const [a, b] = h.skills;
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
      if (flare >= 0 && ready(flare as 0 | 1) && soonest.by === 0 && m.state === 'tell' && dm < (h.skills[flare as 0 | 1].r ?? 0) + m.def.r) steer[flare === 0 ? 'a' : 'b'] = true;
      const seton = a.kind === 'seton' ? 0 : b.kind === 'seton' ? 1 : -1;
      if (seton >= 0 && ready(seton as 0 | 1) && soonest.by === 0 && m.state === 'tell' && h.allies.some((x) => x.group === 'hound' && x.state !== 'down')) steer[seton === 0 ? 'a' : 'b'] = true;
      const ward = a.kind === 'ward' ? 0 : b.kind === 'ward' ? 1 : -1;
      if (ward >= 0 && ready(ward as 0 | 1) && hu.hp < hu.maxHp * 0.6) steer[ward === 0 ? 'a' : 'b'] = true;

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
        // If walking will not get there before it lands, they roll.
        const need = d / hu.def.speed;
        if ((need > soonest.left - 0.05 || lane) && hu.rollWait <= 0 && hu.roll <= 0 && soonest.left < 0.45) steer.dodge = true;
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
      const s = h.skills[i];
      if (!ready(i)) continue;
      const near = h.helpers.filter((f) => dist(f.x, f.y, hu.x, hu.y) < (s.r ?? 0)).length;
      let use = false;
      if (s.kind === 'sweep') use = near >= 2 || (open && dm < (s.r ?? 0) + m.def.r);
      else if (s.kind === 'trap') use = m.state === 'walk' && dm < 300 && dm > 90 && h.traps.length < 2;
      else if (s.kind === 'pool') use = m.state !== 'shift' && m.state !== 'broken' && dm < (s.range ?? 300) && h.pools.length === 0;
      else if (s.kind === 'flare') use = near >= 3;
      else if (s.kind === 'seton') use = open && m.state !== 'broken' ? false : m.state === 'walk' && h.allies.some((x) => x.group === 'hound' && x.state !== 'down');
      else if (s.kind === 'whistle') use = hu.hp < hu.maxHp * 0.55 || h.allies.some((x) => x.group === 'hound' && x.state === 'down');
      if (use) steer[i === 0 ? 'a' : 'b'] = true;
    }

    // ---- where to stand
    const s = hu.def.strike;
    let tx = hu.x;
    let ty = hu.y;
    if (s.kind === 'bolt') {
      // At a distance: far enough for the bolt's bite, and going round rather than straight back into a wall.
      const want = Math.min(s.reach - 40, (s.far?.beyond ?? 200) + 70);
      const ang = Math.atan2(hu.y - m.y, hu.x - m.x) + this.side * 0.25;
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
      const want = s.reach + m.def.r - 16;
      const ang = Math.atan2(hu.y - m.y, hu.x - m.x);
      tx = m.x + Math.cos(ang) * want;
      ty = m.y + Math.sin(ang) * want;
      const helper = h.helpers.find((f) => dist(f.x, f.y, hu.x, hu.y) < 150);
      if (helper && !open) {
        tx = helper.x + (hu.x - helper.x) * 0.4;
        ty = helper.y + (hu.y - helper.y) * 0.4;
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
    return steer;
  }

  /** A place to stand with a stone or a barricade behind it, on the far side from the monster: what a charge at the hunter would then run into. */
  private behind(h: Hunt): [number, number] | null {
    const m = h.monster;
    const hu = h.hunter;
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

function kindOf(id: string): BuildingDef['kind'] {
  return (BUILDINGS.find((b) => b.id === id) as BuildingDef).kind;
}
