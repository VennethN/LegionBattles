// A stand-in for the browser's audio, for the tests of the effects and of
// the music: it counts what is built, keeps when each thing is to start
// and stop, and fails on a number no speaker could play.

import fs from 'node:fs';
import { expect } from 'vitest';
import { Bank, parse } from '../src/audio/bank';
import type { AudioLike } from '../src/audio/sfx';

/** One thing played from a buffer: a burst of noise, or a sound of the bank. */
export interface FakeSource {
  buffer: unknown;
  playbackRate: { value: number };
  /** When it starts, and how far into the buffer. */
  at: number;
  offset: number;
}

export interface FakeAudio {
  ctx: AudioLike;
  made: { osc: number; noise: number };
  /** When each oscillator and burst of noise starts and stops, and the pitch each oscillator starts at. */
  starts: number[];
  ends: number[];
  pitches: number[];
  /** Everything played from a buffer, in the order it was made. */
  sources: FakeSource[];
  clock: { t: number };
}

/** The bank's file as it is kept in the repository. */
export function bankFile(): ArrayBuffer {
  const b = fs.readFileSync('public/assets/audio/bank.bin');
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

/** A bank with every sound of the real one in it by name, and nothing to hear: each buffer says only which it is. */
export function fakeBank(without: string[] = []): Bank {
  const bank = new Bank();
  for (const part of parse(bankFile())) if (!without.includes(part.name)) bank.put(part.name, { sample: part.name });
  bank.state = 'ready';
  return bank;
}

/** The sounds of the bank among what a stand-in played, by name. */
export function sampled(f: FakeAudio): string[] {
  return f.sources.map((s) => (s.buffer as { sample?: string } | null)?.sample).filter((n): n is string => !!n);
}

export function fakeAudio(): FakeAudio {
  const made = { osc: 0, noise: 0 };
  const starts: number[] = [];
  const ends: number[] = [];
  const pitches: number[] = [];
  const sources: FakeSource[] = [];
  const clock = { t: 10 };
  const param = (seen?: number[]) => {
    const p = {
      value: 0,
      setValueAtTime: (v: number, t: number) => {
        expect(Number.isFinite(v) && Number.isFinite(t)).toBe(true);
        seen?.push(v);
        return p;
      },
      linearRampToValueAtTime: (v: number, t: number) => {
        expect(v).toBeGreaterThan(0);
        expect(t).toBeGreaterThanOrEqual(clock.t);
        return p;
      },
      exponentialRampToValueAtTime: (v: number, t: number) => {
        expect(v).toBeGreaterThan(0);
        expect(t).toBeGreaterThanOrEqual(clock.t);
        return p;
      },
    };
    return p;
  };
  const node = () => ({ connect: (to: unknown) => to });
  const begin = (t: number): void => {
    // Nothing is asked to have sounded already.
    expect(t).toBeGreaterThanOrEqual(clock.t - 1e-6);
    starts.push(t);
  };
  const ctx: AudioLike = {
    get currentTime() {
      return clock.t;
    },
    sampleRate: 8000,
    destination: {},
    state: 'running',
    createGain: () => ({ ...node(), gain: param() }),
    createOscillator: () => {
      made.osc++;
      return { ...node(), type: 'sine', frequency: param(pitches), start: begin, stop: (t: number) => { ends.push(t); } };
    },
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: param(), Q: param() }),
    createBufferSource: () => {
      made.noise++;
      const src: FakeSource & { connect(to: unknown): unknown; start(t: number, offset?: number): void; stop(t: number): void } = {
        ...node(),
        buffer: null,
        playbackRate: { value: 1 },
        at: 0,
        offset: 0,
        start: (t: number, offset = 0) => {
          begin(t);
          src.at = t;
          src.offset = offset;
        },
        stop: (t: number) => { ends.push(t); },
      };
      sources.push(src);
      return src;
    },
    createBuffer: (_c: number, length: number) => {
      const data = new Float32Array(length);
      return { getChannelData: () => data };
    },
  };
  return { ctx, made, starts, ends, pitches, sources, clock };
}
