// What is said during a hunt: short lines from the hunter, the monster and
// those who come at the horn, and a word from whoever keeps the board at
// the lodge. They are spice and never a rule: nothing waits for a line, no
// press is asked for, and with the lines turned off the hunt is the same
// hunt.
//
// The lines are a table. `Talk` says when a moment has happened (most are
// events the hunt already tells of), picks a line for it with dice of its
// own, never the hunt's, and holds to three things: one line at a time, a
// few seconds between lines, and a moment that matters (the monster
// changing, the stagger breaking, a death) takes the place of chatter and
// is never dropped for it.
//
// Each monster's story is told in pieces and never in one go: across its
// own lines, its bill on the board, its trophy's words, and what each
// hunter has to say to it. A hunter says different things to different
// monsters, so a second hunter on the same hunt hears new lines.

import type { Ev, Hunt } from './hunt';
import { Rng } from './rng';

/** When a line can be said. */
export type Moment =
  // The hunter.
  | 'enter' | 'sight' | 'miss' | 'skill' | 'hurt' | 'break' | 'kill' | 'fall'
  // The monster.
  | 'wake' | 'change' | 'last' | 'big' | 'reel' | 'die'
  // Those who come at the horn.
  | 'called' | 'warn'
  // Whoever keeps the board.
  | 'taken' | 'trophy';

export interface Line {
  /** Who says it: a hunter, a monster, a reinforcement, or `keeper`. */
  who: string;
  when: Moment;
  /** Who it is said to or about, where that matters: a monster for a hunter's line, a hunter for a monster's. */
  to?: string;
  says: string;
}

/** How a speaker's lines are shown: spoken with their name, or as something heard, with no name, for a monster that does not speak. */
export const VOICES: Record<string, { name: string; heard?: boolean }> = {
  marta: { name: 'Marta' },
  jory: { name: 'Jory' },
  agnes: { name: 'Agnes' },
  brask: { name: 'Brask' },
  sexton: { name: 'The Gravedigger' },
  king: { name: 'The Antlered King', heard: true },
  pikemen: { name: 'Spearman' },
  crossbowmen: { name: 'Crossbowman' },
  sappers: { name: 'Bomber' },
  keeper: { name: 'Hobb' },
};

/** The moments that matter: a line for one of these takes the place of chatter, and chatter never takes its place. */
export const MATTERS: ReadonlySet<Moment> = new Set<Moment>(['wake', 'change', 'last', 'break', 'reel', 'die', 'kill', 'fall']);

/** How often a moment that comes often is spoken to at all: said every time, a line wears out in one hunt. */
const CHANCE: Partial<Record<Moment, number>> = { miss: 0.5, skill: 0.5, hurt: 0.8, big: 0.4, called: 0.9, warn: 0.6, sight: 1, enter: 1 };

/** Seconds a line shows, the least and the most, and the seconds of quiet after one before chatter may come again. */
export const TALK = { least: 2.2, most: 3.2, perLetter: 0.035, quiet: 3.5 };

const L = (who: string, when: Moment, says: string[], to?: string): Line[] => says.map((s) => ({ who, when, says: s, ...(to ? { to } : {}) }));

export const LINES: readonly Line[] = [
  // ---- Marta Voss, the Warden. She kept the gate of Saint Odran's, and the Gravedigger got out on her watch.
  ...L('marta', 'enter', ['Same gate. I still have the key.', 'Eleven years I locked this yard.', 'My watch. My mess.'], 'sexton'),
  ...L('marta', 'sight', ['Tobias. Put the spade down.', 'Still digging. Of course he is.', 'He was my neighbor once.'], 'sexton'),
  ...L('marta', 'enter', ['No gate here. Nothing to lock.', 'Not my yard. Still my job.', 'Cold. Good. Keeps me awake.'], 'king'),
  ...L('marta', 'sight', ['Bigger than the bill said.', 'A crown of antlers. Fine.'], 'king'),
  ...L('marta', 'miss', ['Close.', 'Felt the wind of that.', 'Not today.', 'Saw it coming.', 'My knees felt that one.', 'Missed me.', 'Slow. Still slow.']),
  ...L('marta', 'skill', ['Stopped.', 'The halberd holds.', 'Back you go.', 'That is what gates are for.', 'Mind the blade.', 'Nothing gets past. Not again.']),
  ...L('marta', 'hurt', ['That one counts.', 'I have had worse. Once.', 'Still standing.', 'Ribs. Fine.', 'He hits like a church door.', 'Get up, Marta.']),
  ...L('marta', 'break', ['Down. Now hit him.', 'There. He is open.', 'Now. Everything.', 'On his knees. Good.']),
  ...L('marta', 'kill', ['Rest, Tobias. Someone else will dig.', 'The gate is shut again.'], 'sexton'),
  ...L('marta', 'kill', ['The wood can have him back.', 'Winter is over. Go home.'], 'king'),
  ...L('marta', 'fall', ['He will bury me in my own yard.', 'Lock it. Lock the gate.'], 'sexton'),
  ...L('marta', 'fall', ['Should have kept to gates.', 'So cold.'], 'king'),

  // ---- Jory Pell, the Poacher. He stole from the King's wood as a boy, and ran.
  ...L('jory', 'enter', ['I know this wood. I stole from it.', 'Last time here, I ran.', 'Same snow. Twenty years on.'], 'king'),
  ...L('jory', 'sight', ['He hanged my uncle for a hare.', 'Still wearing the antlers. Vain.', 'I had hoped he was smaller.'], 'king'),
  ...L('jory', 'enter', ['Churchyards. No cover anywhere.', 'Never liked holy ground.', 'Quiet. I do not trust quiet.'], 'sexton'),
  ...L('jory', 'sight', ['That is a very large spade.', 'He does not look paid enough.'], 'sexton'),
  ...L('jory', 'miss', ['Ha! Missed.', 'Too slow.', 'Gamekeepers were quicker.', 'Nearly.', 'That was my good coat.', 'Not close. Fairly close.']),
  ...L('jory', 'skill', ['Mind your step.', 'The trap is sprung.', 'Got you.', 'Stuck, are we?', 'Tar sticks.', 'That will hold him.']),
  ...L('jory', 'hurt', ['Ow. Right.', 'That will bruise.', 'Fine. I am fine.', 'Should have stayed a thief.', 'Less of that.', 'Legs still work.']),
  ...L('jory', 'break', ['He is down! Shoot!', 'Now, while he is stupid.', 'Open. Wide open.', 'There is my shot.']),
  ...L('jory', 'kill', ['That was for the hare.', 'Nobody owns this wood now.'], 'king'),
  ...L('jory', 'kill', ['Someone bury that.', 'He dug his own. Tidy.'], 'sexton'),
  ...L('jory', 'fall', ['Twenty years. Still not fast enough.', 'Uncle. I tried.'], 'king'),
  ...L('jory', 'fall', ['Not the open one. Please.', 'Tell them I nearly had him.'], 'sexton'),

  // ---- Agnes Thorn, the Lamplighter. Her lamps on Church Lane keep going out: he takes the oil.
  ...L('agnes', 'enter', ['Church Lane has been dark a month.', 'He takes my lamp oil. I counted.', 'One lamp. It will do.'], 'sexton'),
  ...L('agnes', 'sight', ['That lantern was mine.', 'Red glass. He painted it.'], 'sexton'),
  ...L('agnes', 'enter', ['No lamp ever reached this wood.', 'Dark at noon. Typical.', 'Somebody has to light it.'], 'king'),
  ...L('agnes', 'sight', ['Eyes like wet coal.', 'He does not like the light.'], 'king'),
  ...L('agnes', 'miss', ['Mind the lamp.', 'Close enough to smell.', 'Steady.', 'Not the lamp. Not the lamp.', 'Missed.', 'I saw that one.']),
  ...L('agnes', 'skill', ['Look at the light.', 'Eyes shut, did you?', 'There. Light.', 'Stand in the light.', 'That is what lamps are for.', 'Bright enough?']),
  ...L('agnes', 'hurt', ['The glass held. I did not.', 'Dim. Not out.', 'That hurt.', 'Still lit.', 'Careless, Agnes.', 'Bleeding. Noted.']),
  ...L('agnes', 'break', ['Blind and down. Hit him.', 'Now. While he blinks.', 'He cannot see you. Go.', 'Down. Good.']),
  ...L('agnes', 'kill', ['I will have my lantern back.', 'Church Lane gets its lamps.'], 'sexton'),
  ...L('agnes', 'kill', ['First light this wood has seen.', 'Morning. At last.'], 'king'),
  ...L('agnes', 'fall', ['Someone light the lane.', 'It is going out.'], 'sexton'),
  ...L('agnes', 'fall', ['Too dark. Too much of it.', 'Keep the lamp. Run.'], 'king'),

  // ---- Old Brask, the Dog Handler. He had three dogs. The King took one.
  ...L('brask', 'enter', ['He took my third dog.', 'Had three dogs once.', 'Quiet, girls. He hears well.'], 'king'),
  ...L('brask', 'sight', ['There he is, girls.', 'That collar in his antlers. That is Pip.'], 'king'),
  ...L('brask', 'enter', ['Bess dug something up here. It moved.', 'Easy, girls. Smell that?', 'No digging. Not here.'], 'sexton'),
  ...L('brask', 'sight', ['That is what they smelled.', 'Big lad. Mind his feet, girls.'], 'sexton'),
  ...L('brask', 'miss', ['Heel! Heel!', 'Too old for this.', 'Missed the dogs too. Good.', 'Close, that.', 'Down, Bess!', 'Nearly had my hat.']),
  ...L('brask', 'skill', ['Take him!', 'Good girls.', 'Hold him there.', 'That is it, Bess.', 'Back to me.', 'Bite and hold.']),
  ...L('brask', 'hurt', ['Leave off!', 'I am up. I am up.', 'Worse than a horse kick.', 'Stay back, girls.', 'Old bones.', 'Not the leg again.']),
  ...L('brask', 'break', ['He is down! Get in!', 'Now, girls, now!', 'On him! All of you!', 'Down he goes.']),
  ...L('brask', 'kill', ['That was for Pip.', 'Fetch the collar, Bess.'], 'king'),
  ...L('brask', 'kill', ['Leave it, Bess. Do not dig.', 'Good girls. Home.'], 'sexton'),
  ...L('brask', 'fall', ['Go home, girls.', 'Run, Bess. Run.'], 'king'),
  ...L('brask', 'fall', ['Do not let him bury the dogs.', 'Go home, girls.'], 'sexton'),

  // ---- The Gravedigger. Tobias Marrow buried a parish through the plague year and was not paid for the last hundred.
  // He mutters about the earth and what it is owed.
  ...L('sexton', 'wake', ['Who walks on my work?', 'The earth is owed.', 'One more to put down.', 'Six hundred graves. Mind your feet.']),
  ...L('sexton', 'wake', ['Warden. You locked me in.', 'Marta. Come to pay me?'], 'marta'),
  ...L('sexton', 'wake', ['Lamp girl. I needed the oil.'], 'agnes'),
  ...L('sexton', 'wake', ['Keep those dogs off my graves.'], 'brask'),
  ...L('sexton', 'change', ['Every grave is paid for. Every one.', 'I dug six hundred. Who thanked me?', 'A hundred unpaid. I counted.']),
  ...L('sexton', 'last', ['No pay? Then I pay the earth myself.', 'It wants them back. All of them.', 'I will dig yours for free.']),
  ...L('sexton', 'big', ['Open up. Open up.', 'Down you go.', 'Room for one more.', 'Up. You owe me.', 'Measure twice. Dig once.', 'Hold still. It is quicker.']),
  ...L('sexton', 'reel', ['My back...', 'The spade. Where is the spade?', 'Still digging. Still digging.', 'Not finished. Not finished.']),
  ...L('sexton', 'die', ['Bury me deep. Do it properly.', 'Who digs for the digger?']),
  ...L('sexton', 'die', ['Shut the gate after, Marta.'], 'marta'),

  // ---- The Antlered King. A lord who hunted his wood empty and hanged those who hunted after him. He does not
  // speak: his lines are what is heard and seen.
  ...L('king', 'wake', ['The bell in his antlers rings once.', 'Snow falls from every branch at once.', 'He stands. The wood goes quiet.', 'Somewhere, a hunting horn. Very old.']),
  ...L('king', 'change', ['Dog collars hang in his antlers.', 'His breath smells of old leaves.', 'Rope marks on every tree here.']),
  ...L('king', 'last', ['The bell rings and does not stop.', 'Under the fur, a lord\'s ring.', 'He is crying. It freezes.']),
  ...L('king', 'big', ['He lowers his head.', 'He paws the snow twice.', 'The trees lean away.', 'The bell rings once.', 'His breath goes still.', 'Hooves. Many hooves.']),
  ...L('king', 'reel', ['The antlers drag in the snow.', 'He kneels like a man would.', 'The bell is quiet.', 'He shakes his head, slowly.']),
  ...L('king', 'die', ['The bell falls. It is only a bell.', 'For a moment he looks like a man.']),

  // ---- Those who come at the horn.
  ...L('pikemen', 'called', ['Spears up!', 'Form a line!', 'Hold here!', 'Points forward!', 'With you!', 'Brace, lads!']),
  ...L('crossbowmen', 'called', ['Loose!', 'Pick your mark.', 'Wind and loose!', 'Eyes on the big one.', 'Do not hit the hunter.', 'From back here, thanks.']),
  ...L('sappers', 'called', ['Where do you want it?', 'One charge, coming up.', 'Stand well back.', 'Short fuse today.']),
  ...L('sappers', 'warn', ['Fire in the hole!', 'Get clear!', 'Fuse is lit!', 'Run, run, run!', 'Mind the bang!', 'Ears!']),

  // ---- Hobb, who keeps the board at the lodge.
  ...L('keeper', 'taken', ['Saint Odran\'s. Bring a spade back.', 'He was a good digger once.', 'Do not fall in anything.'], 'sexton'),
  ...L('keeper', 'taken', ['Harrow Wood. Wear something warm.', 'Do not follow the bell.', 'He was our lord. Was.'], 'king'),
  ...L('keeper', 'taken', ['Sign here. Or make your mark.', 'Pay is on return.', 'Try to come back.']),
  ...L('keeper', 'trophy', ['On the wall it goes.', 'That will draw a crowd.', 'Did not think you would.', 'Wipe it first.']),
];

/** A line being shown. */
export interface Said {
  /** Counts up: a new line has a new number, so that a screen knows it from the last. */
  id: number;
  who: string;
  name: string;
  /** True for something heard and not spoken: shown with no name. */
  heard: boolean;
  says: string;
  /** Seconds it has still to show, and how long it shows in all. */
  left: number;
  of: number;
  matters: boolean;
}

export class Talk {
  /** What is being said now, or nothing. */
  now: Said | null = null;
  on: boolean;

  private readonly rng: Rng;
  /** For each speaker and moment, the lines not yet said since all of them last were. */
  private readonly bags = new Map<string, string[]>();
  private quiet = 0;
  private waiting: { who: string; when: Moment } | null = null;
  private nextId = 1;
  private clock = 0;
  private entered = false;
  private sighted = false;
  private low = false;
  private readonly seenCharges = new Set<number>();
  private last = '';

  constructor(seed: number, private readonly hunter: string, private readonly monster: string, on = true) {
    this.rng = new Rng((seed ^ 0x5bd1e995) >>> 0 || 1);
    this.on = on;
  }

  /** Who a speaker's lines are said to: a hunter speaks to the monster, a monster to the hunter. */
  private toOf(who: string): string {
    return who === this.hunter ? this.monster : who === this.monster ? this.hunter : this.monster;
  }

  /**
   * A line for a speaker at a moment, by the dice, with none said twice until the rest have been. Lines meant for
   * who is spoken to are in with the general ones. Nothing, if the speaker has no line for it.
   */
  pick(who: string, when: Moment): string | null {
    const to = this.toOf(who);
    const key = `${who}/${when}`;
    let bag = this.bags.get(key);
    if (!bag || bag.length === 0) {
      bag = LINES.filter((l) => l.who === who && l.when === when && (!l.to || l.to === to)).map((l) => l.says);
      if (bag.length === 0) return null;
      this.bags.set(key, bag);
    }
    // Not the line just said, where there is another.
    let at = this.rng.int(bag.length);
    if (bag.length > 1 && bag[at] === this.last) at = (at + 1) % bag.length;
    const says = bag.splice(at, 1)[0];
    this.last = says;
    return says;
  }

  /**
   * A moment has happened. Chatter is said only if nothing is being said and the quiet after the last line is over,
   * and then only as often as its chance. A moment that matters takes the place of chatter at once, and waits its
   * turn behind another that matters.
   */
  offer(who: string, when: Moment): void {
    if (!this.on) return;
    const matters = MATTERS.has(when);
    if (!matters) {
      if (this.now || this.quiet > 0) return;
      if (this.rng.next() >= (CHANCE[when] ?? 1)) return;
    } else if (this.now?.matters) {
      // One waits behind the one showing: the later of two that come while it shows.
      this.waiting = { who, when };
      return;
    }
    this.say(who, when);
  }

  private say(who: string, when: Moment): void {
    const says = this.pick(who, when);
    if (!says) return;
    const voice = VOICES[who] ?? { name: who };
    const of = Math.min(TALK.most, TALK.least + says.length * TALK.perLetter);
    this.now = { id: this.nextId++, who, name: voice.name, heard: !!voice.heard, says, left: of, of, matters: MATTERS.has(when) };
  }

  /** The screen had no free place for the line: it is gone, and the next may come. */
  drop(): void {
    this.now = null;
  }

  /** Time passes: a line runs out, the quiet after it runs down, and a moment that waited has its turn. */
  step(dt: number): void {
    this.clock += dt;
    this.quiet = Math.max(0, this.quiet - dt);
    if (this.now) {
      this.now.left -= dt;
      if (this.now.left <= 0) {
        this.now = null;
        this.quiet = TALK.quiet;
      }
    }
    if (!this.now && this.waiting) {
      const w = this.waiting;
      this.waiting = null;
      if (this.on) this.say(w.who, w.when);
    }
  }

  /** Hears what the hunt says happened, and looks at the hunt for the few moments that are not events. */
  hear(events: readonly Ev[], hunt: Hunt): void {
    const h = hunt.hunter;
    const m = hunt.monster;
    if (!this.entered) {
      this.entered = true;
      // In a hunt with no camp the monster's waking is the first thing said: the hunter's line would be talked over.
      if (hunt.phase === 'camp') this.offer(this.hunter, 'enter');
    }
    if (!this.sighted && hunt.phase === 'camp' && this.clock > 3 && Math.hypot(h.x - m.x, h.y - m.y) < 420) {
      this.sighted = true;
      this.offer(this.hunter, 'sight');
    }
    // A sapper's charge is on the ground: the one thing of the hunter's side that is shown before it goes.
    for (const t of hunt.tells) {
      if (t.foe || this.seenCharges.has(t.id)) continue;
      this.seenCharges.add(t.id);
      this.offer('sappers', 'warn');
    }
    for (const e of events) {
      switch (e.t) {
        case 'wake':
          this.offer(this.monster, 'wake');
          break;
        case 'shift':
          this.offer(this.monster, e.part >= hunt.cuts.length ? 'last' : 'change');
          break;
        case 'tell':
          if (e.first && m.attack && isBig(hunt, e.attack)) this.offer(this.monster, 'big');
          break;
        case 'dodged':
          this.offer(this.hunter, 'miss');
          break;
        case 'turned':
          this.offer(this.hunter, 'skill');
          break;
        case 'open':
          if (e.why === 'held' || e.why === 'blind') this.offer(this.hunter, 'skill');
          break;
        case 'hurt':
          if (e.who !== 'hunter') break;
          // Badly hurt: a heavy blow, or the first that takes them under a third.
          if (e.amount >= h.maxHp * 0.16 || (!this.low && h.hp <= h.maxHp * 0.33)) this.offer(this.hunter, 'hurt');
          this.low = h.hp <= h.maxHp * 0.33;
          break;
        case 'broken':
          // The hunter calls it, or the monster is heard: one of the two, by the dice.
          if (this.rng.chance(0.5)) this.offer(this.hunter, 'break');
          else this.offer(this.monster, 'reel');
          break;
        case 'call':
          this.offer(e.id, 'called');
          break;
        case 'fall':
          if (e.who === 'monster') this.offer(this.monster, 'die');
          else if (e.who === 'hunter') this.offer(this.hunter, 'fall');
          break;
      }
    }
  }
}

/** True if an attack is among the monster's heaviest: the top third of what its blows do. */
function isBig(hunt: Hunt, attack: string): boolean {
  const all = hunt.monster.def.attacks;
  const a = all.find((x) => x.id === attack);
  if (!a) return false;
  const sorted = all.map((x) => x.dmg).sort((x, y) => y - x);
  return a.dmg >= sorted[Math.floor(sorted.length / 3)];
}
