// npm run pace [-- --runs=12 --monster=sexton --hunter=marta --mark=1 --things --why]
//
// The measure: hunts played by the bot (src/game/bot.ts), and how they
// went. For each monster and mark, with each hunter and the first muster:
// how often the bot wins, how long a won hunt takes, and what kills it.
// `--things` tries each thing that can be brought by itself against each
// monster, beside a hunter who brings nothing, to say what each is worth.
// `--why` adds what did the harm, and who did the harm to the monster.
//
// A change to a number in src/game/content.ts is measured here before and
// after, with twelve runs at the least.

import { BUILDINGS, HUNTERS, MONSTERS, REINFORCEMENTS, type Mark } from '../src/game/content';
import { Bot, type BotOpts } from '../src/game/bot';
import { Hunt, STEP, type Setup, type Tally } from '../src/game/hunt';

const arg = (name: string): string | undefined => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const flag = (name: string): boolean => process.argv.includes(`--${name}`);
const runs = Number(arg('runs') ?? 12);
const monsters = MONSTERS.filter((m) => !arg('monster') || m.id === arg('monster'));
const hunters = HUNTERS.filter((h) => !arg('hunter') || h.id === arg('hunter'));
const marks = ([1, 2, 3] as Mark[]).filter((m) => !arg('mark') || m === Number(arg('mark')));
const careless: BotOpts = flag('careless') ? { react: 0.32, slip: 0.12 } : {};

interface Out {
  won: number;
  time: number;
  tallies: Tally[];
  parts: number;
}

/** Plays a hunt to its end, or for ten minutes. */
export function hunt(setup: Setup, bot: BotOpts = {}): { won: boolean; tally: Tally; part: number } {
  const h = new Hunt(setup);
  const b = new Bot(setup.seed * 7 + 3, bot);
  for (let t = 0; t < 600 + 60 && !h.over; t += STEP) {
    h.step(b.steer(h));
    h.drain();
  }
  return { won: h.over === 'won', tally: h.tally, part: h.monster.part };
}

function measure(base: Omit<Setup, 'seed'>, bot: BotOpts = careless): Out {
  const out: Out = { won: 0, time: 0, tallies: [], parts: 0 };
  for (let i = 0; i < runs; i++) {
    const r = hunt({ ...base, seed: 1000 + i * 37 }, bot);
    if (r.won) {
      out.won++;
      out.time += r.tally.time;
    }
    out.parts += r.part;
    out.tallies.push(r.tally);
  }
  return out;
}

const pct = (n: number): string => `${Math.round((n / runs) * 100)}%`.padStart(4);
const mins = (o: Out): string => (o.won ? `${Math.floor(o.time / o.won / 60)}:${String(Math.round((o.time / o.won) % 60)).padStart(2, '0')}` : '  - ');

function killers(o: Out): string {
  const by: Record<string, number> = {};
  for (const t of o.tallies) if (t.killedBy) by[t.killedBy] = (by[t.killedBy] ?? 0) + 1;
  return Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ') || 'nothing';
}

function shares(o: Out, key: 'dealt' | 'taken'): string {
  const by: Record<string, number> = {};
  let all = 0;
  for (const t of o.tallies) for (const [k, n] of Object.entries(t[key])) {
    by[k] = (by[k] ?? 0) + n;
    all += n;
  }
  return Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${Math.round((n / (all || 1)) * 100)}%`).join(', ');
}

const FIRST = { reinforcements: [{ id: 'pikemen', charges: 1 }], buildings: [{ id: 'barricade', n: 1 }, { id: 'watchfire', n: 1 }] };

if (flag('things')) {
  console.log(`What each thing is worth: ${runs} hunts each, a hunter who brings only that, at the ${arg('mark') ?? 2} mark.`);
  const mark = Number(arg('mark') ?? 2) as Mark;
  for (const m of monsters) {
    for (const h of hunters.slice(0, arg('hunter') ? 1 : 2)) {
      const none = measure({ monster: m.id, mark, hunter: h.id, reinforcements: [], buildings: [] });
      console.log(`\n${m.name}, ${h.short}: with nothing ${pct(none.won)} won, ${mins(none)}, parts got through ${(none.parts / runs).toFixed(1)}`);
      for (const r of REINFORCEMENTS) {
        const o = measure({ monster: m.id, mark, hunter: h.id, reinforcements: [{ id: r.id, charges: r.charges }], buildings: [] });
        console.log(`  ${r.name.padEnd(12)} ${pct(o.won)} won  ${mins(o)}  parts ${(o.parts / runs).toFixed(1)}`);
      }
      for (const b of BUILDINGS) {
        const o = measure({ monster: m.id, mark, hunter: h.id, reinforcements: [], buildings: [{ id: b.id, n: 2 }] });
        console.log(`  ${(b.name + ' x2').padEnd(12)} ${pct(o.won)} won  ${mins(o)}  parts ${(o.parts / runs).toFixed(1)}`);
      }
    }
  }
} else {
  console.log(`${runs} hunts each, the bot${flag('careless') ? ', careless' : ''}, with pikemen, a barricade and a watchfire.`);
  console.log('monster            mark  hunter   won   time  breaks  killed by');
  for (const m of monsters) {
    for (const mark of marks) {
      for (const h of hunters) {
        const o = measure({ monster: m.id, mark, hunter: h.id, ...FIRST });
        const breaks = (o.tallies.reduce((n, t) => n + t.breaks, 0) / runs).toFixed(1);
        console.log(`${m.name.padEnd(18)} ${mark}     ${h.short.padEnd(7)} ${pct(o.won)}  ${mins(o)}   ${breaks.padStart(4)}   ${killers(o)}`);
        if (flag('why')) {
          console.log(`    harm to the hunter: ${shares(o, 'taken')}`);
          console.log(`    harm to the monster: ${shares(o, 'dealt')}`);
        }
      }
    }
  }
}
