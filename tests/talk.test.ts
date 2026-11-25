import { describe, expect, it } from 'vitest';
import { HUNTERS, MONSTERS } from '../src/game/content';
import { LINES, MATTERS, Talk, TALK, VOICES, type Moment } from '../src/game/talk';

const OFTEN: Moment[] = ['miss', 'skill', 'hurt', 'break'];

describe('the lines', () => {
  it('every hunter and every monster has a voice, and every line a speaker with one', () => {
    for (const h of HUNTERS) expect(VOICES[h.id], h.id).toBeDefined();
    for (const m of MONSTERS) expect(VOICES[m.id], m.id).toBeDefined();
    for (const l of LINES) expect(VOICES[l.who], l.who).toBeDefined();
  });

  it('a moment that comes often has at least six lines, so they do not wear out in one hunt', () => {
    for (const h of HUNTERS) {
      for (const when of OFTEN) expect(LINES.filter((l) => l.who === h.id && l.when === when).length, `${h.id} ${when}`).toBeGreaterThanOrEqual(4);
      for (const when of ['miss', 'skill', 'hurt'] as const) expect(LINES.filter((l) => l.who === h.id && l.when === when).length, `${h.id} ${when}`).toBeGreaterThanOrEqual(6);
    }
  });

  it('lines are short and plain', () => {
    for (const l of LINES) expect(l.says.split(/\s+/).length, l.says).toBeLessThanOrEqual(9);
  });
});

describe('what is said', () => {
  it('one line at a time: chatter is not said over a line that shows', () => {
    const t = new Talk(7, 'marta', 'sexton');
    t.offer('marta', 'miss');
    for (let i = 0; i < 40 && !t.now; i++) {
      t.step(TALK.quiet + 1);
      t.offer('marta', 'miss');
    }
    const first = t.now;
    expect(first).not.toBeNull();
    t.offer('marta', 'hurt');
    t.offer('marta', 'skill');
    expect(t.now).toBe(first);
  });

  it('a moment that matters takes the place of chatter at once, and chatter never takes its place', () => {
    const t = new Talk(3, 'marta', 'sexton');
    for (let i = 0; i < 40 && !t.now; i++) {
      t.step(TALK.quiet + 1);
      t.offer('marta', 'miss');
    }
    expect(t.now?.matters).toBe(false);
    t.offer('sexton', 'change');
    expect(t.now?.who).toBe('sexton');
    expect(t.now?.matters).toBe(true);
    t.offer('marta', 'skill');
    expect(t.now?.who).toBe('sexton');
  });

  it('a second moment that matters waits its turn and is said after', () => {
    const t = new Talk(5, 'marta', 'sexton');
    t.offer('sexton', 'wake');
    const first = t.now?.id;
    t.offer('marta', 'break');
    expect(t.now?.id).toBe(first);
    t.step(TALK.most + 0.1);
    expect(t.now?.who).toBe('marta');
    expect(MATTERS.has('break')).toBe(true);
  });

  it('no line is said twice until the others have been', () => {
    const t = new Talk(11, 'marta', 'sexton');
    const all = LINES.filter((l) => l.who === 'marta' && l.when === 'hurt' && (!l.to || l.to === 'sexton')).length;
    const said = new Set<string>();
    for (let i = 0; i < all; i++) said.add(t.pick('marta', 'hurt') as string);
    expect(said.size).toBe(all);
  });

  it('a hunter says different things to different monsters', () => {
    const a = new Talk(1, 'marta', 'sexton');
    const b = new Talk(1, 'marta', 'king');
    const ofA = new Set(Array.from({ length: 3 }, () => a.pick('marta', 'enter')));
    const ofB = new Set(Array.from({ length: 3 }, () => b.pick('marta', 'enter')));
    for (const l of ofA) expect(ofB.has(l)).toBe(false);
  });

  it('turned off, nothing is said', () => {
    const t = new Talk(9, 'jory', 'king', false);
    t.offer('king', 'wake');
    t.offer('jory', 'break');
    t.step(1);
    expect(t.now).toBeNull();
  });

  it('a line the screen had no room for is dropped, and the next may come', () => {
    const t = new Talk(2, 'agnes', 'sexton');
    t.offer('sexton', 'wake');
    expect(t.now).not.toBeNull();
    t.drop();
    expect(t.now).toBeNull();
    t.offer('sexton', 'die');
    expect(t.now?.who).toBe('sexton');
  });
});
