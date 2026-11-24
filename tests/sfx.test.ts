import { describe, expect, it } from 'vitest';
import { SOUNDS, Sfx, type AudioLike, type SoundName } from '../src/audio/sfx';

/** Stands in for the browser's audio: counts what is built and when it is to sound. */
function fake(): { ctx: AudioLike; made: { osc: number; noise: number }; ends: number[]; clock: { t: number } } {
  const made = { osc: 0, noise: 0 };
  const ends: number[] = [];
  const clock = { t: 10 };
  const param = () => {
    const p = {
      value: 0,
      setValueAtTime: (v: number, t: number) => { expect(Number.isFinite(v) && Number.isFinite(t)).toBe(true); return p; },
      linearRampToValueAtTime: (v: number, t: number) => { expect(v).toBeGreaterThan(0); expect(t).toBeGreaterThanOrEqual(clock.t); return p; },
      exponentialRampToValueAtTime: (v: number, t: number) => { expect(v).toBeGreaterThan(0); expect(t).toBeGreaterThanOrEqual(clock.t); return p; },
    };
    return p;
  };
  const node = () => ({ connect: (to: unknown) => to });
  const ctx: AudioLike = {
    get currentTime() { return clock.t; },
    sampleRate: 8000,
    destination: {},
    state: 'running',
    createGain: () => ({ ...node(), gain: param() }),
    createOscillator: () => { made.osc++; return { ...node(), type: 'sine', frequency: param(), start: () => {}, stop: (t: number) => { ends.push(t); } }; },
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: param(), Q: param() }),
    createBufferSource: () => { made.noise++; return { ...node(), buffer: null, start: () => {}, stop: (t: number) => { ends.push(t); } }; },
    createBuffer: (_c: number, length: number) => { const data = new Float32Array(length); return { getChannelData: () => data }; },
  };
  return { ctx, made, ends, clock };
}

describe('sound effects', () => {
  it('make no sound before the player has touched the page, or when muted', () => {
    const f = fake();
    const s = new Sfx(() => f.ctx);
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBe(0);
    s.unlock();
    s.enabled = false;
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBe(0);
  });

  it('every sound can be made, is short, and is not silent', () => {
    for (const name of Object.keys(SOUNDS) as SoundName[]) {
      const f = fake();
      const s = new Sfx(() => f.ctx);
      s.unlock();
      s.play(name);
      expect(f.made.osc + f.made.noise, name).toBeGreaterThan(0);
      // Nothing rings on for more than two seconds.
      expect(Math.max(...f.ends) - f.clock.t, name).toBeLessThan(2);
    }
  });

  it('a burst of the same sound in one moment is one sound', () => {
    const f = fake();
    const s = new Sfx(() => f.ctx);
    s.unlock();
    for (let i = 0; i < 12; i++) s.play('hit');
    const once = f.made.osc + f.made.noise;
    expect(once).toBe(2);
    f.clock.t += 0.2;
    s.play('hit');
    expect(f.made.osc + f.made.noise).toBe(once * 2);
  });

  it('a device with no audio leaves the game silent, not broken', () => {
    const s = new Sfx(() => null);
    s.unlock();
    expect(() => s.play('victory')).not.toThrow();
    const broken = new Sfx(() => { throw new Error('no audio'); });
    expect(() => broken.unlock()).not.toThrow();
    expect(() => broken.play('click')).not.toThrow();
  });

  it('a rarer card has a longer flourish', () => {
    const len = (name: SoundName): number => {
      const f = fake();
      const s = new Sfx(() => f.ctx);
      s.unlock();
      s.play(name);
      return Math.max(...f.ends) - f.clock.t;
    };
    expect(len('reveal4')).toBeGreaterThan(len('reveal2'));
    expect(len('reveal2')).toBeGreaterThan(len('reveal0'));
  });
});
