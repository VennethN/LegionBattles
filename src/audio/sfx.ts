// Every sound in the game, made in code. There are no audio files: a sound
// is a few oscillators and bursts of noise with an envelope on each, built
// when it is asked for. That keeps the build small and the sounds as much
// the game's own as the art is.
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
  click: { tones: [{ wave: 'triangle', from: 660, to: 880, dur: 0.05, gain: 0.11 }, { wave: 'sine', from: 1320, dur: 0.03, gain: 0.03 }], gap: 0.03 },
  // A screen opens over the field, and shuts: a breath up, a breath down.
  open: {
    tones: [{ wave: 'sine', from: 330, to: 560, dur: 0.12, gain: 0.07 }],
    noise: [{ filter: 'bandpass', from: 700, to: 2400, q: 0.8, dur: 0.14, gain: 0.07 }],
    gap: 0.08,
  },
  close: {
    tones: [{ wave: 'sine', from: 520, to: 300, dur: 0.11, gain: 0.07 }],
    noise: [{ filter: 'bandpass', from: 2000, to: 600, q: 0.8, dur: 0.12, gain: 0.06 }],
    gap: 0.08,
  },
  // A switch thrown, a step on a slider.
  tick: { tones: [{ wave: 'square', from: 520, dur: 0.025, gain: 0.04 }, { wave: 'sine', from: 780, dur: 0.05, gain: 0.07, at: 0.012 }], gap: 0.025 },
  // Not enough coins, not open yet.
  deny: { tones: [{ wave: 'triangle', from: 196, dur: 0.09, gain: 0.13 }, { wave: 'triangle', from: 156, dur: 0.14, gain: 0.13, at: 0.085 }], gap: 0.1 },
  // A tutorial's note comes up.
  pop: { tones: [{ wave: 'sine', from: 420, to: 760, dur: 0.07, gain: 0.12 }], gap: 0.08 },
  // A reward is claimed.
  claim: {
    tones: [...run([G5, C6, E6], 0.06, 0.2, 0.12, 'sine'), { wave: 'triangle', from: C5, dur: 0.4, gain: 0.07 }],
    noise: [{ filter: 'highpass', from: 4000, to: 9000, dur: 0.3, gain: 0.03, at: 0.1 }],
  },
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
  slash: { noise: [{ filter: 'bandpass', from: 900, to: 2800, q: 1.1, dur: 0.11, gain: 0.2 }], gap: 0.05, crowd: true, vary: 0.06 },
  hit: {
    tones: [{ wave: 'sine', from: 150, to: 70, dur: 0.09, gain: 0.3 }],
    noise: [{ filter: 'lowpass', from: 1300, to: 300, dur: 0.07, gain: 0.24 }],
    gap: 0.05,
    crowd: true,
    vary: 0.07,
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
    crowd: true,
    vary: 0.05,
  },
  thud: {
    tones: [{ wave: 'sine', from: 230, to: 110, dur: 0.05, gain: 0.2 }],
    noise: [{ filter: 'lowpass', from: 900, dur: 0.03, gain: 0.1 }],
    gap: 0.04,
    crowd: true,
    vary: 0.06,
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
  status: { tones: [{ wave: 'square', from: 320, to: 210, dur: 0.06, gain: 0.05 }], gap: 0.1, crowd: true },
  // Someone is called up onto the field: a horn's two notes, and feet landing.
  spawn: {
    tones: [{ wave: 'triangle', from: G4, dur: 0.1, gain: 0.1 }, { wave: 'triangle', from: C5, dur: 0.16, gain: 0.1, at: 0.08 }],
    noise: [{ filter: 'lowpass', from: 700, dur: 0.06, gain: 0.1, at: 0.16 }],
    gap: 0.15,
  },
  // A trap goes off: the snap of it before whatever it does.
  trap: {
    tones: [{ wave: 'square', from: 1400, to: 500, dur: 0.035, gain: 0.07 }],
    noise: [{ filter: 'highpass', from: 2500, dur: 0.04, gain: 0.18 }, { filter: 'lowpass', from: 900, to: 200, dur: 0.12, gain: 0.16, at: 0.03 }],
    gap: 0.08,
  },
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

  /** `make` builds the audio context. The game passes the browser's; a test passes a stand-in. */
  constructor(private readonly make: () => AudioLike | null) {}

  /** False when the player has turned all sound off: effects and music both. */
  get enabled(): boolean {
    return this.on;
  }
  set enabled(on: boolean) {
    this.on = on;
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
    this.master.gain.value = this.on ? 0.9 : 0;
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
        this.level();
      }
      if (this.ctx.state === 'suspended' && !this.asleep) void this.ctx.resume?.();
    } catch {
      // No audio on this device: the game is silent, and nothing else changes.
      this.ctx = null;
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
   * What the music plays through: the context, its own volume, and the
   * noise. Null until the page has been touched, and while there is nothing
   * to hear of it (sound off, or the music turned to nothing): then no note
   * is made at all.
   */
  get out(): { ctx: AudioLike; music: GainLike; noise: unknown } | null {
    if (!this.on || this.musicVolume <= 0) return null;
    return this.ctx && this.songs ? { ctx: this.ctx, music: this.songs, noise: this.noise } : null;
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
    if (!this.on || !ctx || !out || this.effectsVolume <= 0) return;
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
