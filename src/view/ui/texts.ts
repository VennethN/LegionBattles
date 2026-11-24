// What the lists say a thing does, worked out from its numbers, so that a
// number changed in game/data.ts is a line changed here without anyone
// touching it.

import { BONUS_AT, type CampDef, type FeatDef, type HeroDef, type HonorDef } from '../../game/data';
import { fmt, percent } from '../../game/format';

/** What a camp building does at a level. */
export function campLine(def: CampDef, level: number): string {
  const v = def.per * level;
  switch (def.effect) {
    case 'damage': return `Hero damage +${percent(v)}`;
    case 'gold': return `Gold +${percent(v)}`;
    case 'tap': return `Tap damage +${percent(v)}`;
    case 'volley': return `${v % 1 === 0 ? v : v.toFixed(1)} shots a second`;
    case 'discount': return `Heroes cost ${percent(v)} less`;
    case 'offline': return `Away: +${percent(v)} gold, +${level}h`;
    case 'bossTime': return `+${v}s against bosses`;
    case 'march': return `Enemies come ${percent(v)} sooner`;
  }
}

/** What an honor does at a level. */
export function honorLine(def: HonorDef, level: number): string {
  const v = def.per * level;
  switch (def.effect) {
    case 'damage': return `All damage +${percent(v)}`;
    case 'gold': return `All gold +${percent(v)}`;
    case 'tap': return `Tap damage +${percent(v)}`;
    case 'start': return `Start at stage ${1 + v}`;
    case 'offline': return `Away: +${percent(v)} gold, +${level}h`;
    case 'march': return `Enemies come ${percent(v)} sooner`;
    case 'bossTime': return `+${v}s against bosses`;
    case 'packs': return `Packs: ${percent(v)} sooner and richer`;
  }
}

/** What a hero gives the whole legion from level 25. */
export function bonusLine(def: HeroDef): string {
  const [kind, share] = def.bonus;
  const what = kind === 'damage' ? 'all damage' : kind === 'gold' ? 'gold' : 'tap damage';
  return `Lv ${BONUS_AT}: +${percent(share)} ${what}`;
}

/** What a feat asks for. */
export function featLine(feat: FeatDef): string {
  const n = fmt(feat.need);
  switch (feat.kind) {
    case 'stage': return `Reach stage ${n}`;
    case 'heroes': return `Have ${n} heroes`;
    case 'levels': return `${n} hero levels in one run`;
    case 'taps': return `Strike ${n} times yourself`;
    case 'bosses': return `Bring down ${n} captains and bosses`;
    case 'gold': return `Earn ${n} gold in all`;
    case 'camp': return `${n} camp levels in one run`;
    case 'packs': return `Open ${n} supply packs`;
    case 'rebirths': return `Muster the legion again ${n} times`;
  }
}
