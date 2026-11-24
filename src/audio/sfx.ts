// Every sound in the game, made in code. There are no audio files: a sound
// is a few oscillators and bursts of noise with an envelope on each, built
// when it is asked for. That keeps the build small and the sounds as much
// the game's own as the art is.
//
// A browser will not make a sound until the player has touched the page, so
// nothing is created before unlock() is called from an input event.

/** The little of the Web Audio API this needs, so that a test can stand in for it. */
export interface AudioLike {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly destination: unknown;
  state?: string;
  resume?: () => Promise<void> | void;
  createGain(): GainLike;
  createOscillator(): OscLike;
  createBiquadFilter(): FilterLike;
  createBufferSource(): SourceLike;
  createBuffer(channels: number, length: number, rate: number): { getChannelData(c: number): Float32Array };
}
interface ParamLike {
  value: number;
  setValueAtTime(v: number, t: number): unknown;
  linearRampToValueAtTime(v: number, t: number): unknown;
  exponentialRampToValueAtTime(v: number, t: number): unknown;
}
interface NodeLike {
  connect(to: unknown): unknown;
}
interface GainLike extends NodeLike {
  gain: ParamLike;
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

interface Recipe {
  tones?: Tone[];
  noise?: Noise[];
  /** The least time between two of this sound, in seconds: a dozen hits in one step are one thud, not a roar. */
  gap?: number;
}

// Notes, in hertz.
const C4 = 261.6;
const D4 = 293.7;
const E4 = 329.6;
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

/** What a pack's card sounds like, by its tier: the rarer, the longer the flourish. */
const REVEALS: Recipe[] = [
  { tones: run([C5, E5], 0.07, 0.16, 0.16) },
  { tones: run([C5, E5, G5], 0.07, 0.18, 0.16) },
  { tones: run([C5, E5, G5, C6], 0.07, 0.22, 0.17) },
  { tones: [...run([C5, E5, G5, C6, E6], 0.07, 0.26, 0.17), { wave: 'sine', from: C6, dur: 0.6, gain: 0.07, at: 0.35 }] },
  {
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
  click: { tones: [{ wave: 'triangle', from: 700, to: 940, dur: 0.045, gain: 0.14 }], gap: 0.03 },
  place: {
    tones: [{ wave: 'sine', from: 190, to: 110, dur: 0.09, gain: 0.26 }],
    noise: [{ filter: 'lowpass', from: 500, dur: 0.05, gain: 0.1 }],
  },
  lift: { tones: [{ wave: 'sine', from: 300, to: 460, dur: 0.07, gain: 0.12 }] },
  fight: {
    tones: [
      { wave: 'sawtooth', from: 196, to: 262, dur: 0.34, gain: 0.1 },
      { wave: 'triangle', from: 392, to: 523, dur: 0.34, gain: 0.1 },
    ],
  },
  coin: { tones: [{ wave: 'sine', from: E6, dur: 0.07, gain: 0.13 }, { wave: 'sine', from: G6 * 1.12, dur: 0.16, gain: 0.13, at: 0.06 }], gap: 0.05 },
  levelUp: { tones: run([C5, E5, G5, C6], 0.06, 0.16, 0.14) },
  buy: { tones: run([G5, C6], 0.06, 0.12, 0.13, 'sine') },

  // A battle.
  slash: { noise: [{ filter: 'bandpass', from: 900, to: 2800, q: 1.1, dur: 0.11, gain: 0.2 }], gap: 0.05 },
  hit: {
    tones: [{ wave: 'sine', from: 150, to: 70, dur: 0.09, gain: 0.3 }],
    noise: [{ filter: 'lowpass', from: 1300, to: 300, dur: 0.07, gain: 0.24 }],
    gap: 0.05,
  },
  bigHit: {
    tones: [{ wave: 'sine', from: 120, to: 45, dur: 0.2, gain: 0.42 }],
    noise: [{ filter: 'lowpass', from: 1500, to: 200, dur: 0.16, gain: 0.3 }],
    gap: 0.08,
  },
  shoot: {
    tones: [{ wave: 'triangle', from: 920, to: 480, dur: 0.06, gain: 0.1 }],
    noise: [{ filter: 'highpass', from: 2200, to: 5200, dur: 0.07, gain: 0.12 }],
    gap: 0.04,
  },
  thud: {
    tones: [{ wave: 'sine', from: 230, to: 110, dur: 0.05, gain: 0.2 }],
    noise: [{ filter: 'lowpass', from: 900, dur: 0.03, gain: 0.1 }],
    gap: 0.04,
  },
  cast: {
    tones: [
      { wave: 'sine', from: 420, to: 900, dur: 0.22, gain: 0.13 },
      { wave: 'sine', from: 840, to: 1800, dur: 0.22, gain: 0.05 },
    ],
    gap: 0.06,
  },
  blast: {
    tones: [{ wave: 'sine', from: 210, to: 48, dur: 0.28, gain: 0.36 }],
    noise: [{ filter: 'lowpass', from: 1900, to: 180, dur: 0.26, gain: 0.26 }],
    gap: 0.08,
  },
  heal: { tones: [{ wave: 'triangle', from: E5, dur: 0.12, gain: 0.11 }, { wave: 'triangle', from: G5 * 1.122, dur: 0.18, gain: 0.11, at: 0.08 }], gap: 0.1 },
  skill: { tones: run([C5, E5, G5], 0.055, 0.1, 0.15), gap: 0.12 },
  status: { tones: [{ wave: 'square', from: 320, to: 210, dur: 0.06, gain: 0.05 }], gap: 0.1 },
  death: {
    tones: [{ wave: 'triangle', from: 300, to: 85, dur: 0.26, gain: 0.18 }],
    noise: [{ filter: 'lowpass', from: 520, dur: 0.12, gain: 0.16, at: 0.36 }],
    gap: 0.08,
  },
  victory: {
    tones: [
      ...run([G4, C5, E5, G5], 0.12, 0.2, 0.16),
      { wave: 'triangle', from: C5, dur: 0.7, gain: 0.12, at: 0.5 },
      { wave: 'triangle', from: E5, dur: 0.7, gain: 0.1, at: 0.5 },
      { wave: 'triangle', from: G5, dur: 0.7, gain: 0.1, at: 0.5 },
    ],
  },
  defeat: { tones: run([E4, D4, C4], 0.2, 0.34, 0.15) },

  // A pack.
  packShake: { noise: [0, 0.07, 0.14].map((at) => ({ filter: 'bandpass' as const, from: 2600, q: 2, dur: 0.035, gain: 0.12, at })), gap: 0.1 },
  packOpen: {
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
  enabled = true;
  private ctx: AudioLike | null = null;
  private master: GainLike | null = null;
  private noise: unknown = null;
  private last: Partial<Record<SoundName, number>> = {};

  /** `make` builds the audio context. The game passes the browser's; a test passes a stand-in. */
  constructor(private readonly make: () => AudioLike | null) {}

  /** Call from an input event. Until then, play() does nothing. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const ctx = this.make();
        if (!ctx) return;
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(ctx.destination);
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
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume?.();
    } catch {
      // No audio on this device: the game is silent, and nothing else changes.
      this.ctx = null;
    }
  }

  /** Plays a sound. `pitch` shifts it, `volume` scales it. Safe to call before unlock and when muted. */
  play(name: SoundName, volume = 1, pitch = 1): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!this.enabled || !ctx || !master) return;
    const recipe: Recipe = SOUNDS[name];
    const now = ctx.currentTime;
    const last = this.last[name];
    if (last !== undefined && now - last < (recipe.gap ?? 0.02)) return;
    this.last[name] = now;
    try {
      for (const t of recipe.tones ?? []) {
        const t0 = now + (t.at ?? 0);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = t.wave;
        osc.frequency.setValueAtTime(t.from * pitch, t0);
        if (t.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, t.to * pitch), t0 + t.dur);
        envelope(gain.gain, t0, t.dur, t.gain * volume);
        osc.connect(gain);
        gain.connect(master);
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
        envelope(gain.gain, t0, n.dur, n.gain * volume);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(master);
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
