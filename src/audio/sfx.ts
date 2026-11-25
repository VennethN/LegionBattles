// Every sound in the game. A sound is played from the bank of recorded
// sounds (audio/bank.ts): a drum, a harp's notes, a bell tree, a click. Each
// effect is a few of those, said below as what is struck, how hard, at what
// pitch and when. Where the bank is not there (it has not come in yet, or
// the device cannot read it), the same effect is made from a few
// oscillators and bursts of noise instead, as every sound once was.
//
// A browser will not make a sound until the player has touched the page, so
// nothing is created before unlock() is called from an input event.
//
// The mix. Effects and music (audio/music.ts) each have a volume of their
// own and meet in one master, which a limiter sits on: a battle of twenty
// units cannot clip, and nothing has to be turned down for the worst case.
// Three things keep a big fight from being a roar: the same sound is not
// started twice in a moment (gap), a sound that would be the eighth in a
// tenth of a second is dropped if it is one of a battle's small ones
// (crowd), and each is turned down a little by how many are already in the
// air. Sounds that repeat are never quite the same pitch twice (vary).

import { bank as theBank, nearest, type Bank, type Instrument, type Sample } from './bank';

/** The little of the Web Audio API this needs, so that a test can stand in for it. */
export interface AudioLike {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly destination: unknown;
  state?: string;
  resume?: () => Promise<void> | void;
  suspend?: () => Promise<void> | void;
  /** A limiter for the master. A device without one goes without. */
  createDynamicsCompressor?: () => CompressorLike;
  createGain(): GainLike;
  createOscillator(): OscLike;
  createBiquadFilter(): FilterLike;
  createBufferSource(): SourceLike;
  createBuffer(channels: number, length: number, rate: number): { getChannelData(c: number): Float32Array };
}
export interface ParamLike {
  value: number;
  setValueAtTime(v: number, t: number): unknown;
  linearRampToValueAtTime(v: number, t: number): unknown;
  exponentialRampToValueAtTime(v: number, t: number): unknown;
}
interface NodeLike {
  connect(to: unknown): unknown;
}
export interface GainLike extends NodeLike {
  gain: ParamLike;
}
interface CompressorLike extends NodeLike {
  threshold: { value: number };
  knee: { value: number };
  ratio: { value: number };
  attack: { value: number };
  release: { value: number };
}
interface OscLike extends NodeLike {
  type: string;
  frequency: ParamLike;
  start(t: number): void;
  stop(t: number): void;
}
interface FilterLike extends NodeLike {
  type: string;
  frequency: ParamLike;
  Q: ParamLike;
}
interface SourceLike extends NodeLike {
  buffer: unknown;
  /** How fast it is played: 2 is an octave up. */
  playbackRate?: { value: number };
  /** True for a sound that goes round until it is stopped: the wind. */
  loop?: boolean;
  start(t: number, offset?: number): void;
  stop(t: number): void;
}

export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth';

interface Tone {
  wave: Wave;
  /** Hertz at the start and at the end. */
  from: number;
  to?: number;
  /** Seconds. */
  dur: number;
  gain: number;
  /** Seconds after the sound starts. */
  at?: number;
}

interface Noise {
  filter: 'lowpass' | 'highpass' | 'bandpass';
  from: number;
  to?: number;
  q?: number;
  dur: number;
  gain: number;
  at?: number;
}

/** One recorded sound of the bank, as a part of an effect. */
export interface Hit {
  /** Its name in the bank. */
  s: string;
  /** How loud, where 1 is as loud as the bank holds it. */
  gain: number;
  /** How fast it is played: 2 is an octave up. */
  rate?: number;
  /** Seconds after the effect starts. */
  at?: number;
  /** Stopped after this many seconds, with a short fall, where it would ring on too long. */
  dur?: number;
}

interface Recipe {
  /** What it is played on from the bank. */
  hits?: Hit[];
  /**
   * How loud those are in the mix, as a share. The gains of the hits say how
   * its parts stand to each other; this says how it stands to every other
   * effect, and is set by measuring (scripts/listen.mjs).
   */
  level?: number;
  /** What it is made of where the bank is not there. */
  tones?: Tone[];
  noise?: Noise[];
  /** The least time between two of this sound, in seconds: a dozen hits in one step are one thud, not a roar. */
  gap?: number;
  /** True for a battle's small sounds: one is dropped when the air is already full (CROWD). */
  crowd?: boolean;
  /** How far its pitch wanders from one playing to the next, as a share: 0.05 is a twentieth up or down. */
  vary?: number;
}

/** How many sounds may start inside CROWD_WINDOW seconds before a small one is dropped. */
export const CROWD = 7;
const CROWD_WINDOW = 0.1;
/** Each sound already in the air turns the next one down by this share. */
const CROWD_DUCK = 0.12;
/** The steps a wandering pitch goes through, so that no two in a row are alike and none is left to chance. */
const WANDER = [0, 0.7, -0.5, 1, -1, 0.3, -0.8, 0.5];

// Notes, in hertz.
const D4 = 293.7;
const G4 = 392.0;
const C5 = 523.3;
const E5 = 659.3;
const G5 = 784.0;
const C6 = 1046.5;
const E6 = 1318.5;
const G6 = 1568.0;

/** A run of notes, one after another. */
function run(notes: number[], step: number, dur: number, gain: number, wave: Wave = 'triangle', at = 0): Tone[] {
  return notes.map((n, i) => ({ wave, from: n, dur, gain, at: at + i * step }));
}

/** A note of an instrument of the bank, by its MIDI number: 72 is the C above middle C. */
function note(instrument: Instrument, midi: number, gain: number, at = 0, dur?: number): Hit {
  const { name, rate } = nearest(instrument, midi);
  return { s: name, rate, gain, at, dur };
}

/** A run of an instrument's notes, one after another. */
function arp(instrument: Instrument, notes: number[], step: number, gain: number, at = 0, dur?: number): Hit[] {
  return notes.map((m, i) => note(instrument, m, gain, at + i * step, dur));
}

// The timpani of the bank is a little under the D below middle C. This brings it to C, for what is in C.
const TIMPANI_C = 0.917;

/** What a pack's card sounds like, by its tier: the rarer, the longer the flourish. A harp climbs, and bells take the top. */
const REVEALS: Recipe[] = [
  { level: 0.54, hits: arp('harp', [72, 76], 0.07, 0.4), tones: run([C5, E5], 0.07, 0.16, 0.16) },
  { level: 0.48, hits: arp('harp', [72, 76, 79], 0.07, 0.4), tones: run([C5, E5, G5], 0.07, 0.18, 0.16) },
  {
    level: 0.52,
    hits: [...arp('harp', [72, 76, 79], 0.07, 0.42), note('glock', 84, 0.22, 0.21), { s: 'triangle', gain: 0.12, at: 0.21 }],
    tones: run([C5, E5, G5, C6], 0.07, 0.22, 0.17),
  },
  {
    level: 0.58,
    hits: [...arp('harp', [72, 76, 79], 0.07, 0.42), ...arp('glock', [84, 88], 0.07, 0.24, 0.21), { s: 'chimes', gain: 0.26, at: 0.3 }],
    tones: [...run([C5, E5, G5, C6, E6], 0.07, 0.26, 0.17), { wave: 'sine', from: C6, dur: 0.6, gain: 0.07, at: 0.35 }],
  },
  {
    // The rarest: bells run up under the harp, and trumpets, a great bell, a cymbal and a kettledrum land together at the top.
    level: 0.61,
    hits: [
      { s: 'gliss-up', gain: 0.4 },
      ...arp('harp', [67, 72, 76, 79], 0.08, 0.42),
      ...arp('glock', [84, 88, 91], 0.08, 0.24, 0.32),
      note('trumpet', 72, 0.26, 0.6),
      note('trumpet', 76, 0.26, 0.6),
      note('trumpet', 79, 0.3, 0.6),
      { s: 'bell-72', gain: 0.4, at: 0.6 },
      { s: 'crash-long', gain: 0.3, at: 0.6 },
      { s: 'timpani', gain: 0.5, rate: TIMPANI_C, at: 0.6 },
    ],
    tones: [
      ...run([G4, C5, E5, G5, C6, E6, G6], 0.08, 0.3, 0.17),
      { wave: 'triangle', from: C5, dur: 0.9, gain: 0.12, at: 0.6 },
      { wave: 'triangle', from: E5, dur: 0.9, gain: 0.1, at: 0.6 },
      { wave: 'triangle', from: G5, dur: 0.9, gain: 0.1, at: 0.6 },
      { wave: 'sine', from: C6, dur: 1.0, gain: 0.08, at: 0.6 },
    ],
    noise: [{ filter: 'highpass', from: 3000, to: 8000, dur: 0.5, gain: 0.05, at: 0.55 }],
  },
];

export const SOUNDS = {
  // The interface.
  click: {
    level: 0.6,
    hits: [{ s: 'ui-click', gain: 0.5 }],
    tones: [{ wave: 'triangle', from: 660, to: 880, dur: 0.05, gain: 0.11 }, { wave: 'sine', from: 1320, dur: 0.03, gain: 0.03 }],
    gap: 0.03,
  },
  // A screen opens over the field, and shuts: a breath up, a breath down.
  open: {
    level: 0.42,
    hits: [{ s: 'ui-open', gain: 0.3 }],
    tones: [{ wave: 'sine', from: 330, to: 560, dur: 0.12, gain: 0.07 }],
    noise: [{ filter: 'bandpass', from: 700, to: 2400, q: 0.8, dur: 0.14, gain: 0.07 }],
    gap: 0.08,
  },
  close: {
    level: 0.56,
    hits: [{ s: 'ui-close', gain: 0.3 }],
    tones: [{ wave: 'sine', from: 520, to: 300, dur: 0.11, gain: 0.07 }],
    noise: [{ filter: 'bandpass', from: 2000, to: 600, q: 0.8, dur: 0.12, gain: 0.06 }],
    gap: 0.08,
  },
  // A switch thrown, a step on a slider.
  tick: {
    level: 0.78,
    hits: [{ s: 'ui-tick', gain: 0.45 }],
    tones: [{ wave: 'square', from: 520, dur: 0.025, gain: 0.04 }, { wave: 'sine', from: 780, dur: 0.05, gain: 0.07, at: 0.012 }],
    gap: 0.025,
  },
  // Not enough coins, not open yet.
  deny: {
    hits: [{ s: 'ui-deny', gain: 0.4 }],
    tones: [{ wave: 'triangle', from: 196, dur: 0.09, gain: 0.13 }, { wave: 'triangle', from: 156, dur: 0.14, gain: 0.13, at: 0.085 }],
    gap: 0.1,
  },
  // A tutorial's note comes up.
  pop: { level: 0.58, hits: [{ s: 'ui-pop', gain: 0.4 }], tones: [{ wave: 'sine', from: 420, to: 760, dur: 0.07, gain: 0.12 }], gap: 0.08 },
  // The hunter's horn is blown for help: two notes, the second a fourth up, over a drum.
  claim: {
    level: 0.6,
    hits: [note('horn', 52, 0.4, 0, 0.28), note('horn', 57, 0.46, 0.2, 0.45), { s: 'bdrum-soft', gain: 0.3, at: 0.2 }],
    tones: [{ wave: 'sawtooth', from: 165, dur: 0.2, gain: 0.09 }, { wave: 'sawtooth', from: 220, dur: 0.4, gain: 0.1, at: 0.2 }, { wave: 'triangle', from: 220, dur: 0.4, gain: 0.08, at: 0.2 }],
  },
  // A unit is set down on the board: wood, knocked.
  place: {
    level: 0.65,
    hits: [{ s: 'logdrum', gain: 0.5, rate: 1.15, dur: 0.2 }, { s: 'ui-drop', gain: 0.2 }],
    tones: [{ wave: 'sine', from: 190, to: 110, dur: 0.09, gain: 0.26 }],
    noise: [{ filter: 'lowpass', from: 500, dur: 0.05, gain: 0.1 }],
  },
  lift: { level: 0.9, hits: [{ s: 'ui-lift', gain: 0.35 }], tones: [{ wave: 'sine', from: 300, to: 460, dur: 0.07, gain: 0.12 }] },
  // The monster is awake: the low kettledrum, and a horn's two notes a minor third apart.
  fight: {
    level: 0.5,
    hits: [{ s: 'timpani-low', gain: 0.6, dur: 0.9 }, note('horn', 52, 0.36, 0, 0.2), note('horn', 55, 0.42, 0.16, 0.5)],
    tones: [
      { wave: 'sawtooth', from: 165, to: 196, dur: 0.4, gain: 0.1 },
      { wave: 'sine', from: 90, to: 60, dur: 0.5, gain: 0.2 },
    ],
  },
  // A coin put down on wood, not a chime: this is pay for a killing.
  coin: {
    level: 0.63,
    hits: [{ s: 'claves', gain: 0.25, rate: 1.5 }, note('glock', 79, 0.2, 0.02, 0.25)],
    tones: [{ wave: 'sine', from: 784, dur: 0.07, gain: 0.12 }, { wave: 'sine', from: 1175, dur: 0.12, gain: 0.08, at: 0.03 }],
    gap: 0.05,
  },
  // A bell struck once, with a low string under it: the bell post rung, a trophy holding its wearer up.
  levelUp: {
    level: 0.51,
    hits: [{ s: 'bell-72', gain: 0.5, rate: 0.75 }, note('harp', 55, 0.3), note('harp', 62, 0.24, 0.05)],
    tones: [{ wave: 'triangle', from: 392, dur: 0.9, gain: 0.12 }, { wave: 'sine', from: 1082, dur: 0.5, gain: 0.03 }, { wave: 'triangle', from: 196, dur: 0.5, gain: 0.1 }],
  },
  buy: {
    level: 0.51,
    hits: [{ s: 'ui-buy', gain: 0.3 }, { s: 'finger-cymbal', gain: 0.16, rate: 0.7, at: 0.06, dur: 0.5 }],
    tones: run([G4, C5], 0.06, 0.12, 0.13, 'sine'),
  },

  // A battle.
  // A blade through the air, and a little of its ring.
  slash: {
    level: 0.36,
    hits: [{ s: 'cabasa', gain: 0.5, rate: 0.85 }, { s: 'brake-2', gain: 0.1, rate: 1.7, at: 0.02, dur: 0.12 }],
    noise: [{ filter: 'bandpass', from: 900, to: 2800, q: 1.1, dur: 0.11, gain: 0.2 }],
    gap: 0.05,
    crowd: true,
    vary: 0.06,
  },
  // A blow lands: a hand drum's thump and a snare's snap.
  hit: {
    level: 0.4,
    hits: [{ s: 'tumba', gain: 0.55, rate: 0.9, dur: 0.22 }, { s: 'tap-1', gain: 0.25 }],
    tones: [{ wave: 'sine', from: 150, to: 70, dur: 0.09, gain: 0.3 }],
    noise: [{ filter: 'lowpass', from: 1300, to: 300, dur: 0.07, gain: 0.24 }],
    gap: 0.05,
    crowd: true,
    vary: 0.07,
  },
  bigHit: {
    level: 0.55,
    hits: [{ s: 'bdrum', gain: 0.8, dur: 0.5 }, { s: 'tom-low', gain: 0.45, rate: 0.75 }, { s: 'snare', gain: 0.25 }],
    tones: [{ wave: 'sine', from: 120, to: 45, dur: 0.2, gain: 0.42 }],
    noise: [{ filter: 'lowpass', from: 1500, to: 200, dur: 0.16, gain: 0.3 }],
    gap: 0.08,
  },
  // A bowstring: a violin's string plucked, and the arrow's hiss.
  shoot: {
    level: 0.38,
    hits: [note('pizz', 74, 0.3, 0, 0.18), { s: 'cabasa', gain: 0.18, rate: 1.5, at: 0.01 }],
    tones: [{ wave: 'triangle', from: 920, to: 480, dur: 0.06, gain: 0.1 }],
    noise: [{ filter: 'highpass', from: 2200, to: 5200, dur: 0.07, gain: 0.12 }],
    gap: 0.04,
    crowd: true,
    vary: 0.05,
  },
  thud: {
    level: 0.62,
    hits: [{ s: 'claves', gain: 0.3, rate: 0.6 }, { s: 'logdrum', gain: 0.3, rate: 1.4, dur: 0.12 }],
    tones: [{ wave: 'sine', from: 230, to: 110, dur: 0.05, gain: 0.2 }],
    noise: [{ filter: 'lowpass', from: 900, dur: 0.03, gain: 0.1 }],
    gap: 0.04,
    crowd: true,
    vary: 0.06,
  },
  // Something catches fire: a rush of air, and a low cymbal under it.
  cast: {
    level: 0.5,
    hits: [{ s: 'cabasa', gain: 0.5, rate: 0.6 }, { s: 'crash', gain: 0.2, rate: 0.6, dur: 0.7 }, { s: 'bdrum-soft', gain: 0.35 }],
    tones: [{ wave: 'sine', from: 160, to: 90, dur: 0.25, gain: 0.14 }],
    noise: [{ filter: 'bandpass', from: 500, to: 1800, q: 0.7, dur: 0.35, gain: 0.16 }],
    gap: 0.06,
  },
  blast: {
    level: 0.45,
    hits: [{ s: 'bdrum', gain: 0.85 }, { s: 'crash', gain: 0.3, rate: 0.8, dur: 0.6 }, { s: 'timpani-low', gain: 0.4, dur: 0.6 }],
    tones: [{ wave: 'sine', from: 210, to: 48, dur: 0.28, gain: 0.36 }],
    noise: [{ filter: 'lowpass', from: 1900, to: 180, dur: 0.26, gain: 0.26 }],
    gap: 0.08,
  },
  // Mending: two low notes of a harp, a fifth apart, and nothing bright over them.
  heal: {
    level: 0.4,
    hits: [note('harp', 62, 0.4, 0, 0.7), note('harp', 69, 0.34, 0.1, 0.9)],
    tones: [{ wave: 'triangle', from: D4, dur: 0.16, gain: 0.11 }, { wave: 'triangle', from: 440, dur: 0.22, gain: 0.1, at: 0.1 }],
    gap: 0.1,
  },
  // Something is about to be done, by the hunter or to them: a bare fifth low on a harp, and a low drum. Neither glad nor sad.
  skill: {
    level: 0.42,
    hits: [note('harp', 50, 0.42, 0, 0.5), note('harp', 57, 0.36, 0.05, 0.5), { s: 'tom-low', gain: 0.3, rate: 0.8 }],
    tones: [{ wave: 'triangle', from: 146.8, dur: 0.16, gain: 0.15 }, { wave: 'triangle', from: 220, dur: 0.18, gain: 0.12, at: 0.05 }, { wave: 'sine', from: 110, to: 70, dur: 0.1, gain: 0.2 }],
    gap: 0.12,
  },
  // The monster is open: iron rings once.
  status: {
    level: 0.8,
    hits: [{ s: 'brake-2', gain: 0.3, rate: 1.3, dur: 0.3 }, { s: 'tap-1', gain: 0.2 }],
    tones: [{ wave: 'square', from: 320, to: 210, dur: 0.06, gain: 0.05 }],
    gap: 0.1,
    crowd: true,
  },
  // Something comes up out of the ground, or the monster changes: a low drum, a low string, and earth falling.
  spawn: {
    level: 0.45,
    hits: [{ s: 'timpani-low', gain: 0.5, dur: 0.8 }, note('cello', 41, 0.4, 0, 0.5), { s: 'logdrum', gain: 0.25, at: 0.17, dur: 0.2 }],
    tones: [{ wave: 'sine', from: 100, to: 60, dur: 0.4, gain: 0.22 }, { wave: 'triangle', from: 73.4, dur: 0.4, gain: 0.12 }],
    noise: [{ filter: 'lowpass', from: 700, dur: 0.06, gain: 0.1, at: 0.16 }],
    gap: 0.15,
  },
  // A trap goes off: the snap of it before whatever it does.
  trap: {
    level: 0.66,
    hits: [{ s: 'ratchet', gain: 0.4, dur: 0.1 }, { s: 'claves', gain: 0.4, at: 0.02 }, { s: 'snare-soft', gain: 0.3, at: 0.05 }],
    tones: [{ wave: 'square', from: 1400, to: 500, dur: 0.035, gain: 0.07 }],
    noise: [{ filter: 'highpass', from: 2500, dur: 0.04, gain: 0.18 }, { filter: 'lowpass', from: 900, to: 200, dur: 0.12, gain: 0.16, at: 0.03 }],
    gap: 0.08,
  },
  // Someone falls: a low drum, and the ground a moment after.
  death: {
    level: 0.5,
    hits: [{ s: 'tom-low', gain: 0.4, rate: 0.7 }, { s: 'bdrum-soft', gain: 0.4, at: 0.34, dur: 0.4 }],
    tones: [{ wave: 'triangle', from: 300, to: 85, dur: 0.26, gain: 0.18 }],
    noise: [{ filter: 'lowpass', from: 520, dur: 0.12, gain: 0.16, at: 0.36 }],
    gap: 0.08,
  },
  // It is dead: the kettledrum, a great bell, and low strings on a bare fifth. No fanfare: nobody is glad yet.
  victory: {
    level: 0.64,
    hits: [
      { s: 'timpani', gain: 0.6, rate: 1.03 },
      { s: 'bell-72', gain: 0.4, rate: 0.561 },
      { s: 'crash-long', gain: 0.18, rate: 0.7 },
      note('cello', 50, 0.35, 0, 1.3),
      note('cello', 57, 0.3, 0, 1.3),
    ],
    tones: [
      { wave: 'sine', from: 150, to: 70, dur: 0.4, gain: 0.3 },
      { wave: 'triangle', from: D4, dur: 1.2, gain: 0.12 },
      { wave: 'triangle', from: 146.8, dur: 1.1, gain: 0.12 },
      { wave: 'triangle', from: 220, dur: 1.1, gain: 0.1 },
    ],
  },
  // The hunter is down: cellos down three steps of the minor, and the low kettledrum under the last.
  defeat: {
    level: 0.45,
    hits: [
      note('cello', 57, 0.4, 0, 0.3),
      note('cello', 55, 0.4, 0.22, 0.3),
      note('cello', 53, 0.45, 0.44, 0.9),
      { s: 'timpani-low', gain: 0.35, at: 0.44 },
    ],
    tones: run([220, 196, 174.6], 0.2, 0.34, 0.15),
  },

  // A pack.
  packShake: {
    level: 0.52,
    hits: [{ s: 'tamb-shake', gain: 0.35 }, { s: 'tamb-shake', gain: 0.3, rate: 1.12, at: 0.1 }],
    noise: [0, 0.07, 0.14].map((at) => ({ filter: 'bandpass' as const, from: 2600, q: 2, dur: 0.035, gain: 0.12, at })),
    gap: 0.1,
  },
  // Torn open: a rasp, a cymbal, and bells running up.
  packOpen: {
    hits: [{ s: 'guiro', gain: 0.5, rate: 0.8 }, { s: 'crash', gain: 0.25, at: 0.06, dur: 0.6 }, { s: 'gliss-fast', gain: 0.3, at: 0.04 }],
    tones: [{ wave: 'sine', from: 300, to: 950, dur: 0.16, gain: 0.14 }],
    noise: [{ filter: 'highpass', from: 600, to: 6500, dur: 0.2, gain: 0.2 }],
  },
  reveal0: REVEALS[0],
  reveal1: REVEALS[1],
  reveal2: REVEALS[2],
  reveal3: REVEALS[3],
  reveal4: REVEALS[4],
} satisfies Record<string, Recipe>;

export type SoundName = keyof typeof SOUNDS;

export class Sfx {
  private ctx: AudioLike | null = null;
  private master: GainLike | null = null;
  private effects: GainLike | null = null;
  private songs: GainLike | null = null;
  private noise: unknown = null;
  private last: Partial<Record<SoundName, number>> = {};
  private on = true;
  private effectsVolume = 0.8;
  private musicVolume = 0.5;
  /** When each of the last few sounds began, to know how full the air is. */
  private readonly begun = new Float64Array(CROWD + 1).fill(-1);
  private next = 0;
  private wander = 0;
  private asleep = false;
  /** A portal's own sound switch is off: silent, whatever the player's setting says. */
  private hushed = false;
  /** What the music plays through, made once: it is asked for every frame. */
  private through: MusicOut | null = null;

  /** `make` builds the audio context. The game passes the browser's; a test passes a stand-in. `bank` is where recorded sounds are looked for. */
  constructor(
    private readonly make: () => AudioLike | null,
    private readonly bank: Bank = theBank,
  ) {}

  /** False when the player has turned all sound off: effects and music both. */
  get enabled(): boolean {
    return this.on;
  }
  set enabled(on: boolean) {
    this.on = on;
    this.level();
  }

  /**
   * Silences everything, or lets it sound again, over the head of the
   * player's own setting: for a portal whose page has a sound switch of its
   * own (CrazyGames asks that its switch come first), and for the length of
   * an ad. The player's setting is not touched.
   */
  hush(on: boolean): void {
    this.hushed = on;
    this.level();
  }

  /** Sets how loud the effects and the music are, each from 0 to 1. */
  setVolumes(effects: number, music: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, effects));
    this.musicVolume = Math.max(0, Math.min(1, music));
    this.level();
  }

  /** Puts the volumes on the mix as they now stand. */
  private level(): void {
    if (!this.ctx || !this.master || !this.effects || !this.songs) return;
    this.master.gain.value = this.on && !this.hushed ? 0.9 : 0;
    this.effects.gain.value = this.effectsVolume;
    this.songs.gain.value = this.musicVolume;
  }

  /** Call from an input event. Until then, play() does nothing. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const ctx = this.make();
        if (!ctx) return;
        this.ctx = ctx;
        this.master = ctx.createGain();
        // The limiter: everything goes through it on the way out.
        const limiter = ctx.createDynamicsCompressor?.();
        if (limiter) {
          limiter.threshold.value = -14;
          limiter.knee.value = 10;
          limiter.ratio.value = 8;
          limiter.attack.value = 0.004;
          limiter.release.value = 0.18;
          this.master.connect(limiter);
          limiter.connect(ctx.destination);
        } else this.master.connect(ctx.destination);
        this.effects = ctx.createGain();
        this.effects.connect(this.master);
        this.songs = ctx.createGain();
        this.songs.connect(this.master);
        // One second of noise, made once and played from wherever.
        const length = Math.floor(ctx.sampleRate);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let seed = 22222;
        for (let i = 0; i < length; i++) {
          seed = (Math.imul(seed, 1103515245) + 12345) | 0;
          data[i] = ((seed >>> 8) & 0xffff) / 32768 - 1;
        }
        this.noise = buffer;
        this.through = { ctx, music: this.songs, noise: buffer, bank: this.bank };
        this.level();
      }
      // A phone that took a call, or sent the page to the background, leaves the audio "interrupted" (iOS) or suspended: a touch brings it back.
      if ((this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') && !this.asleep) void this.ctx.resume?.();
    } catch {
      // No audio on this device: the game is silent, and nothing else changes.
      this.ctx = null;
      this.through = null;
    }
  }

  /**
   * Stops all sound while the page is hidden and starts it again when it is
   * back: a game in a tab nobody is looking at makes no noise.
   */
  sleep(asleep: boolean): void {
    this.asleep = asleep;
    try {
      if (!this.ctx) return;
      if (asleep) void this.ctx.suspend?.();
      else void this.ctx.resume?.();
    } catch {
      // It stays as it was.
    }
  }

  /**
   * What the music plays through: the context, its own volume, the noise
   * and the bank. Null until the page has been touched, and while there is
   * nothing to hear of it (sound off, or the music turned to nothing): then
   * no note is made at all.
   */
  get out(): MusicOut | null {
    if (!this.on || this.hushed || this.musicVolume <= 0) return null;
    return this.through;
  }

  /** True when every recorded sound an effect is played on is in the bank. */
  private holds(hits: readonly Hit[]): boolean {
    for (let i = 0; i < hits.length; i++) if (!this.bank.get(hits[i].s)) return false;
    return true;
  }

  /** How many sounds began in the last moment. */
  private crowd(now: number): number {
    let n = 0;
    for (let i = 0; i < this.begun.length; i++) if (this.begun[i] >= 0 && now - this.begun[i] < CROWD_WINDOW) n++;
    return n;
  }

  /** Plays a sound. `pitch` shifts it, `volume` scales it. Safe to call before unlock and when muted. */
  play(name: SoundName, volume = 1, pitch = 1): void {
    const ctx = this.ctx;
    const out = this.effects;
    if (!this.on || this.hushed || !ctx || !out || this.effectsVolume <= 0) return;
    const recipe: Recipe = SOUNDS[name];
    const now = ctx.currentTime;
    const last = this.last[name];
    if (last !== undefined && now - last < (recipe.gap ?? 0.02)) return;
    const busy = this.crowd(now);
    if (recipe.crowd && busy >= CROWD) return;
    this.last[name] = now;
    this.begun[this.next] = now;
    this.next = (this.next + 1) % this.begun.length;
    // Turned down by how many are in the air already, and never quite the pitch it was last time.
    const vol = volume / (1 + CROWD_DUCK * busy);
    if (recipe.vary) {
      pitch *= 1 + recipe.vary * WANDER[this.wander];
      this.wander = (this.wander + 1) % WANDER.length;
    }
    try {
      // From the bank where it is there, and from oscillators where it is not.
      const hits = recipe.hits;
      if (hits && this.holds(hits)) {
        const loud = vol * (recipe.level ?? 1);
        for (let i = 0; i < hits.length; i++) {
          const h = hits[i];
          strike(ctx, out, this.bank.get(h.s) as Sample, now + (h.at ?? 0), h.gain * loud, (h.rate ?? 1) * pitch, h.dur);
        }
        return;
      }
      for (const t of recipe.tones ?? []) {
        const t0 = now + (t.at ?? 0);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = t.wave;
        osc.frequency.setValueAtTime(t.from * pitch, t0);
        if (t.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, t.to * pitch), t0 + t.dur);
        envelope(gain.gain, t0, t.dur, t.gain * vol);
        osc.connect(gain);
        gain.connect(out);
        osc.start(t0);
        osc.stop(t0 + t.dur + 0.03);
      }
      for (const n of recipe.noise ?? []) {
        const t0 = now + (n.at ?? 0);
        const src = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        src.buffer = this.noise;
        filter.type = n.filter;
        filter.Q.value = n.q ?? 0.7;
        filter.frequency.setValueAtTime(n.from * pitch, t0);
        if (n.to !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(20, n.to * pitch), t0 + n.dur);
        envelope(gain.gain, t0, n.dur, n.gain * vol);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(out);
        // A different stretch of the noise each time, so that two bursts do not sound alike.
        src.start(t0, ((t0 * 7.3) % 1) * 0.7);
        src.stop(t0 + n.dur + 0.03);
      }
    } catch {
      // A sound that cannot be made is skipped.
    }
  }

  /** The sound of a pack's card, by how rare its tier is (0 for the commonest). */
  reveal(rank: number): void {
    const names: SoundName[] = ['reveal0', 'reveal1', 'reveal2', 'reveal3', 'reveal4'];
    this.play(names[Math.max(0, Math.min(names.length - 1, rank))]);
  }
}

/** What the music is given to play through. */
export interface MusicOut {
  ctx: AudioLike;
  music: GainLike;
  noise: unknown;
  bank: Bank;
}

/**
 * Plays a recorded sound once: at `t`, as loud as `gain`, `rate` times as
 * fast. With `dur` it is stopped after that long, falling away over
 * `release`; without, it rings to its own end. `attack` brings it in
 * slowly, for a note that should not start with a knock.
 */
export function strike(ctx: AudioLike, to: unknown, sample: Sample, t: number, gain: number, rate = 1, dur?: number, release = 0.06, attack = 0): void {
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  src.buffer = sample.buffer;
  if (src.playbackRate) src.playbackRate.value = rate;
  const peak = Math.max(0.0002, gain);
  if (attack > 0) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
  } else g.gain.setValueAtTime(peak, t);
  src.connect(g);
  g.connect(to);
  src.start(t, sample.lead);
  if (dur !== undefined) {
    const end = t + Math.max(dur, attack);
    g.gain.setValueAtTime(peak, end);
    g.gain.linearRampToValueAtTime(0.0001, end + release);
    src.stop(end + release + 0.02);
  }
}

/** Up fast, then away: every sound here is a pluck or a burst. */
function envelope(param: ParamLike, t0: number, dur: number, peak: number): void {
  param.setValueAtTime(0.0001, t0);
  param.linearRampToValueAtTime(Math.max(0.0002, peak), t0 + Math.min(0.008, dur * 0.3));
  param.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

function browserAudio(): AudioLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: new () => AudioLike; webkitAudioContext?: new () => AudioLike };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

/** The game's one voice. */
export const sfx = new Sfx(browserAudio);
