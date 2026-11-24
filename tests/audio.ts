// A stand-in for the browser's audio, for the tests of the effects and of
// the music: it counts what is built, keeps when each thing is to start
// and stop, and fails on a number no speaker could play.

import { expect } from 'vitest';
import type { AudioLike } from '../src/audio/sfx';

export interface FakeAudio {
  ctx: AudioLike;
  made: { osc: number; noise: number };
  /** When each oscillator and burst of noise starts and stops, and the pitch each oscillator starts at. */
  starts: number[];
  ends: number[];
  pitches: number[];
  clock: { t: number };
}

export function fakeAudio(): FakeAudio {
  const made = { osc: 0, noise: 0 };
  const starts: number[] = [];
  const ends: number[] = [];
  const pitches: number[] = [];
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
      return { ...node(), buffer: null, start: begin, stop: (t: number) => { ends.push(t); } };
    },
    createBuffer: (_c: number, length: number) => {
      const data = new Float32Array(length);
      return { getChannelData: () => data };
    },
  };
  return { ctx, made, starts, ends, pitches, clock };
}
