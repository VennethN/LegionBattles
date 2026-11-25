// The music. A theme is written down as a scale, a round of chords and a
// tune in the steps of that scale, and played a note at a time, a quarter
// of a second ahead of the clock, on the recorded instruments of the bank
// (audio/bank.ts): a flute, an oboe or a harp for the tune, a section of
// cellos holding the chord, a plucked bass, a harp, and drums. There is no
// recording of the music itself, only of its instruments, so a theme costs
// a few lines and can change with the battle. Where the bank is not there,
// the same notes are played by oscillators.
//
// Each kind of land has a theme of its own, sixteen bars long. A theme has
// two moods. Calm is what plays while the team is being set out and the
// screens are open: the cellos, the bass, a few plucked notes and the tune.
// Battle is the same bars with drums under them, the bass driven in eighths
// and a flute over the tune an octave up, so that the fight starts on the
// beat the calm was on and ends back in it.
//
// So that sixteen bars do not wear thin, every third time round the tune
// rests for the first half and comes back for the second.
//
// Nobody has heard any of this where it was written: it was put together
// by the rules of harmony and checked by tests (tests/music.test.ts), which
// can say a note is in the chord under it and cannot say it is good.

import { nearest, type Instrument } from './bank';
import { sfx, strike, type GainLike, type MusicOut, type ParamLike } from './sfx';

export type Mood = 'calm' | 'battle';

/** How the tune is voiced. */
type Voice = 'flute' | 'reed' | 'bell';

export interface Theme {
  /** Beats a minute. A bar is four beats, eight slots. */
  bpm: number;
  /** The note the scale starts on, as a MIDI number: 62 is the D above middle C. */
  root: number;
  /** The scale, in semitones from the root. */
  scale: readonly number[];
  /** The chord under each bar, as the step of the scale its root is. Its notes are that step, the third above it and the fifth. */
  chords: readonly number[];
  /**
   * The tune, a bar to a string and eight slots to a bar. A number is a step
   * of the scale (7 is the root an octave up, -1 the step under it), a dot
   * is a rest, and a dash holds the note before it.
   */
  tune: readonly string[];
  voice: Voice;
  /** The drums of its battles, a slot to a letter: k a kick, s a snare, t a tom, h a hat, a dot nothing. */
  drums: string;
  /** What each of those letters is struck on, of the bank's sounds, and how hard. */
  kit: Readonly<Record<string, readonly [string, number]>>;
}

export const BARS = 16;
export const SLOTS = 8;

/** The three themes written so far, by the land they were written for. */
const WRITTEN: Readonly<Record<string, Theme>> = {
  // Thornwood: a dance in D dorian, quick and light, on a flute.
  meadow: {
    bpm: 104,
    root: 62,
    scale: [0, 2, 3, 5, 7, 9, 10],
    chords: [0, -1, 3, 0, 0, 2, -1, 0, 3, 0, -1, 0, 3, 2, 4, 0],
    tune: [
      '4 . 4 5 4 . 2 .', '3 . 1 . 3 4 3 .', '5 . 7 . 5 . 3 .', '4 - - . 2 . 0 .',
      '0 2 4 . 4 5 7 .', '6 . 4 . 2 . 4 .', '3 . 4 3 1 . -1 .', '0 - - - . . . .',
      '7 . 5 . 7 8 7 .', '9 . 7 . 4 . 7 .', '8 . 6 . 8 9 8 .', '7 - - . 4 . 2 .',
      '3 . 5 . 7 . 5 .', '6 . 4 . 2 . 4 .', '4 . 6 . 8 . 6 4', '7 - - - . . . .',
    ],
    voice: 'flute',
    drums: 'k.h.s.h.k.khs.h.',
    // A village band: a bass drum, a snare and a tambourine.
    kit: { k: ['bdrum-soft', 0.55], s: ['snare-soft', 0.3], h: ['tamb', 0.1] },
  },
  // The Sunscar Dunes: D with a flat second and a raised third, slower, on a reed, over a hand drum.
  desert: {
    bpm: 92,
    root: 62,
    scale: [0, 1, 4, 5, 7, 8, 10],
    chords: [0, 0, 1, 0, 0, 3, 1, 0, 3, 3, -1, 0, 3, 1, 1, 0],
    tune: [
      '0 . 2 1 0 . . .', '2 . 4 . 4 5 4 .', '3 . 5 . 3 . 1 .', '2 1 0 - - . . .',
      '4 . 5 4 2 . 4 .', '7 . 5 . 3 . 5 .', '5 . 3 . 1 . 3 1', '0 - - - . . . .',
      '7 . 8 7 5 . 7 .', '5 . 3 . 5 7 5 .', '6 . 8 . 6 . 3 .', '4 - 2 . 4 5 4 .',
      '3 . 5 . 7 . 5 .', '5 . 3 . 1 3 5 .', '8 . 7 . 5 . 3 1', '0 - - - . . . .',
    ],
    voice: 'reed',
    drums: 'k..tk.t.k..tktt.',
    // Hand drums, a low one and a high.
    kit: { k: ['tumba', 0.6], t: ['conga', 0.4] },
  },
  // Frostholt: A minor, slow, on bells that ring on.
  snow: {
    bpm: 80,
    root: 57,
    scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [0, 5, 2, -1, 0, 5, 3, 4, 5, 2, -1, 0, 5, 2, 4, 0],
    tune: [
      '4 - - - 2 - 0 -', '2 - - - 0 - -2 -', '4 - 2 - 4 - 6 -', '3 - - - 1 - - .',
      '4 - - - 7 - 4 -', '5 - - - 7 - 9 -', '7 - 5 - 3 - 5 -', '4 - - - - - . .',
      '9 - - - 7 - 5 -', '11 - - - 9 - 6 -', '10 - 8 - 6 - 8 -', '7 - - - 4 - - .',
      '5 - 7 - 9 - 7 -', '6 - 4 - 2 - 4 -', '4 - 6 - 8 - 6 -', '7 - - - - - . .',
    ],
    voice: 'bell',
    drums: 'k...t...k.k.t...',
    // A soft drum, and sleigh bells where the tom would be.
    kit: { k: ['bdrum-soft', 0.5], t: ['sleigh', 0.14] },
  },
};

/**
 * The themes, by the kind of land (art/board.ts). The seven lands after the
 * first three have no theme of their own yet: each plays the one nearest it
 * in mood, as their light borrows an hour (view/light/hours.ts). A theme
 * that goes on into the next land goes on from where it was.
 */
export const THEMES: Readonly<Record<string, Theme>> = {
  ...WRITTEN,
  mire: WRITTEN.meadow,
  coast: WRITTEN.meadow,
  steppe: WRITTEN.desert,
  clock: WRITTEN.desert,
  ember: WRITTEN.desert,
  mine: WRITTEN.snow,
  crypt: WRITTEN.snow,
};

/** A note of the tune: the step of the scale, and how many slots it is held. */
export interface Note {
  step: number;
  slots: number;
}

/** A theme's tune as notes, by the slot each starts on: bar times eight, plus its place in the bar. */
export function notesOf(theme: Theme): Array<Note | null> {
  const out: Array<Note | null> = [];
  let held: Note | null = null;
  theme.tune.forEach((bar, b) => {
    const cells = bar.split(' ');
    if (cells.length !== SLOTS) throw new Error(`music: bar ${b + 1} has ${cells.length} slots`);
    for (const cell of cells) {
      if (cell === '-') {
        if (held) held.slots++;
        out.push(null);
      } else if (cell === '.') {
        held = null;
        out.push(null);
      } else {
        const step = Number(cell);
        if (!Number.isInteger(step)) throw new Error(`music: "${cell}" in bar ${b + 1} is no step of the scale`);
        held = { step, slots: 1 };
        out.push(held);
      }
    }
  });
  return out;
}

/** The pitch of a step of a theme's scale, as a MIDI number. Steps past the scale's end are in the octaves above and below. */
export function midiOf(theme: Theme, step: number): number {
  const n = theme.scale.length;
  const octave = Math.floor(step / n);
  return theme.root + octave * 12 + theme.scale[step - octave * n];
}

export function hertz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** The three steps of the scale a bar's chord is made of. */
export function chordOf(theme: Theme, bar: number): [number, number, number] {
  const r = theme.chords[bar % theme.chords.length];
  return [r, r + 2, r + 4];
}

/** The lowest note the bass plays, as a MIDI number: the D two octaves under middle C, 73 hertz. */
const LOWEST = 38;

/** How far ahead of the clock notes are written down, in seconds. Frames may come late: the music must not. */
const AHEAD = 0.3;

type Out = MusicOut;

/** How loud the whole band is, as a share of what the numbers under it add up to. Set by measuring (scripts/listen.mjs). */
const BAND = 0.63;
// How loud each part of the band is, where 1 is as loud as the bank holds a sound.
const PAD = 0.1;
const BASS = 0.5;
const PLUCK = 0.2;
const TUNE = { flute: 0.34, reed: 0.24, bell: 0.44 } as const;
/** The lowest note the cellos hold, as a MIDI number: a third under the lowest one in the bank. */
const PAD_LOWEST = 46;
/** The flute that joins over the tune in a battle. */
const OVER = 0.1;

export class Music {
  private theme: Theme | null = null;
  private notes: Array<Note | null> = [];
  private mood: Mood = 'calm';
  /** The next slot to be written down, the time it sounds at, and how many times the theme has gone round. */
  private slot = 0;
  private at = 0;
  private round = 0;
  private bus: GainLike | null = null;
  private duckedUntil = 0;

  /** `out` gives what to play through, once there is anything (Sfx.out). */
  constructor(private readonly out: () => Out | null) {}

  /** What is playing: a land's theme, or nothing. */
  get playing(): string | null {
    for (const [id, t] of Object.entries(THEMES)) if (t === this.theme) return id;
    return null;
  }

  /** Plays a land's theme in a mood. A theme already playing goes on from where it is: only its mood changes. */
  play(land: string, mood: Mood): void {
    const theme = THEMES[land] ?? null;
    this.mood = mood;
    if (theme === this.theme) return;
    this.theme = theme;
    this.notes = theme ? notesOf(theme) : [];
    this.slot = 0;
    this.round = 0;
    // The old theme's last notes ring out; the new one starts after a breath.
    const o = this.out();
    this.at = o ? o.ctx.currentTime + 0.4 : 0;
  }

  stop(): void {
    this.theme = null;
  }

  /**
   * Turns the music down for a moment, for a fanfare to be heard over it.
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
    const theme = this.theme;
    if (!theme) return;
    const o = this.out();
    if (!o) return;
    // The band is on its way: better a moment of quiet than a theme that changes its instruments halfway through a bar.
    if (o.bank.state === 'loading') return;
    const now = o.ctx.currentTime;
    // The first notes after the page is touched, or after a long sleep: start from now, not from then.
    if (this.at < now - 0.05) this.at = now + 0.1;
    if (this.at >= now + AHEAD) return;
    try {
      if (!this.bus) {
        // Everything of the music goes through one gain, so that it can be ducked, and a filter that keeps it under the effects.
        // Oscillators are harsh at the top and are cut lower than recorded instruments, which lose their air there.
        this.bus = o.ctx.createGain();
        const soft = o.ctx.createBiquadFilter();
        soft.type = 'lowpass';
        soft.frequency.value = o.bank.state === 'ready' ? 9000 : 5200;
        soft.Q.value = 0.5;
        this.bus.connect(soft);
        if (o.bank.state === 'ready') {
          const trim = o.ctx.createGain();
          trim.gain.value = BAND;
          soft.connect(trim);
          trim.connect(o.music);
        } else soft.connect(o.music);
      }
      const slotTime = 30 / theme.bpm;
      while (this.at < now + AHEAD) {
        this.write(o, theme, this.slot, this.at, slotTime);
        this.at += slotTime;
        this.slot++;
        if (this.slot >= BARS * SLOTS) {
          this.slot = 0;
          this.round++;
        }
      }
    } catch {
      // A note that cannot be made is skipped, and the next is tried in its turn.
      this.at = now + AHEAD;
    }
  }

  /** Everything that starts on one slot. */
  private write(o: Out, theme: Theme, slot: number, t: number, slotTime: number): void {
    if (o.bank.state === 'ready') {
      this.perform(o, theme, slot, t, slotTime);
      return;
    }
    const bar = Math.floor(slot / SLOTS);
    const beat = slot % SLOTS;
    const battle = this.mood === 'battle';
    const chord = chordOf(theme, bar);
    const bus = this.bus as GainLike;

    // The pad: the chord, held for the bar, low and soft.
    if (beat === 0) {
      for (const step of chord) this.tone(o, bus, 'triangle', hertz(midiOf(theme, step) - 12), t, slotTime * SLOTS, 0.028, 0.5, 0.6);
    }
    // The bass: the chord's root, two octaves down, but never so low that a phone's speaker loses it.
    // On the first and third beats when calm, driven in eighths in a battle.
    let low = midiOf(theme, chord[0]) - 24;
    while (low < LOWEST) low += 12;
    const root = hertz(low);
    if (battle) {
      const fifth = hertz(low + midiOf(theme, chord[2]) - midiOf(theme, chord[0]));
      this.tone(o, bus, 'triangle', beat === 3 || beat === 7 ? fifth : root, t, slotTime * 0.9, beat % 2 === 0 ? 0.11 : 0.07, 0.01, 0.1);
    } else if (beat === 0 || beat === 4) {
      this.tone(o, bus, 'triangle', root, t, slotTime * 3.2, beat === 0 ? 0.11 : 0.07, 0.015, 0.5);
    }
    // A plucked note of the chord off the beat, when calm: something moving under a tune that rests.
    if (!battle && (beat === 2 || beat === 6)) {
      this.pluck(o, bus, hertz(midiOf(theme, chord[beat === 2 ? 1 : 2])), t, 0.045, 0.3);
    }
    // The tune. Every third time round it rests for the first half.
    const note = this.notes[slot];
    const rests = this.round % 3 === 2 && bar < BARS / 2;
    if (note && !rests) this.sing(o, bus, theme, hertz(midiOf(theme, note.step)), t, note.slots * slotTime, battle);
    // The drums of a battle.
    if (battle) this.drum(o, bus, theme.drums[slot % theme.drums.length], t);
  }

  /** Everything that starts on one slot, on the bank's instruments. */
  private perform(o: Out, theme: Theme, slot: number, t: number, slotTime: number): void {
    const bar = Math.floor(slot / SLOTS);
    const beat = slot % SLOTS;
    const battle = this.mood === 'battle';
    const chord = chordOf(theme, bar);
    const bus = this.bus as GainLike;

    // The cellos: the chord, held for the bar, an octave under the tune, coming in softly.
    // A note under the lowest one recorded is played an octave up, where it is still a note of the chord.
    if (beat === 0) {
      for (const step of chord) {
        const m = midiOf(theme, step) - 12;
        this.note(o, bus, 'cello', m < PAD_LOWEST ? m + 12 : m, t, PAD, slotTime * SLOTS, 0.3, 0.5);
      }
    }
    // The bass, plucked: the chord's root, two octaves down, but never so low that a phone's speaker loses it.
    // On the first and third beats when calm and left to ring, driven in eighths in a battle and damped.
    let low = midiOf(theme, chord[0]) - 24;
    while (low < LOWEST) low += 12;
    if (battle) {
      const fifth = low + midiOf(theme, chord[2]) - midiOf(theme, chord[0]);
      this.note(o, bus, 'bass', beat === 3 || beat === 7 ? fifth : low, t, beat % 2 === 0 ? BASS : BASS * 0.65, slotTime * 0.9, 0, 0.06);
    } else if (beat === 0 || beat === 4) {
      this.note(o, bus, 'bass', low, t, beat === 0 ? BASS : BASS * 0.65, slotTime * 3.2, 0, 0.3);
    }
    // A note of the chord on the harp off the beat, when calm: something moving under a tune that rests.
    if (!battle && (beat === 2 || beat === 6)) {
      this.note(o, bus, 'harp', midiOf(theme, chord[beat === 2 ? 1 : 2]), t, PLUCK);
    }
    // The tune. Every third time round it rests for the first half.
    const note = this.notes[slot];
    const rests = this.round % 3 === 2 && bar < BARS / 2;
    if (note && !rests) {
      const midi = midiOf(theme, note.step);
      const dur = note.slots * slotTime;
      const loud = battle ? 1.25 : 1;
      if (theme.voice === 'bell') {
        // A harp, left to ring on past its length; and on its long notes a small bell two octaves over it.
        this.note(o, bus, 'harp', midi, t, TUNE.bell * loud);
        if (note.slots >= 4) this.note(o, bus, 'glock', midi + 24, t, 0.05 * loud);
      } else if (theme.voice === 'reed') this.note(o, bus, 'oboe', midi, t, TUNE.reed * loud, dur * 0.94, 0.012, 0.09);
      else this.note(o, bus, 'flute', midi, t, TUNE.flute * loud, dur * 0.94, 0.012, 0.09);
      // In a battle a flute plays it too, an octave up.
      if (battle) this.note(o, bus, 'flute', midi + 12, t, OVER, dur * 0.85, 0.012, 0.08);
    }
    // The drums of a battle.
    if (battle) {
      const drum = theme.kit[theme.drums[slot % theme.drums.length]];
      const sample = drum && o.bank.get(drum[0]);
      if (drum && sample) strike(o.ctx, bus, sample, t, drum[1]);
    }
  }

  /** A note on one of the bank's instruments. Without `dur` it rings to its own end. */
  private note(o: Out, to: GainLike, instrument: Instrument, midi: number, t: number, gain: number, dur?: number, attack = 0, release = 0.06): void {
    const { name, rate } = nearest(instrument, midi);
    const sample = o.bank.get(name);
    if (sample) strike(o.ctx, to, sample, t, gain, rate, dur, release, attack);
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
    gain.gain.linearRampToValueAtTime(peak, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(to);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  /** A note of the tune, in the theme's voice. In a battle it is a little louder, and doubled an octave up. */
  private sing(o: Out, to: GainLike, theme: Theme, freq: number, t: number, dur: number, battle: boolean): void {
    const loud = battle ? 1.25 : 1;
    if (theme.voice === 'bell') {
      // Struck, and ringing on past its length: the note, and a quiet one two octaves and a third above it.
      this.pluck(o, to, freq, t, 0.1 * loud, Math.max(1.1, dur * 1.6));
      this.pluck(o, to, freq * 5.04, t, 0.012 * loud, 0.5);
      this.pluck(o, to, freq * 2, t, 0.03 * loud, Math.max(0.7, dur));
    } else if (theme.voice === 'reed') {
      // A square is a reed's hollow sound; a sine under it rounds it.
      this.tone(o, to, 'square', freq, t, dur * 0.92, 0.032 * loud, 0.02, 0.07);
      this.tone(o, to, 'sine', freq, t, dur * 0.92, 0.06 * loud, 0.02, 0.07);
    } else {
      this.tone(o, to, 'sine', freq, t, dur * 0.9, 0.1 * loud, 0.025, 0.08);
      this.tone(o, to, 'triangle', freq * 2, t, dur * 0.9, 0.022 * loud, 0.03, 0.06);
    }
    if (battle) this.tone(o, to, 'triangle', freq * 2, t, dur * 0.8, 0.03, 0.015, 0.06);
  }

  /** One stroke of a drum. */
  private drum(o: Out, to: GainLike, kind: string, t: number): void {
    if (kind === 'k') {
      // A kick: a low note that falls.
      const osc = o.ctx.createOscillator();
      const gain = o.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.exponentialRampToValueAtTime(46, t + 0.13);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(gain);
      gain.connect(to);
      osc.start(t);
      osc.stop(t + 0.23);
    } else if (kind === 't') {
      // A tom, or the open hand on a frame drum: higher, and shorter.
      const osc = o.ctx.createOscillator();
      const gain = o.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(210, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.17, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(gain);
      gain.connect(to);
      osc.start(t);
      osc.stop(t + 0.18);
      this.hiss(o, to, 'bandpass', 1500, t, 0.05, 0.05);
    } else if (kind === 's') this.hiss(o, to, 'bandpass', 1900, t, 0.12, 0.13);
    else if (kind === 'h') this.hiss(o, to, 'highpass', 6500, t, 0.035, 0.035);
  }

  /** A burst of noise through a filter: a snare, a hat. */
  private hiss(o: Out, to: GainLike, filter: string, freq: number, t: number, dur: number, peak: number): void {
    const src = o.ctx.createBufferSource();
    const f = o.ctx.createBiquadFilter();
    const gain = o.ctx.createGain();
    src.buffer = o.noise;
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = 0.9;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.004);
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
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(peak, t + up);
  param.setValueAtTime(peak, t + Math.max(up, dur));
  param.linearRampToValueAtTime(0.0001, t + Math.max(up, dur) + release);
}

/** The game's one band. It plays through the same mix as the effects. */
export const music = new Music(() => sfx.out);
