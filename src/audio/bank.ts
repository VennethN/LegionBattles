// The bank: the recorded sounds the game plays, kept in one file,
// public/assets/audio/bank.bin. It was cut for the Legion games (the script
// that cut it, and says where each sound came from, is kept with them in
// VennethN/game-assets, styles/legion/audio/tools/samples.mjs), and the
// five sounds this game never plays were taken out of it here. An orchestra's instruments a note at a time,
// drums, bells and cymbals, and the clicks of an interface.
//
// The effects (sfx.ts) and the music (music.ts) play from it when it is
// there. Until it has come in, and on a device that cannot read it, they
// make their sounds from oscillators as they did before there was a bank,
// so the game is never silent for want of a file.

/** A sound of the bank, ready to be played. */
export interface Sample {
  /** What a buffer source plays. */
  buffer: unknown;
  /** Seconds of nothing at its start, which playing skips: an MP3 is given back with a little silence before it. */
  lead: number;
}

/** What a decoded sound is, as far as the bank looks at it. */
export interface BufferLike {
  readonly sampleRate: number;
  readonly length: number;
  getChannelData(channel: number): Float32Array;
}

/** The notes each instrument was recorded at, as MIDI numbers. The notes between are these played faster or slower. */
export const INSTRUMENTS = {
  flute: [69, 72, 76, 81, 84, 88],
  oboe: [62, 65, 70, 74],
  harp: [52, 59, 65, 72, 79],
  glock: [79, 84, 91],
  cello: [50, 57, 64],
  bass: [38, 42, 45, 49],
  trumpet: [67, 70, 77],
  horn: [57],
  pizz: [76],
  // A church bell, one stroke. Played slower it is a bigger bell and rings longer.
  bell: [72],
} as const satisfies Record<string, readonly number[]>;

export type Instrument = keyof typeof INSTRUMENTS;

/**
 * How long each instrument's recordings are, in seconds, at the pitch they
 * were recorded at (measured from the bank's file). The music asks, so that
 * a note held longer than its recording is bowed or blown again and not cut
 * off: a cello is recorded for nearly four seconds, a horn for half of one.
 */
export const LENGTHS: Readonly<Record<string, number>> = {
  cello: 3.8,
  flute: 1.7,
  oboe: 1.8,
  harp: 1.5,
  bass: 1.3,
  bell: 2.2,
  glock: 1,
  trumpet: 0.6,
  horn: 0.5,
  pizz: 0.5,
  timpani: 1.5,
};

/** The recorded note of an instrument nearest to a pitch, and how fast to play it to get that pitch. */
export function nearest(instrument: Instrument, midi: number): { name: string; rate: number } {
  const notes: readonly number[] = INSTRUMENTS[instrument];
  let best = notes[0];
  for (const n of notes) if (Math.abs(n - midi) < Math.abs(best - midi)) best = n;
  return { name: `${instrument}-${best}`, rate: Math.pow(2, (midi - best) / 12) };
}

/** The sounds of a bank file, each as the bytes of an MP3. Throws on a file that is not a bank. */
export function parse(bytes: ArrayBuffer): Array<{ name: string; data: ArrayBuffer }> {
  const view = new DataView(bytes);
  if (bytes.byteLength < 8 || view.getUint32(0, false) !== 0x4c424131) throw new Error('bank: not a bank file');
  const headLength = view.getUint32(4, true);
  const head = new Uint8Array(bytes, 8, headLength);
  let text = '';
  for (let i = 0; i < head.length; i++) text += String.fromCharCode(head[i]);
  const list = JSON.parse(text) as Array<[string, number]>;
  const out: Array<{ name: string; data: ArrayBuffer }> = [];
  let at = 8 + headLength;
  for (const [name, size] of list) {
    if (at + size > bytes.byteLength) throw new Error(`bank: ${name} runs past the end of the file`);
    out.push({ name, data: bytes.slice(at, at + size) });
    at += size;
  }
  return out;
}

/** Where a decoded sound really starts: the first moment that is not silence, less a thousandth of a second. */
export function leadOf(buffer: BufferLike): number {
  const data = buffer.getChannelData(0);
  const end = Math.min(data.length, Math.floor(buffer.sampleRate * 0.2));
  let i = 0;
  while (i < end && Math.abs(data[i]) < 0.012) i++;
  if (i >= end) return 0;
  return Math.max(0, i / buffer.sampleRate - 0.001);
}

export class Bank {
  private readonly sounds = new Map<string, Sample>();
  /**
   * Empty: nothing was asked for. Loading: the file is on its way or being
   * read. Ready: every sound is in. Failed: there will be none.
   */
  state: 'empty' | 'loading' | 'ready' | 'failed' = 'empty';

  get(name: string): Sample | undefined {
    return this.sounds.get(name);
  }

  put(name: string, buffer: unknown, lead = 0): void {
    this.sounds.set(name, { buffer, lead });
  }

  /** Every name in it. */
  names(): string[] {
    return [...this.sounds.keys()];
  }

  /**
   * Reads a bank file into it. `decode` turns the bytes of one MP3 into a
   * sound. All are asked for at once: a browser reads them side by side in
   * a tenth of a second, and one after another in five. A sound that cannot
   * be read fails the whole bank: half an orchestra is worse than the
   * oscillators.
   */
  async fill(bytes: ArrayBuffer, decode: (mp3: ArrayBuffer) => Promise<BufferLike>): Promise<void> {
    this.state = 'loading';
    try {
      const parts = parse(bytes);
      const buffers = await Promise.all(parts.map((part) => decode(part.data)));
      parts.forEach((part, i) => this.put(part.name, buffers[i], leadOf(buffers[i])));
      this.state = 'ready';
    } catch {
      this.sounds.clear();
      this.state = 'failed';
    }
  }
}

/** The rate the bank was written at. Read at the same, it takes the least room. */
const BANK_RATE = 32000;

/** What turns an MP3 into a sound in a browser, or null where there is nothing that can. */
export function browserDecoder(): ((mp3: ArrayBuffer) => Promise<BufferLike>) | null {
  if (typeof window === 'undefined') return null;
  type Offline = new (channels: number, length: number, rate: number) => {
    decodeAudioData(data: ArrayBuffer, done?: (b: BufferLike) => void, failed?: (e: unknown) => void): Promise<BufferLike> | void;
  };
  const w = window as unknown as { OfflineAudioContext?: Offline; webkitOfflineAudioContext?: Offline };
  const Ctor = w.OfflineAudioContext ?? w.webkitOfflineAudioContext;
  if (!Ctor) return null;
  // An offline context reads sound without the page having been touched, which the game's own context cannot be made before.
  // Some browsers make one only at the usual rates: then the sounds are read at one of those, and take a little more room.
  let ctx: InstanceType<Offline> | null = null;
  for (const rate of [BANK_RATE, 44100, 48000]) {
    try {
      ctx = new Ctor(1, 1, rate);
      break;
    } catch {
      // The next rate is tried.
    }
  }
  if (!ctx) return null;
  const reader = ctx;
  // The old form with two callbacks is the one every browser has.
  return (mp3) =>
    new Promise<BufferLike>((resolve, reject) => {
      try {
        const r = reader.decodeAudioData(mp3, resolve, reject);
        if (r && typeof (r as Promise<BufferLike>).catch === 'function') (r as Promise<BufferLike>).catch(reject);
      } catch (e) {
        reject(e);
      }
    });
}

/** The game's one bank. */
export const bank = new Bank();

/** Reads the bank's file into the game's bank. Without it, or without a browser that can read it, the bank has failed. */
export function fillBank(bytes: ArrayBuffer | null | undefined): Promise<void> {
  const decode = browserDecoder();
  if (!bytes || !decode) {
    bank.state = 'failed';
    return Promise.resolve();
  }
  return bank.fill(bytes, decode);
}
