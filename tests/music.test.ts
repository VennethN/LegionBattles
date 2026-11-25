import { describe, expect, it } from 'vitest';
import {
  MOMENTS, Music, PIECES, REACH, cellsOf, lengthOf, chordOf, hertz, howOf, huntOf, midiOf, notesIn, pieceFor, plays, secondsOf, slotsOf, soundFor, stepsIn, stepsOf, written,
  type Moment, type Piece, type Voice,
} from '../src/audio/music';
import { Sfx } from '../src/audio/sfx';
import { MONSTERS } from '../src/game/content';
import { Bank, type Instrument } from '../src/audio/bank';
import { fakeAudio, fakeBank, sampled, type FakeAudio } from './audio';

/** A band with a stand-in for the browser's audio under it. */
function band(): { f: FakeAudio; sfx: Sfx; music: Music } {
  const f = fakeAudio();
  const sfx = new Sfx(() => f.ctx);
  return { f, sfx, music: new Music(() => sfx.out) };
}

/** Lets time pass a frame at a time, as the game does. */
function run(f: FakeAudio, music: Music, seconds: number): void {
  const frames = Math.round(seconds * 60);
  for (let i = 0; i < frames; i++) {
    f.clock.t += 1 / 60;
    music.update();
  }
}

/** Every voice of every piece that has pitches, with its piece. */
function pitched(): Array<{ id: string; piece: Piece; voice: Voice }> {
  const out: Array<{ id: string; piece: Piece; voice: Voice }> = [];
  for (const [id, piece] of Object.entries(PIECES)) for (const voice of piece.voices) if (voice.on !== 'drums' && voice.on !== 'wind') out.push({ id, piece, voice });
  return out;
}

/** The pieces of hunts: those with three steps. */
const HUNTS = Object.entries(PIECES).filter(([, p]) => stepsOf(p) === 3);

describe('the pieces', () => {
  it('there is one for the lodge, one for a lair, and a hunt for every monster', () => {
    expect(PIECES.lodge).toBeDefined();
    expect(PIECES.lair).toBeDefined();
    // The first two have their own; the four who came later borrow one until theirs is written.
    for (const m of MONSTERS) {
      expect(stepsOf(PIECES[huntOf(m.id)]), m.id).toBe(3);
      if (PIECES[m.id]) expect(huntOf(m.id), m.id).toBe(m.id);
    }
    for (const id of ['sexton', 'king']) expect(huntOf(id)).toBe(id);
    // A monster that has no piece yet borrows one, so a new monster is never fought in silence.
    expect(PIECES[huntOf('a monster nobody has written for')]).toBeDefined();
    expect(huntOf('lodge')).not.toBe('lodge');
  });

  it('each is written whole: a chord under every bar, every bar of every voice the right length, every cell something its voice can play', () => {
    for (const [id, piece] of Object.entries(PIECES)) {
      expect(piece.chords.length, id).toBe(piece.bars);
      expect(piece.scale.length, id).toBe(7);
      expect(slotsOf(piece), id).toBe(4 * piece.div);
      for (const voice of piece.voices) {
        const what = `${id}: ${voice.name}`;
        // A line goes round a whole number of times.
        expect(piece.bars % voice.line.length, what).toBe(0);
        const cells = cellsOf(piece, voice);
        expect(cells.length, what).toBe(piece.bars * slotsOf(piece));
        if (voice.steps) {
          expect(voice.steps[0], what).toBeLessThanOrEqual(voice.steps[1]);
          expect(voice.steps[1], what).toBeLessThan(stepsOf(piece));
        }
        expect(voice.gain, what).toBeGreaterThan(0);
        expect(voice.gain, what).toBeLessThanOrEqual(1);
        cells.forEach((cell, slot) => {
          if (!cell) return;
          const bar = Math.floor(slot / slotsOf(piece));
          if (voice.on === 'drums') expect(voice.kit?.[cell.text], `${what}: drum "${cell.text}"`).toBeDefined();
          else if (voice.on === 'wind') expect(cell.text, what).toBe('w');
          else expect(() => stepsIn(piece, bar, cell.text), `${what}: "${cell.text}"`).not.toThrow();
        });
        // A voice that never sounds is a mistake.
        expect(cells.some((c) => !!c), what).toBe(true);
      }
    }
    expect(() => cellsOf(PIECES.lodge, { name: 'short', on: 'harp', line: ['0 . .'], gain: 0.1 })).toThrow();
    expect(() => stepsIn(PIECES.lodge, 0, 'k')).toThrow();
  });

  it('a tune agrees with the chords: what lands on the first and third beat is a note of the chord under it', () => {
    let tunes = 0;
    for (const { id, piece, voice } of pitched()) {
      if (!voice.tune) continue;
      tunes++;
      const slots = slotsOf(piece);
      cellsOf(piece, voice).forEach((cell, slot) => {
        if (!cell) return;
        const bar = Math.floor(slot / slots);
        const beat = slot % slots;
        if (beat !== 0 && beat !== slots / 2) return;
        const n = piece.scale.length;
        const chord = chordOf(piece, bar);
        for (const step of stepsIn(piece, bar, cell.text)) {
          expect(chord.some((c) => ((c - step) % n + n) % n === 0), `${id}, ${voice.name}, bar ${bar + 1}, slot ${beat + 1}: step ${step}`).toBe(true);
        }
      });
    }
    expect(tunes).toBeGreaterThanOrEqual(3);
  });

  it('comes home: the last bar is on the first chord, and a tune ends on the root', () => {
    for (const [id, piece] of Object.entries(PIECES)) expect(piece.chords[piece.bars - 1], id).toBe(piece.chords[0]);
    for (const { id, piece, voice } of pitched()) {
      if (!voice.tune) continue;
      const slots = slotsOf(piece);
      const last = cellsOf(piece, voice).slice((piece.bars - 1) * slots).find((c) => !!c);
      expect(last, id).toBeDefined();
      const n = piece.scale.length;
      expect(((stepsIn(piece, piece.bars - 1, last!.text)[0] % n) + n) % n, id).toBe(0);
    }
  });

  it('every note is one its instrument can play: not far from where it was recorded, and not below what a small speaker gives any sign of', () => {
    for (const { id, piece, voice } of pitched()) {
      const on = voice.on as Instrument | 'timpani';
      const slots = slotsOf(piece);
      cellsOf(piece, voice).forEach((cell, slot) => {
        if (!cell) return;
        for (const midi of notesIn(piece, voice, Math.floor(slot / slots), cell.text)) {
          const what = `${id}, ${voice.name}: note ${midi}`;
          const { far } = soundFor(on, midi);
          const [down, up] = REACH[on];
          expect(far, what).toBeGreaterThanOrEqual(-down - 1e-9);
          expect(far, what).toBeLessThanOrEqual(up + 1e-9);
          // The C two octaves under middle C, 65 hertz, is the floor: its overtones are what a phone plays of it.
          expect(midi, what).toBeGreaterThanOrEqual(36);
          expect(hertz(midi), what).toBeLessThan(2000);
          if (voice.range) {
            expect(midi, what).toBeGreaterThanOrEqual(voice.range[0]);
            expect(midi, what).toBeLessThanOrEqual(voice.range[1]);
          }
        }
      });
    }
    // Steps past the scale's end are in the octaves above and below.
    const p = PIECES.lodge;
    expect(midiOf(p, 7)).toBe(midiOf(p, 0) + 12);
    expect(midiOf(p, -1)).toBe(midiOf(p, 6) - 12);
    expect(hertz(69)).toBeCloseTo(440, 6);
    // The kettledrums are between the piano's notes, and the nearer one is played.
    expect(soundFor('timpani', 50).name).toBe('timpani');
    expect(soundFor('timpani', 43).name).toBe('timpani-low');
  });

  it('it is low and dark: a hunt and a lair are in a minor mode, and what carries the tune of a first step is a cello', () => {
    for (const id of ['lair', ...HUNTS.map(([h]) => h)]) {
      // The third of the scale is a minor third.
      expect(PIECES[id].scale[2], id).toBe(3);
    }
    expect(PIECES.lodge.voices.find((v) => v.tune)?.on).toBe('cello');
    expect(PIECES.sexton.voices.find((v) => v.tune)?.on).toBe('cello');
    // The lair is nearly empty: in a round of it, fewer notes begin than it has bars, twice over.
    const lair = PIECES.lair;
    const begun = lair.voices.filter((v) => plays(v, 0)).reduce((n, v) => n + cellsOf(lair, v).filter((c) => !!c).length, 0);
    expect(begun).toBeLessThan(lair.bars * 2);
    // And setting camp adds one voice to it.
    expect(lair.voices.filter((v) => plays(v, 1)).length).toBe(lair.voices.filter((v) => plays(v, 0)).length + 1);
  });

  it('a hunt has three steps, each faster and with more in it than the one before', () => {
    expect(HUNTS.length).toBeGreaterThanOrEqual(2);
    for (const [id, piece] of HUNTS) {
      const notes = (step: number): number => piece.voices.filter((v) => plays(v, step)).reduce((n, v) => n + cellsOf(piece, v).filter((c) => !!c).length, 0);
      const voices = (step: number): number => piece.voices.filter((v) => plays(v, step)).length;
      for (let step = 1; step < 3; step++) {
        expect(piece.bpm[step], `${id}, step ${step + 1}`).toBeGreaterThan(piece.bpm[step - 1]);
        expect(notes(step), `${id}, step ${step + 1}`).toBeGreaterThan(notes(step - 1) * 1.3);
        expect(voices(step), `${id}, step ${step + 1}`).toBeGreaterThan(voices(step - 1));
        expect(secondsOf(piece, step), id).toBeLessThan(secondsOf(piece, step - 1));
      }
      // A higher voice comes in over the tune at a later step, and none of the first step's is a flute.
      const first = piece.voices.filter((v) => plays(v, 0)).map((v) => v.on);
      expect(first, id).not.toContain('flute');
      expect(piece.voices.some((v) => v.on === 'flute' && plays(v, 2)), id).toBe(true);
      // Every step has something that is its own or begins there.
      for (let step = 0; step < 3; step++) expect(piece.voices.some((v) => v.steps?.[0] === step), `${id}, step ${step + 1}`).toBe(true);
    }
    // The two hunts are not the same music: another key, another beat.
    expect(PIECES.sexton.div).not.toBe(PIECES.king.div);
    expect(PIECES.sexton.root).not.toBe(PIECES.king.root);
  });

  it('can be read: a piece is written out in the names of its notes', () => {
    for (const id of Object.keys(PIECES)) {
      const text = written(id);
      expect(text.split('\n').length, id).toBeGreaterThan(PIECES[id].voices.length * 2);
      expect(text).toContain(PIECES[id].says);
    }
    expect(written('sexton')).toContain('D3');
  });

  it('the sister game\'s calls still play something of this game', () => {
    expect(pieceFor('meadow', 'calm')?.id).toBe('lodge');
    expect(pieceFor('meadow', 'battle')?.id).toBe('sexton');
    expect(pieceFor('snow', 'battle')?.id).toBe('king');
    expect(pieceFor('snow', 'calm')?.id).toBe('lair');
    expect(pieceFor('gravedigger', 2)).toEqual({ id: 'sexton', step: 2 });
    expect(pieceFor('nothing', 0)).toBeNull();
  });
});

describe('the band', () => {
  it('plays nothing until the page has been touched, and nothing until it is given a piece', () => {
    const { f, sfx, music } = band();
    music.play('lodge');
    run(f, music, 2);
    expect(f.made.osc).toBe(0);
    sfx.unlock();
    const silent = band();
    silent.sfx.unlock();
    run(silent.f, silent.music, 2);
    expect(silent.f.made.osc).toBe(0);
    run(f, music, 4);
    expect(f.made.osc).toBeGreaterThan(0);
    expect(music.playing).toBe('lodge');
  });

  it('writes every note down ahead of the clock, and none twice', () => {
    for (const [id, piece] of Object.entries(PIECES)) {
      for (let step = 0; step < stepsOf(piece); step++) {
        const { f, sfx, music } = band();
        sfx.unlock();
        music.play(id, step);
        // Twice round. The stand-in fails on a note that is asked to have sounded already.
        run(f, music, secondsOf(piece, step) * 2 + 1);
        const notes = piece.voices.filter((v) => plays(v, step) && v.on !== 'wind').reduce((n, v) => n + cellsOf(piece, v).filter((c) => !!c).length, 0);
        expect(f.made.osc + f.made.noise, `${id}, step ${step + 1}`).toBeGreaterThanOrEqual(notes);
        for (const p of f.pitches) {
          expect(p, id).toBeGreaterThan(28);
          expect(p, id).toBeLessThan(8000);
        }
        // Nothing rings on for longer than the longest note there is, the drone of the lair.
        expect(Math.max(...f.ends) - f.clock.t, id).toBeLessThan(20);
      }
    }
  });

  it('changes step without starting over, and starts over for another piece', () => {
    const { f, sfx, music } = band();
    sfx.unlock();
    music.play('sexton', 0);
    run(f, music, 9);
    const slot = (music as unknown as { slot: number }).slot;
    expect(slot).toBeGreaterThan(8);
    music.play('sexton', 1);
    expect((music as unknown as { slot: number }).slot).toBe(slot);
    expect(music.level).toBe(1);
    // A step it has not got is the nearest it has.
    music.play('sexton', 9);
    expect(music.level).toBe(2);
    music.play('lodge', 3);
    expect(music.level).toBe(0);
    expect((music as unknown as { slot: number }).slot).toBe(0);
    expect(music.playing).toBe('lodge');
    music.stop();
    const before = f.made.osc + f.made.noise;
    run(f, music, 3);
    expect(f.made.osc + f.made.noise).toBe(before);
    expect(music.playing).toBeNull();
    // A name nobody wrote a piece for is silence, not a mistake.
    music.play('lodge');
    music.play('no such piece');
    expect(music.playing).toBeNull();
  });

  it('a later step of a hunt puts more in the air than an earlier one', () => {
    for (const [id] of HUNTS) {
      const made = (step: number): number => {
        const { f, sfx, music } = band();
        sfx.unlock();
        music.play(id, step);
        run(f, music, 20);
        return f.made.osc + f.made.noise;
      };
      expect(made(1), id).toBeGreaterThan(made(0) * 1.4);
      expect(made(2), id).toBeGreaterThan(made(1) * 1.2);
    }
  });

  it('after a sleep it goes on from now, and does not play what it missed all at once', () => {
    const { f, sfx, music } = band();
    sfx.unlock();
    music.play('king', 2);
    run(f, music, 3);
    // The tab was hidden for a minute.
    f.clock.t += 60;
    const before = f.made.osc + f.made.noise;
    music.update();
    expect(f.made.osc + f.made.noise - before).toBeLessThan(40);
  });

  it('makes no note while it cannot be heard, and comes in on time when it can again', () => {
    const { f, sfx, music } = band();
    sfx.unlock();
    music.play('king', 1);
    run(f, music, 2);
    const before = f.made.osc + f.made.noise;
    expect(before).toBeGreaterThan(0);
    // The music turned to nothing in the settings.
    sfx.setVolumes(0.8, 0);
    run(f, music, 5);
    expect(f.made.osc + f.made.noise).toBe(before);
    // All sound off.
    sfx.setVolumes(0.8, 0.5);
    sfx.enabled = false;
    run(f, music, 5);
    expect(f.made.osc + f.made.noise).toBe(before);
    // On again: it goes on from now, with nothing asked to have sounded already (the stand-in fails on that).
    sfx.enabled = true;
    run(f, music, 2);
    expect(f.made.osc + f.made.noise).toBeGreaterThan(before);
  });

  it('turns down for something to be heard over it, and is not thrown by being asked before it plays', () => {
    const { f, sfx, music } = band();
    expect(() => music.duck(1.5)).not.toThrow();
    expect(() => music.moment('break')).not.toThrow();
    sfx.unlock();
    music.play('lair');
    run(f, music, 6);
    expect(() => music.duck(1.5)).not.toThrow();
    run(f, music, 8);
    expect(f.made.osc + f.made.noise).toBeGreaterThan(0);
  });
});

describe('the moments', () => {
  /** A band whose bank is there. */
  function recorded(): { f: FakeAudio; sfx: Sfx; music: Music } {
    const f = fakeAudio();
    const sfx = new Sfx(() => f.ctx, fakeBank());
    return { f, sfx, music: new Music(() => sfx.out) };
  }

  it('each is a few sounds of the bank, said in a line', () => {
    const names = new Set(fakeBank().names());
    for (const [what, sting] of Object.entries(MOMENTS)) {
      expect(sting.says.length, what).toBeGreaterThan(20);
      expect(sting.strokes.length, what).toBeGreaterThan(3);
      for (const s of sting.strokes) {
        expect(s.at, what).toBeGreaterThanOrEqual(0);
        expect(s.at, what).toBeLessThan(6);
        // A sound with no pitch is one of the bank's by name.
        if (s.semi === undefined) expect(names.has(s.on), `${what}: ${s.on}`).toBe(true);
      }
    }
  });

  it('the break is heard over the hunt, which goes on; the two falls end it', () => {
    for (const what of ['break', 'fall', 'lost', 'wake'] as Moment[]) {
      const { f, sfx, music } = recorded();
      sfx.unlock();
      music.play('sexton', 1);
      run(f, music, 4);
      const before = sampled(f).length;
      music.moment(what);
      expect(sampled(f).length - before, what).toBeGreaterThanOrEqual(MOMENTS[what].strokes.length);
      const ends = what === 'fall' || what === 'lost';
      expect(music.playing, what).toBe(ends ? null : 'sexton');
      const then = sampled(f).length;
      run(f, music, 4);
      // After a fall nothing more of the hunt is written down.
      if (ends) expect(sampled(f).length, what).toBe(then);
      else expect(sampled(f).length, what).toBeGreaterThan(then);
      expect(f.made.osc, what).toBe(0);
    }
  });

  it('what plays after a fall waits for the fall to be over', () => {
    const { f, sfx, music } = recorded();
    sfx.unlock();
    music.play('sexton', 2);
    run(f, music, 3);
    music.moment('fall');
    const at = f.clock.t;
    const before = f.sources.length;
    // The game asks for the lodge at once, as it leaves the lair.
    music.play('lodge');
    run(f, music, 12);
    const lodge = f.sources.slice(before);
    expect(lodge.length).toBeGreaterThan(5);
    for (const src of lodge) expect(src.at).toBeGreaterThanOrEqual(at + lengthOf(MOMENTS.fall) - 1.1);
    // The break ends nothing, so nothing waits for it.
    const other = recorded();
    other.sfx.unlock();
    other.music.play('sexton', 0);
    other.music.moment('break');
    const then = other.f.sources.length;
    run(other.f, other.music, 3);
    expect(other.f.sources.length).toBeGreaterThan(then);
  });

  it('a moment is in the key of the hunt it is played over', () => {
    const rates = (id: string): number[] => {
      const { f, sfx, music } = recorded();
      sfx.unlock();
      music.play(id, 0);
      const before = f.sources.length;
      music.moment('fall');
      return f.sources.slice(before).map((s) => s.playbackRate.value);
    };
    expect(rates('sexton')).not.toEqual(rates('king'));
  });

  it('without the bank a moment is made from oscillators, and without a touch it is nothing', () => {
    const { f, sfx, music } = band();
    music.moment('fall');
    expect(f.made.osc).toBe(0);
    sfx.unlock();
    music.play('sexton', 2);
    music.moment('fall');
    expect(f.made.osc).toBeGreaterThan(3);
    expect(music.playing).toBeNull();
  });
});

describe('the band on recorded instruments', () => {
  /** A band whose bank is there. */
  function recorded(bank: Bank = fakeBank()): { f: FakeAudio; sfx: Sfx; music: Music } {
    const f = fakeAudio();
    const sfx = new Sfx(() => f.ctx, bank);
    return { f, sfx, music: new Music(() => sfx.out) };
  }

  /** The names of the bank's sounds a piece plays in a while at a step. */
  function heardIn(id: string, step: number, seconds = 40): string[] {
    const { f, sfx, music } = recorded();
    sfx.unlock();
    music.play(id, step);
    run(f, music, seconds);
    expect(f.made.osc, `${id}, step ${step + 1}`).toBe(0);
    return sampled(f);
  }

  it('plays every piece at every step from the bank, with no oscillator', () => {
    for (const [id, piece] of Object.entries(PIECES)) {
      for (let step = 0; step < stepsOf(piece); step++) {
        const heard = heardIn(id, step, secondsOf(piece, step) + 1);
        expect(heard.length, `${id}, step ${step + 1}`).toBeGreaterThan(id === 'lair' ? 8 : 60);
        // Low strings are under everything.
        expect(heard.some((n) => n.startsWith('cello-')), id).toBe(true);
      }
    }
  });

  it('each piece has its own sound: the bell tolls for the Gravedigger, the horn calls for the King', () => {
    expect(heardIn('sexton', 0)).toContain('bell-72');
    expect(heardIn('sexton', 0).some((n) => n.startsWith('timpani'))).toBe(true);
    expect(heardIn('sexton', 0).some((n) => n.startsWith('horn-'))).toBe(false);
    expect(heardIn('king', 0)).toContain('horn-57');
    expect(heardIn('king', 0)).toContain('tumba');
    expect(heardIn('king', 0)).not.toContain('bell-72');
    // The march has its drums only once it is a march, and the tune of the chase comes with the chase.
    expect(heardIn('sexton', 0)).not.toContain('snare-soft');
    expect(heardIn('sexton', 1)).toContain('snare-soft');
    expect(heardIn('king', 0).some((n) => n.startsWith('oboe-'))).toBe(false);
    expect(heardIn('king', 1).some((n) => n.startsWith('oboe-'))).toBe(true);
    // The lodge has no drum in it at all.
    for (const n of heardIn('lodge', 0, 70)) expect(/^(bdrum|snare|timpani|tumba|conga)/.test(n), n).toBe(false);
  });

  it('a note held longer than its recording is bowed again, not cut off', () => {
    // The lair's drone is three and a half bars of a slow piece: seventeen seconds on one cello note.
    const { f, sfx, music } = recorded();
    sfx.unlock();
    music.play('lair');
    run(f, music, 22);
    const drone = f.sources.filter((s) => (s.buffer as { sample?: string }).sample === 'cello-50' && s.playbackRate.value < 0.51);
    expect(drone.length).toBeGreaterThanOrEqual(3);
    // Each stroke begins before the one before it has ended: no gap between them.
    for (let i = 1; i < drone.length; i++) expect(drone[i].at - drone[i - 1].at).toBeLessThan(3.8 / 0.5);
  });

  it('waits for a bank that is on its way, and starts on the beat when it is in', () => {
    const bank = fakeBank();
    bank.state = 'loading';
    const { f, sfx, music } = recorded(bank);
    sfx.unlock();
    music.play('sexton', 1);
    run(f, music, 3);
    expect(f.sources.length + f.made.osc).toBe(0);
    bank.state = 'ready';
    run(f, music, 2);
    expect(f.made.osc).toBe(0);
    expect(sampled(f).length).toBeGreaterThan(0);
    // Nothing of the three seconds it waited is played late.
    for (const src of f.sources) expect(src.at).toBeGreaterThan(f.clock.t - 2.1);
  });

  it('a device whose bank failed gets the piece from oscillators', () => {
    const bank = new Bank();
    bank.state = 'failed';
    const { f, sfx, music } = recorded(bank);
    sfx.unlock();
    music.play('king', 2);
    run(f, music, 5);
    expect(f.made.osc).toBeGreaterThan(0);
    expect(sampled(f)).toEqual([]);
  });

  it('how a voice plays is its own: strings are held, a harp is struck', () => {
    const lodge = PIECES.lodge;
    expect(howOf(lodge.voices[0])).toBe('bowed');
    expect(howOf(lodge.voices.find((v) => v.on === 'harp')!)).toBe('struck');
    expect(howOf(PIECES.sexton.voices.find((v) => v.name === 'cellos, sawing')!)).toBe('short');
  });
});
