// The music of Boss Hunters. A piece is written down as a key, a round of
// chords and a handful of voices, each a line of notes in the steps of the
// scale, and played a note at a time, a third of a second ahead of the
// clock, on the recorded instruments of the bank (audio/bank.ts). There is
// no recording of the music itself, only of its instruments, so a piece
// costs a few lines and can change with the hunt.
//
// It was begun from a sister game whose themes were bright marches and
// dances. The owner played this game with those and said "the music also
// doesnt fit". So nothing of them is left: this is music for a dark lair.
// Low strings, a kettledrum, a bell that tolls, room between the notes.
//
// What there is:
//
//   lodge   between hunts: a slow tune low on a cello over held notes
//   lair    before the monster wakes: almost nothing, so that a player
//           hears their own steps; at step 1, while camp is set, one
//           more voice
//   sexton  the Gravedigger's hunt: a dirge that turns into a march
//   king    the Antlered King's hunt: hooves in the drums, and horns
//
// A hunt's piece has three steps, one for each part of the monster's
// health. A voice says which steps it plays in, and the piece is faster at
// each, so the music says how far the fight has gone without starting
// again: `play('sexton', 1)` goes on from the bar the first step was in.
//
// And moments (`moment`): the stagger breaking, the monster falling, the
// hunter falling, the monster waking. Each is a few notes written in the
// key of whatever is playing.
//
// Where the bank is not there, the same notes are played by oscillators.
//
// Nobody has heard any of this where it was written. It was put together
// by the rules of harmony, rendered to files (scripts/music.mjs) and
// measured, and checked by tests (tests/music.test.ts), which can say a
// note is in the chord under it and cannot say it is good.

import { LENGTHS, nearest, type Instrument } from './bank';
import { sfx, strike, type GainLike, type MusicOut, type ParamLike } from './sfx';

/** The two moods of the sister game's music. Kept so that a call written for it still builds: see `play`. */
export type Mood = 'calm' | 'battle';

/** How a note is played: held under the bow for its length, struck and left to ring, or struck and damped at once. */
export type How = 'bowed' | 'struck' | 'short';

/** What a voice is played on: an instrument of the bank, the kettledrums, a kit of drums, or the wind. */
export type On = Instrument | 'timpani' | 'drums' | 'wind';

export interface Voice {
  /** What it is, for whoever reads the piece. */
  name: string;
  on: On;
  /**
   * Its line, a bar to a string and a cell to a slot. A number is a step of
   * the scale (7 is the root an octave up, -1 the step under it); `c0`,
   * `c2`, `c4` are the root, the third and the fifth of the chord under the
   * bar; two joined by a plus sound together; a dot is a rest; a dash holds
   * what is before it, over the bar line too. On drums a cell is a letter of
   * the kit, and on the wind a `w` is a gust. A line shorter than the piece
   * goes round.
   */
  line: readonly string[];
  /** How loud, where 1 is as loud as the bank holds a sound. */
  gain: number;
  /** Semitones up or down from where the line is written. */
  shift?: number;
  /** The lowest and highest note it plays, as MIDI numbers: a note outside is moved by octaves until it is inside. */
  range?: readonly [number, number];
  how?: How;
  /** The first and last step of a hunt it plays in. Without it, in all. */
  steps?: readonly [number, number];
  /** True for the tune: it is held to the chords by the tests, and every third time round it rests for the first half. */
  tune?: boolean;
  /** For drums: what each letter is struck on, how hard, and how fast it is played. */
  kit?: Readonly<Record<string, readonly [string, number, number?]>>;
}

export interface Piece {
  /** What it is, in a line. */
  says: string;
  /** Beats a minute at each step. A piece with one number has one step. */
  bpm: readonly number[];
  /** Slots to a beat: 2 for eighths, 3 for the lilt of a gallop. A bar is four beats. */
  div: 2 | 3;
  bars: number;
  /** The note the scale starts on, as a MIDI number: 50 is the D below middle C. */
  root: number;
  /** The scale, in semitones from the root. */
  scale: readonly number[];
  /** The chord under each bar, as the step of the scale its root is. Its notes are that step, the third above it and the fifth. */
  chords: readonly number[];
  voices: readonly Voice[];
}

const REST8 = '. . . . . . . .';
const HOLD8 = '- - - - - - - -';
const REST12 = '. . . . . . . . . . . .';

const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];

/** The Gravedigger's dirge: long, short, short, long, as feet behind a coffin go. */
const DIRGE = [
  '0 - - - 0 - - 0', '2 - - - - - 0 -', '2 - - - 2 - - 2', '1 - - - - - - .',
  '0 - - - 0 - - 0', '3 - - - - - 2 -', '1 - - - 1 - - -1', '0 - - - - - - .',
  '5 - - - 7 - 5 -', '6 - - - 3 - 1 -', '4 - - - 2 - 0 -', '0 - - - - - - .',
  '3 - - - 5 - 3 -', '2 - - - 0 - -2 -', '1 - - - -1 - 1 -', '0 - - - - - - .',
];

/** The King's tune: a long note, a snatched one, and a fall, over the gallop. */
const CHASE = [
  '4 - - - - 4 2 - - 0 - -', '2 - - 1 - 2 4 - - - - .', '3 - - - - 3 1 - - -1 - -', '1 - - 0 - 1 3 - - - - .',
  '5 - - - - 5 7 - - 5 - -', '2 - - 3 - 4 5 - - - - .', '4 - - - - 4 6 - - 4 - -', '1 - - - - - 4 - - - - .',
  '7 - - - - 7 4 - - 2 - -', '4 - - 2 - 4 7 - - - - .', '6 - - - - 6 4 - - 2 - -', '4 - - 6 - 4 2 - - - - .',
  '5 - - - - 5 7 - - 5 - -', '6 - - - - 6 3 - - 1 - -', '4 - - 6 - 4 1 - - - - -', '0 - - - - - - - - . . .',
];

/** A hunting horn's call, two bars: three short notes and a long one up the chord, and the answer coming down. */
const CALL = ['c0 . c0 c0 . . c4 - - . . .', 'c4 . c2 c0 - - . . . . . .'];

/** The pieces, by what the game asks for. A hunt's is named by its monster's id (game/content.ts). */
export const PIECES: Readonly<Record<string, Piece>> = {
  lodge: {
    says: 'The lodge: a slow tune low on a cello over held strings, a harp now and then, a bell far off. D dorian.',
    bpm: [60],
    div: 2,
    bars: 16,
    root: 50,
    scale: DORIAN,
    chords: [0, -1, 3, 0, 0, 2, 3, 4, 2, -1, 3, 0, -1, 3, 4, 0],
    voices: [
      { name: 'low strings', on: 'cello', line: ['c0+c4 - - - - - - -'], gain: 0.13, shift: -12, range: [38, 52] },
      {
        name: 'the tune',
        on: 'cello',
        tune: true,
        gain: 0.3,
        line: [
          '0 - - - 2 - 4 -', '3 - - - - - 1 -', '3 - 5 - 7 - 5 -', '4 - - - - - . .',
          '7 - - - 4 - 2 -', '4 - 2 - -1 - - -', '0 - 1 - 3 - 5 -', '4 - - - - - - .',
          '6 - - - 4 - 2 -', '1 - 3 - 6 - 3 -', '5 - - - 3 - 0 -', '2 - - - 0 - - -',
          '-1 - 1 - 3 - 1 -', '3 - - - 5 - 3 -', '4 - 1 - 4 - -1 -', '0 - - - - - - .',
        ],
      },
      { name: 'harp', on: 'harp', how: 'struck', line: ['. . . . c2 . . .', '. . c4 . . . c2 .'], gain: 0.16, range: [52, 67] },
      { name: 'bass', on: 'bass', how: 'struck', line: ['c0 . . . . . . .'], gain: 0.3, shift: -12, range: [36, 49] },
      {
        name: 'a bell far off',
        on: 'bell',
        how: 'struck',
        gain: 0.07,
        shift: 12,
        line: [REST8, REST8, REST8, '. . . . 4 . . .', REST8, REST8, REST8, REST8, REST8, REST8, REST8, '. . . . 4 . . .', REST8, REST8, REST8, REST8],
      },
    ],
  },

  lair: {
    says: 'A lair before its monster wakes: a low drone, single notes with long gaps, a bell, wind. At step 1, while camp is set, a lone cello. D phrygian.',
    bpm: [48, 48],
    div: 2,
    bars: 16,
    root: 50,
    scale: PHRYGIAN,
    chords: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    voices: [
      // Bowed for nearly four bars, and a breath: long enough to be missed, not so long that the music seems to have stopped.
      { name: 'the drone', on: 'cello', line: ['0 - - - - - - -', HOLD8, HOLD8, '- - - - - - . .'], gain: 0.14, shift: -12 },
      {
        name: 'a note over it, now the fifth, now the flat second',
        on: 'cello',
        gain: 0.06,
        line: [REST8, REST8, REST8, REST8, '. . . . 4 - - -', HOLD8, '- - - - . . . .', REST8, REST8, REST8, REST8, REST8, '1 - - - - - - -', '- - - - . . . .', REST8, REST8],
      },
      {
        name: 'single notes',
        on: 'harp',
        how: 'struck',
        gain: 0.28,
        line: [
          REST8, '. . . . 0 . . .', REST8, '. . . . . . 3 .', REST8, '. . 1 . . . . .', REST8, REST8,
          '. . . . 4 . . .', REST8, '0 . . . . . . .', REST8, REST8, '. . . . . . 1 .', '. . . . 0 . . .', REST8,
        ],
      },
      {
        name: 'a bell far off',
        on: 'bell',
        how: 'struck',
        gain: 0.08,
        shift: 12,
        line: [REST8, REST8, REST8, REST8, REST8, REST8, REST8, '0 . . . . . . .', REST8, REST8, REST8, REST8, '. . . . 0 . . .', REST8, REST8, REST8],
      },
      { name: 'wind', on: 'wind', gain: 0.035, line: [REST8, REST8, 'w - - - - - - -', '- - - - - - . .', REST8, REST8, REST8, REST8, REST8, 'w - - - - - - -', '- - - - - - . .', REST8, REST8, REST8, REST8, REST8] },
      {
        name: 'a lone cello, while camp is set',
        on: 'cello',
        steps: [1, 1],
        gain: 0.2,
        line: [
          '4 - - - 3 - - -', '2 - - - 1 - - -', '0 - - - - - - -', REST8, REST8, REST8, REST8, REST8,
          '7 - - - 5 - - -', '4 - - - - - 3 -', '1 - - - 0 - - -', REST8, REST8, REST8, REST8, REST8,
        ],
      },
    ],
  },

  sexton: {
    says: 'The Gravedigger: a dirge on low strings, a kettledrum and a tolling bell; then a march; then all of it, faster. D minor.',
    bpm: [58, 66, 76],
    div: 2,
    bars: 16,
    root: 50,
    scale: MINOR,
    chords: [0, 0, 5, 4, 0, 3, 4, 0, 5, -1, 0, 0, 3, 5, 4, 0],
    voices: [
      { name: 'low strings', on: 'cello', line: ['c0+c4 - - - - - - -'], gain: 0.16, shift: -12, range: [38, 52] },
      { name: 'the dirge', on: 'cello', tune: true, line: DIRGE, gain: 0.42 },
      // The bell is one note, whatever the chord: a bell does not follow the band. It keeps quiet over the one chord it would grate on.
      { name: 'the bell, every eight bars', on: 'bell', how: 'struck', steps: [0, 0], gain: 0.22, shift: 12, line: ['0 . . . . . . .', REST8, REST8, REST8, REST8, REST8, REST8, REST8] },
      { name: 'the bell, every four bars', on: 'bell', how: 'struck', steps: [1, 1], gain: 0.22, shift: 12, line: ['0 . . . . . . .', REST8, REST8, REST8] },
      { name: 'the bell, every two bars', on: 'bell', how: 'struck', steps: [2, 2], gain: 0.22, shift: 12, line: ['0 . . . . . . .', REST8, '0 . . . . . . .', REST8, '0 . . . . . . .', REST8, REST8, REST8] },
      { name: 'kettledrum, once a bar', on: 'timpani', how: 'struck', steps: [0, 0], gain: 0.36, range: [44, 55], line: ['c0 . . . . . . .'] },
      { name: 'kettledrum, a march', on: 'timpani', how: 'struck', steps: [1, 1], gain: 0.32, range: [44, 55], line: ['c0 . . . c0 . . c4'] },
      { name: 'kettledrum, driven', on: 'timpani', how: 'struck', steps: [2, 2], gain: 0.34, range: [44, 55], line: ['c0 . c0 . c0 . c4 c4'] },
      // A bass drum and a snare for the march, and iron struck on stone where his spade would fall.
      {
        name: 'drums of the march',
        on: 'drums',
        steps: [1, 1],
        gain: 1,
        kit: { k: ['bdrum-soft', 0.32], s: ['snare-soft', 0.26], x: ['brake-2', 0.2, 0.6] },
        line: ['k . s . k . s s', 'k . s . k . s s', 'k . s . x . s s', 'k . s . k . s s'],
      },
      {
        name: 'drums, harder',
        on: 'drums',
        steps: [2, 2],
        gain: 1,
        kit: { k: ['bdrum', 0.34], s: ['snare-soft', 0.3], x: ['brake-2', 0.24, 0.6] },
        line: ['k . s s k . s s', 'k . s s x . s s'],
      },
      { name: 'bass, a tread', on: 'bass', how: 'struck', steps: [1, 1], gain: 0.28, shift: -12, range: [36, 49], line: ['c0 . . . c4 . . .'] },
      { name: 'bass, in eighths', on: 'bass', how: 'short', steps: [2, 2], gain: 0.28, shift: -12, range: [36, 49], line: ['c0 . c0 . c4 . c0 .'] },
      { name: 'an oboe over the dirge', on: 'oboe', line: DIRGE, steps: [1, 2], gain: 0.26, shift: 12 },
      { name: 'a flute over that', on: 'flute', line: DIRGE, steps: [2, 2], gain: 0.14, shift: 24 },
      { name: 'cellos, sawing', on: 'cello', how: 'short', steps: [2, 2], gain: 0.2, shift: 0, range: [50, 62], line: ['c0 c0 c0 c0 c0 c0 c0 c0'] },
      { name: 'trumpets on the bar', on: 'trumpet', how: 'struck', steps: [2, 2], gain: 0.2, shift: 12, range: [62, 74], line: ['c0+c4 . . . . . . .'] },
    ],
  },

  king: {
    says: 'The Antlered King: hooves on hand drums and a horn far off; then the chase, with the tune; then all of it, faster. A minor, in threes.',
    bpm: [104, 116, 128],
    div: 3,
    bars: 16,
    root: 57,
    scale: MINOR,
    chords: [0, 0, -1, -1, 5, 5, 4, 4, 0, 0, 2, 2, 5, -1, 4, 0],
    voices: [
      { name: 'hooves, far off', on: 'drums', steps: [0, 0], gain: 1, kit: { t: ['tumba', 0.28], c: ['conga', 0.26] }, line: ['t . c t . . t . c t . .'] },
      { name: 'hooves', on: 'drums', steps: [1, 1], gain: 1, kit: { t: ['tumba', 0.32], c: ['conga', 0.3] }, line: ['t . c t . c t . c t . c'] },
      { name: 'hooves, on wood as well', on: 'drums', steps: [2, 2], gain: 1, kit: { t: ['tumba', 0.34], c: ['conga', 0.32], l: ['logdrum', 0.3] }, line: ['t . c t l c t . c t l c'] },
      { name: 'a drum under them', on: 'drums', steps: [1, 2], gain: 1, kit: { k: ['bdrum-soft', 0.36] }, line: ['k . . . . . k . . . . .'] },
      { name: 'a snare, late', on: 'drums', steps: [2, 2], gain: 1, kit: { s: ['snare-soft', 0.22] }, line: ['. . . s . . . . . s . s'] },
      { name: 'a cymbal at the turn', on: 'drums', steps: [2, 2], gain: 1, kit: { x: ['crash-long', 0.16, 0.8] }, line: ['x . . . . . . . . . . .', REST12, REST12, REST12, REST12, REST12, REST12, REST12] },
      { name: 'low strings', on: 'cello', line: ['c0+c4 - - - - - - - - - - -'], gain: 0.13, shift: -12, range: [45, 57] },
      { name: 'bass, on every beat', on: 'bass', how: 'struck', gain: 0.26, shift: -12, range: [38, 49], line: ['c0 . . c0 . . c0 . . c4 . .'] },
      // The chord's third and fifth, plucked between the beats: what says the key is minor while the tune is not there.
      { name: 'a harp between the beats', on: 'harp', how: 'struck', gain: 0.16, range: [57, 69], line: ['. . c2 . . c4 . . c2 . . c4'] },
      { name: 'the horn, every four bars', on: 'horn', how: 'struck', steps: [0, 0], gain: 0.42, range: [52, 64], line: [...CALL, REST12, REST12] },
      { name: 'the horn, every two bars', on: 'horn', how: 'struck', steps: [1, 2], gain: 0.42, range: [52, 64], line: CALL },
      { name: 'trumpets answer it', on: 'trumpet', how: 'struck', steps: [2, 2], gain: 0.22, shift: 12, range: [62, 74], line: ['. . . . . . . . . c4 . c4', '. . . . . . c0 . c4 c0 - -'] },
      { name: 'the chase, on an oboe', on: 'oboe', tune: true, line: CHASE, steps: [1, 2], gain: 0.26, shift: 12 },
      { name: 'a flute over it', on: 'flute', line: CHASE, steps: [2, 2], gain: 0.1, shift: 24 },
      { name: 'cellos, sawing', on: 'cello', how: 'short', steps: [1, 2], gain: 0.16, shift: -12, range: [45, 57], line: ['c0 . c0 c0 . c0 c0 . c0 c0 . c0'] },
      { name: 'kettledrum', on: 'timpani', how: 'struck', steps: [2, 2], gain: 0.42, range: [44, 55], line: ['c0 . . . . . . . . c4 . c4'] },
      { name: 'wind in the trees', on: 'wind', steps: [0, 0], gain: 0.03, line: ['w - - - - - - - - - - -', '- - - - - - - - - . . .', REST12, REST12] },
    ],
  },
};

/** The moments the music marks. */
export type Moment = 'wake' | 'break' | 'fall' | 'lost';

/** One sound of a moment. */
interface Stroke {
  /** An instrument, the kettledrums, or a sound of the bank by its name. */
  on: Instrument | 'timpani' | (string & {});
  /** For what has a pitch: semitones from the root of whatever is playing. */
  semi?: number;
  /** Seconds after the moment begins. */
  at: number;
  gain: number;
  /** Held this long; without it, it rings to its own end. */
  dur?: number;
  attack?: number;
  release?: number;
  /** For a sound with no pitch: how fast it is played. */
  rate?: number;
}

interface Sting {
  says: string;
  strokes: readonly Stroke[];
  /** What becomes of the piece that was playing: it goes on under the moment, turned down for these seconds, or it stops. */
  then: { duck: number } | 'stop' | 'on';
}

/**
 * The moments. Semitones are from the root of the piece that is playing, so
 * each is in the key of its hunt. A hunt is in a minor key: the break and
 * the fall end on the major chord of the same root, which is the lift.
 */
export const MOMENTS: Readonly<Record<Moment, Sting>> = {
  wake: {
    says: 'It wakes: three strokes of the low kettledrum, each sooner, low strings rising under them a semitone apart, and iron struck at the last.',
    then: 'on',
    strokes: [
      { on: 'timpani', semi: -12, at: 0, gain: 0.3 },
      { on: 'timpani', semi: -12, at: 0.5, gain: 0.4 },
      { on: 'timpani', semi: -12, at: 0.85, gain: 0.55 },
      { on: 'cello', semi: -12, at: 0, gain: 0.3, dur: 1.5, attack: 0.9, release: 0.5 },
      { on: 'cello', semi: -11, at: 0.3, gain: 0.16, dur: 1.2, attack: 0.8, release: 0.5 },
      // An octave up as well, with the note that grates against it: a small speaker has none of the low ones.
      { on: 'cello', semi: 0, at: 0.2, gain: 0.2, dur: 1.3, attack: 0.8, release: 0.5 },
      { on: 'cello', semi: 1, at: 0.4, gain: 0.14, dur: 1.1, attack: 0.7, release: 0.5 },
      { on: 'brake-2', at: 0.85, gain: 0.16, rate: 0.6 },
      { on: 'crash-long', at: 0.85, gain: 0.16, rate: 0.6 },
    ],
  },
  break: {
    says: 'The stagger breaks: a blow on drum and kettledrum, and a chord that lifts to the major, a harp running up it.',
    then: { duck: 2.4 },
    strokes: [
      { on: 'bdrum', at: 0, gain: 0.7 },
      { on: 'timpani', semi: 0, at: 0, gain: 0.55 },
      { on: 'crash', at: 0, gain: 0.2, rate: 0.8 },
      { on: 'cello', semi: -12, at: 0, gain: 0.3, dur: 2.1, attack: 0.03, release: 0.6 },
      { on: 'cello', semi: -5, at: 0, gain: 0.24, dur: 2.1, attack: 0.03, release: 0.6 },
      { on: 'harp', semi: 12, at: 0.02, gain: 0.24 },
      { on: 'harp', semi: 16, at: 0.1, gain: 0.24 },
      { on: 'harp', semi: 19, at: 0.18, gain: 0.24 },
      { on: 'harp', semi: 24, at: 0.26, gain: 0.26 },
      { on: 'oboe', semi: 16, at: 0.2, gain: 0.15, dur: 1.6, attack: 0.5, release: 0.5 },
      { on: 'flute', semi: 19, at: 0.3, gain: 0.1, dur: 1.5, attack: 0.6, release: 0.5 },
    ],
  },
  fall: {
    says: 'The monster falls: the kettledrum, the fourth chord and then home in the major, held, and the bell three times, each softer.',
    then: 'stop',
    strokes: [
      { on: 'timpani', semi: 0, at: 0, gain: 0.55 },
      { on: 'crash-long', at: 0, gain: 0.18, rate: 0.7 },
      { on: 'cello', semi: -7, at: 0, gain: 0.24, dur: 1.9, attack: 0.05, release: 0.5 },
      { on: 'cello', semi: -4, at: 0, gain: 0.2, dur: 1.9, attack: 0.05, release: 0.5 },
      { on: 'cello', semi: 0, at: 0, gain: 0.22, dur: 1.9, attack: 0.05, release: 0.5 },
      { on: 'cello', semi: -12, at: 1.8, gain: 0.26, dur: 4, attack: 0.4, release: 1.4 },
      { on: 'cello', semi: -5, at: 1.8, gain: 0.22, dur: 4, attack: 0.4, release: 1.4 },
      { on: 'cello', semi: 4, at: 1.8, gain: 0.2, dur: 4, attack: 0.4, release: 1.4 },
      { on: 'oboe', semi: 19, at: 2.1, gain: 0.09, dur: 1.6, attack: 0.6, release: 0.6 },
      { on: 'bell', semi: 12, at: 1.8, gain: 0.22 },
      { on: 'bell', semi: 12, at: 3.1, gain: 0.15 },
      { on: 'bell', semi: 12, at: 4.5, gain: 0.09 },
    ],
  },
  lost: {
    says: 'The hunter falls: a cello sinking five notes, each slower and softer, the flat second before the last, and a low drum under the end.',
    then: 'stop',
    strokes: [
      { on: 'cello', semi: 7, at: 0, gain: 0.3, dur: 0.85, attack: 0.05, release: 0.3 },
      { on: 'cello', semi: 5, at: 0.8, gain: 0.27, dur: 0.9, attack: 0.08, release: 0.3 },
      { on: 'cello', semi: 3, at: 1.65, gain: 0.24, dur: 1, attack: 0.1, release: 0.3 },
      { on: 'cello', semi: 1, at: 2.6, gain: 0.21, dur: 1.2, attack: 0.12, release: 0.4 },
      { on: 'cello', semi: -12, at: 3.8, gain: 0.2, dur: 3, attack: 0.4, release: 1.4 },
      { on: 'timpani', semi: -12, at: 3.8, gain: 0.32 },
    ],
  },
};

/**
 * What the sister game's calls come to here, so that a call nobody has
 * rewritten yet plays something of this game and not nothing: a land's
 * name, calm and in a battle.
 */
const OLD: Readonly<Record<string, readonly [string, string]>> = {
  meadow: ['lodge', 'sexton'],
  desert: ['lair', 'sexton'],
  snow: ['lair', 'king'],
};
/** Other names a hunt's piece is asked for by. */
const ALSO: Readonly<Record<string, string>> = { gravedigger: 'sexton' };
/** The hunt of a monster that has no piece of its own yet. */
const ANY_HUNT = 'sexton';

/** The pitch of the two kettledrums of the bank, as MIDI numbers: neither is on a note of the piano. Measured (scripts/music.mjs says how). */
const KETTLES: ReadonlyArray<readonly [string, number]> = [['timpani', 49.5], ['timpani-low', 41.5]];

/**
 * How far from where it was recorded each instrument may be played, in
 * semitones down and up. A cello an octave down is slow and dark, which is
 * wanted here; an oboe an octave down is no oboe.
 */
export const REACH: Readonly<Record<string, readonly [number, number]>> = {
  cello: [12, 7],
  bass: [5, 7],
  harp: [5, 7],
  bell: [12, 5],
  oboe: [5, 7],
  flute: [5, 7],
  horn: [5, 7],
  trumpet: [5, 7],
  glock: [5, 7],
  pizz: [7, 7],
  timpani: [6, 6],
};

/** How many slots a bar of a piece has. */
export function slotsOf(piece: Piece): number {
  return 4 * piece.div;
}

/** How many steps a piece has. */
export function stepsOf(piece: Piece): number {
  return piece.bpm.length;
}

/** Whether a voice plays at a step. */
export function plays(voice: Voice, step: number): boolean {
  return !voice.steps || (step >= voice.steps[0] && step <= voice.steps[1]);
}

/** How long a piece is once round at a step, in seconds. */
export function secondsOf(piece: Piece, step = 0): number {
  return (piece.bars * 4 * 60) / piece.bpm[Math.min(step, piece.bpm.length - 1)];
}

/** What starts on a slot of a voice: its cell as written, and how many slots it is held. */
export interface Cell {
  text: string;
  slots: number;
}

/** A voice's line laid out over the whole piece, a slot to an entry: what starts there, or nothing. */
export function cellsOf(piece: Piece, voice: Voice): Array<Cell | null> {
  const slots = slotsOf(piece);
  const out: Array<Cell | null> = [];
  let held: Cell | null = null;
  for (let bar = 0; bar < piece.bars; bar++) {
    const text = voice.line[bar % voice.line.length];
    const cells = text.split(' ');
    if (cells.length !== slots) throw new Error(`music: "${voice.name}", bar ${(bar % voice.line.length) + 1} has ${cells.length} cells, not ${slots}`);
    for (const cell of cells) {
      if (cell === '-') {
        if (held) held.slots++;
        out.push(null);
      } else if (cell === '.') {
        held = null;
        out.push(null);
      } else {
        held = { text: cell, slots: 1 };
        out.push(held);
      }
    }
  }
  return out;
}

/** The pitch of a step of a piece's scale, as a MIDI number. Steps past the scale's end are in the octaves above and below. */
export function midiOf(piece: Piece, step: number): number {
  const n = piece.scale.length;
  const octave = Math.floor(step / n);
  return piece.root + octave * 12 + piece.scale[step - octave * n];
}

export function hertz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** The three steps of the scale a bar's chord is made of. */
export function chordOf(piece: Piece, bar: number): [number, number, number] {
  const r = piece.chords[bar % piece.chords.length];
  return [r, r + 2, r + 4];
}

/** The steps of the scale a cell of a pitched voice names, in a bar. Throws on a cell that names none. */
export function stepsIn(piece: Piece, bar: number, text: string): number[] {
  return text.split('+').map((part) => {
    const chord = part.startsWith('c');
    const n = Number(chord ? part.slice(1) : part);
    if (!Number.isInteger(n) || part === '' || (chord && part.length < 2)) throw new Error(`music: "${text}" names no step of the scale`);
    return chord ? piece.chords[bar % piece.chords.length] + n : n;
  });
}

/** The notes a cell of a pitched voice sounds, as MIDI numbers: shifted, and moved by octaves into the voice's range. */
export function notesIn(piece: Piece, voice: Voice, bar: number, text: string): number[] {
  return stepsIn(piece, bar, text).map((step) => {
    let m = midiOf(piece, step) + (voice.shift ?? 0);
    if (voice.range) {
      while (m < voice.range[0]) m += 12;
      while (m > voice.range[1]) m -= 12;
    }
    return m;
  });
}

/** The recorded sound nearest a pitch on an instrument or the kettledrums, how fast to play it, and how many semitones from its own pitch that is. */
export function soundFor(on: Instrument | 'timpani', midi: number): { name: string; rate: number; far: number } {
  if (on === 'timpani') {
    let best = KETTLES[0];
    for (const k of KETTLES) if (Math.abs(k[1] - midi) < Math.abs(best[1] - midi)) best = k;
    return { name: best[0], rate: Math.pow(2, (midi - best[1]) / 12), far: midi - best[1] };
  }
  const near = nearest(on, midi);
  return { ...near, far: 12 * Math.log2(near.rate) };
}

/** How a voice plays its notes, where it does not say: what is bowed or blown is held, everything else is struck. */
export function howOf(voice: Voice): How {
  return voice.how ?? (voice.on === 'cello' || voice.on === 'oboe' || voice.on === 'flute' ? 'bowed' : 'struck');
}

/** The piece a name asks for, and the step: this game's names, and the sister game's lands and moods. */
export function pieceFor(id: string, level: number | Mood): { id: string; step: number } | null {
  const old = OLD[id];
  if (old) return { id: typeof level === 'string' ? old[level === 'battle' ? 1 : 0] : old[0], step: typeof level === 'number' ? level : 0 };
  const name = ALSO[id] ?? id;
  const step = typeof level === 'number' ? level : 0;
  if (PIECES[name]) return { id: name, step };
  return null;
}

/** The piece of a monster's hunt: its own, or the one every monster without one borrows. */
export function huntOf(monster: string): string {
  const name = ALSO[monster] ?? monster;
  return PIECES[name] && stepsOf(PIECES[name]) >= 3 ? name : ANY_HUNT;
}

/** A piece written out for a person to read: its key, its chords, and every voice with the steps it plays in. */
export function written(id: string): string {
  const piece = PIECES[id];
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const note = (m: number): string => `${names[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;
  const lines = [`${id}: ${piece.says}`, `  ${piece.bars} bars of four beats, ${piece.div === 3 ? 'in threes' : 'in eighths'}; ${piece.bpm.join(', then ')} beats a minute; root ${note(piece.root)}`];
  lines.push(`  chords, a bar each: ${piece.chords.map((c) => note(midiOf(piece, c))).join(' ')}`);
  for (const voice of piece.voices) {
    const when = voice.steps ? (voice.steps[0] === voice.steps[1] ? `step ${voice.steps[0] + 1}` : `steps ${voice.steps[0] + 1} to ${voice.steps[1] + 1}`) : 'every step';
    lines.push(`  ${voice.name} (${voice.on}, ${when}):`);
    const cells = cellsOf(piece, voice);
    const slots = slotsOf(piece);
    for (let bar = 0; bar < Math.min(piece.bars, voice.line.length); bar++) {
      const out: string[] = [];
      for (let s = 0; s < slots; s++) {
        const cell = cells[bar * slots + s];
        if (!cell) out.push(voice.line[bar].split(' ')[s] === '-' ? '-' : '.');
        else if (voice.on === 'drums' || voice.on === 'wind') out.push(cell.text);
        else out.push(notesIn(piece, voice, bar, cell.text).map(note).join('+'));
      }
      lines.push(`    ${String(bar + 1).padStart(2)}  ${out.join(' ')}`);
    }
  }
  return lines.join('\n');
}

/** How long a moment is, in seconds: to the end of its last held note, or a second and a half after its last struck one. */
export function lengthOf(sting: { strokes: readonly { at: number; dur?: number }[] }): number {
  return Math.max(...sting.strokes.map((s) => s.at + (s.dur ?? 1.5)));
}

/** How far ahead of the clock notes are written down, in seconds. Frames may come late: the music must not. */
const AHEAD = 0.3;

type Out = MusicOut;

/** How loud the whole band is, as a share of what the numbers under it add up to. Set by measuring (scripts/music.mjs). */
const BAND = 0.8;
/** How long a piece takes to die away when another takes its place or it is stopped, in seconds. */
const FADE = 0.9;

export class Music {
  private id: string | null = null;
  private piece: Piece | null = null;
  private cells: Array<Array<Cell | null>> = [];
  private step = 0;
  /** The next slot to be written down, the time it sounds at, and how many times the piece has gone round. */
  private slot = 0;
  private at = 0;
  private round = 0;
  /** Everything of the music goes through `bus`; a piece's own notes through `loop` under it, so that it can die away while a moment sounds. */
  private bus: GainLike | null = null;
  private loop: GainLike | null = null;
  private duckedUntil = 0;
  /** A moment that ended a piece is still sounding until then: what plays next waits for it. */
  private restUntil = 0;

  /** `out` gives what to play through, once there is anything (Sfx.out). */
  constructor(private readonly out: () => Out | null) {}

  /** What is playing: a piece's name, or nothing. */
  get playing(): string | null {
    return this.id;
  }

  /** The step of the hunt it is at. */
  get level(): number {
    return this.step;
  }

  /**
   * Plays a piece at a step: `play('lodge')`, `play('lair')`, `play('lair', 1)`
   * while camp is set, `play('sexton', 0)` to `play('sexton', 2)` for the
   * three parts of a hunt. A piece already playing goes on from where it is:
   * only its step changes. A name it does not know is silence.
   *
   * A land and a mood, as the sister game called it, still play: see OLD.
   */
  play(id: string, level: number | Mood = 0): void {
    const want = pieceFor(id, level);
    if (!want) {
      this.stop();
      return;
    }
    const piece = PIECES[want.id];
    this.step = Math.max(0, Math.min(stepsOf(piece) - 1, Math.floor(want.step)));
    if (piece === this.piece) return;
    this.fade();
    this.id = want.id;
    this.piece = piece;
    this.cells = piece.voices.map((v) => cellsOf(piece, v));
    this.slot = 0;
    this.round = 0;
    // The old piece's last notes die away; the new one starts after a breath, or when the moment that ended the old one has had its say.
    const o = this.out();
    this.at = o ? Math.max(o.ctx.currentTime + 0.4, this.restUntil) : 0;
  }

  /** The piece stops, dying away. */
  stop(): void {
    this.fade();
    this.id = null;
    this.piece = null;
  }

  /**
   * A moment of the hunt. It is played over whatever is playing, in its key.
   * The break turns the piece down under it for a moment; the fall and the
   * hunter's fall end the piece.
   */
  moment(what: Moment): void {
    const sting = MOMENTS[what];
    const root = this.piece ? this.piece.root : 50;
    const o = this.out();
    if (o && o.bank.state !== 'loading') {
      try {
        const bus = this.wire(o);
        const t = o.ctx.currentTime + 0.03;
        for (const s of sting.strokes) this.stroke(o, bus, s, root, t);
        if (sting.then === 'stop') this.restUntil = t + lengthOf(sting) - 1;
        else if (sting.then !== 'on') this.under(o, sting.then.duck);
      } catch {
        // A moment that cannot be made is passed over.
      }
    }
    if (sting.then === 'stop') this.stop();
  }

  /**
   * Turns the music down for a moment, for something to be heard over it.
   * It comes back by itself.
   */
  duck(seconds: number): void {
    const o = this.out();
    const bus = this.bus;
    if (!o || !bus) return;
    const t = o.ctx.currentTime;
    if (t < this.duckedUntil) return;
    this.duckedUntil = t + seconds;
    try {
      bus.gain.setValueAtTime(1, t);
      bus.gain.linearRampToValueAtTime(0.3, t + 0.08);
      bus.gain.setValueAtTime(0.3, t + Math.max(0.1, seconds - 0.5));
      bus.gain.linearRampToValueAtTime(1, t + seconds);
    } catch {
      // It stays as loud as it was.
    }
  }

  /** Writes down whatever is due. The game calls this every frame; it makes nothing unless a note is due. */
  update(): void {
    const piece = this.piece;
    if (!piece) return;
    const o = this.out();
    if (!o) return;
    // The band is on its way: better a moment of quiet than a piece that changes its instruments halfway through a bar.
    if (o.bank.state === 'loading') return;
    const now = o.ctx.currentTime;
    // The first notes after the page is touched, or after a long sleep: start from now, not from then.
    if (this.at < now - 0.05) this.at = now + 0.1;
    if (this.at >= now + AHEAD) return;
    try {
      const to = this.line(o);
      const slots = slotsOf(piece);
      while (this.at < now + AHEAD) {
        // The tempo is asked for at every slot: a step that comes in the middle of a bar quickens it there.
        const slotTime = 60 / piece.bpm[Math.min(this.step, piece.bpm.length - 1)] / piece.div;
        this.write(o, to, piece, this.slot, this.at, slotTime);
        this.at += slotTime;
        this.slot++;
        if (this.slot >= piece.bars * slots) {
          this.slot = 0;
          this.round++;
        }
      }
    } catch {
      // A note that cannot be made is skipped, and the next is tried in its turn.
      this.at = now + AHEAD;
    }
  }

  /** The one gain all of the music goes through, made at the first note, with a filter that keeps it under the effects. */
  private wire(o: Out): GainLike {
    if (!this.bus) {
      this.bus = o.ctx.createGain();
      const soft = o.ctx.createBiquadFilter();
      soft.type = 'lowpass';
      // Oscillators are harsh at the top and are cut lower than recorded instruments, which lose their air there.
      soft.frequency.value = o.bank.state === 'ready' ? 8000 : 4200;
      soft.Q.value = 0.5;
      this.bus.connect(soft);
      const trim = o.ctx.createGain();
      trim.gain.value = o.bank.state === 'ready' ? BAND : 1;
      soft.connect(trim);
      trim.connect(o.music);
    }
    return this.bus;
  }

  /** What the playing piece's own notes go through. */
  private line(o: Out): GainLike {
    if (!this.loop) {
      this.loop = o.ctx.createGain();
      this.loop.gain.value = 1;
      this.loop.connect(this.wire(o));
    }
    return this.loop;
  }

  /** The playing piece dies away, with every note of it already written down, and what plays next gets a gain of its own. */
  private fade(): void {
    const loop = this.loop;
    this.loop = null;
    const o = this.out();
    if (!loop || !o) return;
    try {
      const t = o.ctx.currentTime;
      loop.gain.setValueAtTime(1, t);
      loop.gain.linearRampToValueAtTime(0.0001, t + FADE);
    } catch {
      // It rings out as it is.
    }
  }

  /** The playing piece is turned down under a moment, and comes back. */
  private under(o: Out, seconds: number): void {
    const loop = this.loop;
    if (!loop) return;
    const t = o.ctx.currentTime;
    loop.gain.setValueAtTime(1, t);
    loop.gain.linearRampToValueAtTime(0.25, t + 0.06);
    loop.gain.setValueAtTime(0.25, t + Math.max(0.1, seconds - 0.7));
    loop.gain.linearRampToValueAtTime(1, t + seconds);
  }

  /** Everything that starts on one slot. */
  private write(o: Out, to: GainLike, piece: Piece, slot: number, t: number, slotTime: number): void {
    const slots = slotsOf(piece);
    const bar = Math.floor(slot / slots);
    const recorded = o.bank.state === 'ready';
    for (let v = 0; v < piece.voices.length; v++) {
      const voice = piece.voices[v];
      if (!plays(voice, this.step)) continue;
      const cell = this.cells[v][slot];
      if (!cell) continue;
      // So that sixteen bars do not wear thin, every third time round the tune rests for the first half.
      if (voice.tune && this.round % 3 === 2 && bar < piece.bars / 2) continue;
      const dur = cell.slots * slotTime;
      if (voice.on === 'drums') {
        const drum = voice.kit?.[cell.text];
        if (!drum) continue;
        const sample = recorded ? o.bank.get(drum[0]) : undefined;
        if (sample) strike(o.ctx, to, sample, t, drum[1] * voice.gain, drum[2] ?? 1);
        else if (!recorded) this.drum(o, to, drum[0], t, drum[1] * voice.gain);
      } else if (voice.on === 'wind') {
        this.wind(o, to, t, dur, voice.gain);
      } else {
        const how = howOf(voice);
        for (const midi of notesIn(piece, voice, bar, cell.text)) {
          if (recorded) this.sound(o, to, voice.on, midi, t, voice.gain, how, dur);
          else this.made(o, to, voice.on, midi, t, voice.gain, how, dur);
        }
      }
    }
  }

  /** A note on the bank's instruments, played as the voice plays. */
  private sound(o: Out, to: GainLike, on: Instrument | 'timpani', midi: number, t: number, gain: number, how: How, dur: number): void {
    if (how === 'struck') this.note(o, to, on, midi, t, gain);
    else if (how === 'short') this.note(o, to, on, midi, t, gain, Math.min(dur * 0.8, 0.22), 0.004, 0.07);
    else this.bow(o, to, on, midi, t, gain, dur * 0.96, Math.min(0.3, dur * 0.25), Math.min(0.4, dur * 0.3));
  }

  /** A note on one of the bank's instruments. Without `dur` it rings to its own end. */
  private note(o: Out, to: GainLike, on: Instrument | 'timpani', midi: number, t: number, gain: number, dur?: number, attack = 0, release = 0.06): void {
    const { name, rate } = soundFor(on, midi);
    const sample = o.bank.get(name);
    if (sample) strike(o.ctx, to, sample, t, gain, rate, dur, release, attack);
  }

  /**
   * A held note. A recording is only so long, and a slow one played low is
   * longer but still ends: a note held past its recording is bowed again,
   * each stroke coming in as the last goes out.
   */
  private bow(o: Out, to: GainLike, on: Instrument | 'timpani', midi: number, t: number, gain: number, dur: number, attack: number, release: number): void {
    const { rate } = soundFor(on, midi);
    const whole = (LENGTHS[on] ?? 1.5) / rate - 0.15;
    const lap = 0.45;
    if (dur + release <= whole || whole <= lap * 2) {
      this.note(o, to, on, midi, t, gain, Math.min(dur, Math.max(0.05, whole - release)), attack, release);
      return;
    }
    const stride = whole - lap;
    for (let from = 0; from < dur - 0.05; from += stride) {
      const last = from + stride >= dur - 0.05;
      const len = last ? dur - from : stride;
      this.note(o, to, on, midi, t + from, gain, len, from === 0 ? attack : lap, last ? release : lap);
    }
  }

  /** One sound of a moment. */
  private stroke(o: Out, to: GainLike, s: Stroke, root: number, t: number): void {
    const at = t + s.at;
    const pitched = s.semi !== undefined;
    if (o.bank.state !== 'ready') {
      if (pitched) this.made(o, to, s.on as Instrument, root + (s.semi as number), at, s.gain, s.dur === undefined ? 'struck' : 'bowed', s.dur ?? 1);
      else this.drum(o, to, s.on, at, s.gain);
      return;
    }
    if (!pitched) {
      const sample = o.bank.get(s.on);
      if (sample) strike(o.ctx, to, sample, at, s.gain, s.rate ?? 1);
      return;
    }
    const on = s.on as Instrument | 'timpani';
    let midi = root + (s.semi as number);
    // A kettledrum is brought to where a kettledrum can go.
    if (on === 'timpani') {
      while (midi < 38) midi += 12;
      while (midi > 55) midi -= 12;
    }
    if (s.dur === undefined) this.note(o, to, on, midi, at, s.gain);
    else this.bow(o, to, on, midi, at, s.gain, s.dur, s.attack ?? 0.05, s.release ?? 0.3);
  }

  /** A gust: noise through a filter that opens and closes, coming and going over its length. */
  private wind(o: Out, to: GainLike, t: number, dur: number, gain: number): void {
    const src = o.ctx.createBufferSource();
    const f = o.ctx.createBiquadFilter();
    const g = o.ctx.createGain();
    src.buffer = o.noise;
    // The noise is a second long: it goes round for as long as the gust lasts.
    src.loop = true;
    f.type = 'bandpass';
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(260, t);
    f.frequency.linearRampToValueAtTime(620, t + dur * 0.45);
    f.frequency.linearRampToValueAtTime(320, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, gain), t + dur * 0.45);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(to);
    src.start(t, 0);
    src.stop(t + dur + 0.05);
  }

  // ------------------------------------------------------------ without the bank

  /** A note of a voice made from oscillators, where there is no recording to play: low and plain, as near the instrument as two waves come. */
  private made(o: Out, to: GainLike, on: Instrument | 'timpani', midi: number, t: number, gain: number, how: How, dur: number): void {
    const hz = hertz(midi);
    const peak = gain * 0.3;
    if (on === 'timpani') {
      this.thump(o, to, hz * 1.6, hz, t, peak * 1.4, 0.5);
    } else if (how === 'bowed') {
      this.tone(o, to, on === 'flute' ? 'sine' : 'triangle', hz, t, dur, peak, Math.min(0.3, dur * 0.25), Math.min(0.4, dur * 0.3));
      if (on === 'oboe') this.tone(o, to, 'square', hz, t, dur, peak * 0.25, 0.05, 0.1);
    } else if (how === 'short') {
      this.tone(o, to, 'triangle', hz, t, Math.min(dur * 0.8, 0.2), peak, 0.006, 0.06);
    } else {
      // Struck and left to die away: the note, and for a bell a quiet one over it.
      this.pluck(o, to, hz, t, peak, on === 'bell' ? 2.4 : on === 'harp' ? 1.1 : 0.5);
      if (on === 'bell') this.pluck(o, to, hz * 2.76, t, peak * 0.25, 1.2);
    }
  }

  /** A note with a soft start and a soft end. */
  private tone(o: Out, to: GainLike, wave: string, freq: number, t: number, dur: number, peak: number, attack: number, release: number): void {
    const osc = o.ctx.createOscillator();
    const gain = o.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    swell(gain.gain, t, dur, peak, attack, release);
    osc.connect(gain);
    gain.connect(to);
    osc.start(t);
    osc.stop(t + dur + release + 0.05);
  }

  /** A note struck and left to die away. */
  private pluck(o: Out, to: GainLike, freq: number, t: number, peak: number, dur: number): void {
    const osc = o.ctx.createOscillator();
    const gain = o.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(to);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  /** A low note that falls: a drum's skin. */
  private thump(o: Out, to: GainLike, from: number, down: number, t: number, peak: number, dur: number): void {
    const osc = o.ctx.createOscillator();
    const gain = o.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, down), t + dur * 0.5);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(to);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  /** One stroke of a drum of the bank, made instead: by its name, a skin, a snare, or something small and bright. */
  private drum(o: Out, to: GainLike, name: string, t: number, gain: number): void {
    const peak = gain * 0.5;
    if (/^(bdrum|timpani)/.test(name)) this.thump(o, to, 120, 44, t, peak, 0.24);
    else if (/^(tumba|tom|conga|logdrum)/.test(name)) {
      this.thump(o, to, name === 'conga' ? 260 : 190, name === 'conga' ? 170 : 110, t, peak * 0.8, 0.14);
    } else if (/^snare/.test(name)) this.hiss(o, to, 'bandpass', 1900, t, 0.12, peak * 0.6);
    else this.hiss(o, to, 'highpass', 4500, t, 0.08, peak * 0.4);
  }

  /** A burst of noise through a filter: a snare, a cymbal. */
  private hiss(o: Out, to: GainLike, filter: string, freq: number, t: number, dur: number, peak: number): void {
    const src = o.ctx.createBufferSource();
    const f = o.ctx.createBiquadFilter();
    const gain = o.ctx.createGain();
    src.buffer = o.noise;
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = 0.9;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(gain);
    gain.connect(to);
    src.start(t, ((t * 3.7) % 1) * 0.6);
    src.stop(t + dur + 0.03);
  }
}

/** Up over `attack`, held, and down over `release` after the note's length. */
function swell(param: ParamLike, t: number, dur: number, peak: number, attack: number, release: number): void {
  const up = Math.min(attack, dur * 0.5);
  const top = Math.max(0.0002, peak);
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(top, t + up);
  param.setValueAtTime(top, t + Math.max(up, dur));
  param.linearRampToValueAtTime(0.0001, t + Math.max(up, dur) + release);
}

/** The game's one band. It plays through the same mix as the effects. */
export const music = new Music(() => sfx.out);
