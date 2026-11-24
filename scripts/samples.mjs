// VSCO=<folder> KENNEY=<folder> node scripts/samples.mjs
//
// Makes the game's bank of recorded sounds, public/assets/audio/bank.bin,
// from two free libraries that are not kept in this repository:
//
//   VSCO 2 Community Edition, an orchestra recorded a note at a time
//     (github.com/sgossner/VSCO-2-CE), for the instruments and the drums.
//   Kenney's Interface Sounds (kenney.nl), for the buttons and the menus.
//
// Both are CC0: public domain, no credit owed. They are credited all the
// same, in public/assets/audio/CREDITS.txt.
//
// Each sound below is cut from one recording: the silence before it is
// taken off, it is cut to the length the game needs with a fade at its
// end, brought up to the same loudness as the rest, and written as a small
// mono MP3. The MP3s are laid end to end in one file, with a list of their
// names and sizes at its head, so that the game asks for one file and not
// a hundred. It needs ffmpeg.
//
// The bank is kept in the repository, so this is run only to change what
// is in it. build/samples gets each sound as a file of its own, to listen
// to.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const VSCO = process.env.VSCO;
const KENNEY = process.env.KENNEY;
if (!VSCO || !KENNEY) {
  console.error('Say where the two libraries are: VSCO=... KENNEY=... node scripts/samples.mjs');
  process.exit(1);
}

/** Samples a second in the bank. Nothing in it needs more: an MP3 this small keeps little above 12 kHz anyway. */
const RATE = 32000;
/** How loud the loudest moment of every sound is made. What each is worth in the mix is said where it is played. */
const PEAK = 0.9;

// An instrument is a few of its notes, named by their MIDI number: the game
// plays the nearest one faster or slower for the notes between. The number
// is the pitch that was measured, which for most of the library is an
// octave above the name of its file.
const flute = (file, midi) => ({ name: `flute-${midi}`, from: `v:Woodwinds/Flute/susvib/LDFlute_susvib_${file}_v1_1.wav`, len: 1.7, fade: 0.15 });
const oboe = (file, midi) => ({ name: `oboe-${midi}`, from: `v:Woodwinds/Oboe/Vib/Oboe_Vib_${file}_v1_Main.wav`, len: 1.8, fade: 0.15 });
const harp = (file, midi, len) => ({ name: `harp-${midi}`, from: `v:Strings/Harp/KSHarp_${file}_mf.wav`, len, fade: len * 0.45 });
const glock = (file, midi, len) => ({ name: `glock-${midi}`, from: `v:Percussion/Glock/glock_medium_${file}.wav`, len, fade: len * 0.5, kbps: 56 });
const cello = (file, midi) => ({ name: `cello-${midi}`, from: `v:Strings/Cello Section/susvib/susvib_${file}_v1_1.wav`, len: 3.8, fade: 0.5, kbps: 32 });
const bass = (file, midi) => ({ name: `bass-${midi}`, from: `v:Strings/Solo Contrabass/Pizz/BKCtbss_Pizz_${file}_v1_rr1.wav`, len: 1.3, fade: 0.6, kbps: 32 });
const trumpet = (file, midi) => ({ name: `trumpet-${midi}`, from: `v:Brass/Trumpet/stac/Sum_SHTrumpet_stac_${file}_v2_rr1.wav`, len: 0.55, fade: 0.12 });
const horn = (file, midi) => ({ name: `horn-${midi}`, from: `v:Brass/F Horn/stac/MOHorn_stac_${file}_v2_rr1.wav`, len: 0.5, fade: 0.12 });
const pizz = (file, midi) => ({ name: `pizz-${midi}`, from: `v:Strings/Solo Violin/Pizz/LLVln_Pizz_${file}_f_RR1.wav`, len: 0.5, fade: 0.2 });
const perc = (name, file, len, more = {}) => ({ name, from: `v:Percussion/${file}`, len, ...more });
const old = (name, file, len, more = {}) => ({ name, from: `v:VSCO 1 Percussion/${file}`, len, ...more });
const ui = (name, file) => ({ name, from: `k:${file}.wav`, len: 0.6, fade: 0.02 });

const SOUNDS = [
  // The interface. These come first: they are the first to be wanted.
  ui('ui-click', 'select_002'),
  ui('ui-tick', 'tick_002'),
  ui('ui-open', 'open_002'),
  ui('ui-close', 'close_002'),
  ui('ui-pop', 'drop_002'),
  ui('ui-drop', 'drop_003'),
  ui('ui-deny', 'error_008'),
  ui('ui-buy', 'confirmation_001'),
  ui('ui-lift', 'pluck_002'),

  // Drums and everything else that is struck, shaken or scraped.
  perc('bdrum', 'BDrumNewhit_v6_rr1_Sum.wav', 0.7, { kbps: 32 }),
  perc('bdrum-soft', 'BDrumNewhit_v3_rr1_Sum.wav', 0.6, { kbps: 32 }),
  perc('snare', 'Snare2-HitNS_v6_rr1_Sum.wav', 0.35),
  perc('snare-soft', 'Snare2-HitNS_v3_rr1_Sum.wav', 0.3),
  perc('tap-1', 'Snare2-taps_v3_rr1_Sum.wav', 0.16),
  old('tom-low', 'drums/tenor/tenor_lower/tenor_ff_1.wav', 0.45, { kbps: 32 }),
  perc('conga', 'Conga-HitN_v2_rr1_Sum.wav', 0.35),
  perc('tumba', 'Tumba-HitN_v2_rr1_Sum.wav', 0.55, { kbps: 32 }),
  perc('logdrum', 'LogDrumLo_MedM_v2_rr1_Sum.wav', 0.4, { kbps: 32 }),
  perc('claves', 'Claves1_Hit_v2_rr1_Sum.wav', 0.2),
  old('brake-2', 'varMetal/various/brake_mf_1.wav', 0.45),
  perc('tamb', 'Tamb1-Hit_v2_rr1_Sum.wav', 0.4, { kbps: 56 }),
  perc('tamb-shake', 'Tamb1-Shake_v1_rr1_Sum.wav', 0.4, { kbps: 56 }),
  perc('sleigh', 'Sleighbells_Hit_v1_rr1_Mid.wav', 0.6, { kbps: 56 }),
  perc('triangle', 'Triangle6-Hit_v2_rr1_Sum.wav', 1.0, { fade: 0.5, kbps: 56 }),
  old('finger-cymbal', 'varMetal/various/Fing_Cymb.wav', 1.3, { fade: 0.7, kbps: 56 }),
  perc('crash', 'cymbal-crashshort_v1.wav', 0.9, { fade: 0.4, kbps: 56 }),
  old('crash-long', 'varMetal/Cymbals/clash/crash_hit_mp_loose.wav', 1.8, { fade: 0.8, kbps: 56 }),
  perc('belltree', 'BellTree_Stroke3_v1_Sum.wav', 1.5, { fade: 0.6, kbps: 56 }),
  old('chimes', 'varMetal/various/windchimes_fastAsc1.wav', 1.9, { fade: 0.8, kbps: 56 }),
  { name: 'gliss-up', from: 'v:Miscellania Raw/Misc 2/glock_glisses/glock_fx_up_pentatonic_med_01.wav', len: 2.0, fade: 0.7, kbps: 56 },
  { name: 'gliss-fast', from: 'v:Miscellania Raw/Misc 2/glock_glisses/glock_fx_up_chromatic_fast_01.wav', len: 1.3, fade: 0.6, kbps: 56 },
  perc('ratchet', 'Ratchet1-Fast_v1_rr1_Sum.wav', 0.3, { skip: 0.5, fade: 0.06 }),
  perc('guiro', 'Guiro-Fast_v1_Sum.wav', 0.3),
  old('cabasa', 'varMetal/various/cabasa_1.wav', 0.25, { kbps: 56 }),
  perc('timpani', 'Timpani/Timpani3_Hit_v3_rr1_Sum.wav', 1.5, { fade: 0.7, kbps: 32 }),
  perc('timpani-low', 'Timpani/Timpani1_Hit_v3_rr1_Sum.wav', 1.5, { fade: 0.7, kbps: 32 }),
  perc('bell-72', 'TB_hit_C5_v4_rr1.wav', 2.2, { fade: 1.0 }),

  // The instruments.
  trumpet('G3', 67), trumpet('A#3', 70), trumpet('F4', 77),
  horn('A2', 57),
  pizz('E5', 76),
  harp('E3', 52, 2.2), harp('B3', 59, 2.0), harp('F4', 65, 1.7), harp('C5', 72, 1.5), harp('G5', 79, 1.2),
  glock('G4', 79, 1.3), glock('C5', 84, 1.3), glock('G5', 91, 1.0), glock('C6', 96, 0.7),
  bass('D1', 38), bass('F#1', 42), bass('A1', 45), bass('C#2', 49),
  flute('E3', 64), flute('A3', 69), flute('C4', 72), flute('E4', 76), flute('A4', 81), flute('C5', 84), flute('E5', 88),
  oboe('D3', 62), oboe('F3', 65), oboe('A#3', 70), oboe('D4', 74),
  cello('D2', 50), cello('A2', 57), cello('E3', 64),
];

function source(from) {
  const [where, file] = [from.slice(0, 1), from.slice(2)];
  return path.join(where === 'v' ? VSCO : KENNEY, file);
}

/** A recording as numbers, one channel, with what is too low for any speaker here taken off. */
function read(file) {
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-ac', '1', '-ar', String(RATE), '-af', 'highpass=f=35', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`cannot read ${file}: ${r.stderr}`);
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2);
}

function cut(sound) {
  const all = read(source(sound.from));
  let peak = 0;
  for (const v of all) peak = Math.max(peak, Math.abs(v));
  // Where it starts: the first moment a fiftieth as loud as its loudest, and two thousandths of a second before.
  let start = 0;
  while (start < all.length && Math.abs(all[start]) < peak * 0.02) start++;
  start = Math.max(0, start - Math.floor(RATE * 0.002)) + Math.floor((sound.skip ?? 0) * RATE);
  const n = Math.min(all.length - start, Math.floor(sound.len * RATE));
  const out = new Float32Array(n);
  let top = 0;
  const fadeIn = Math.max(1, Math.floor((sound.fadeIn ?? 0.001) * RATE));
  const fade = Math.max(1, Math.floor((sound.fade ?? Math.min(0.08, sound.len / 4)) * RATE));
  for (let i = 0; i < n; i++) {
    let v = all[start + i];
    if (i < fadeIn) v *= i / fadeIn;
    // The end falls away as a rung note does, not in a straight line.
    if (i >= n - fade) v *= ((n - i) / fade) ** 2;
    out[i] = v;
    top = Math.max(top, Math.abs(v));
  }
  for (let i = 0; i < n; i++) out[i] *= PEAK / top;
  return out;
}

function encode(data, kbps) {
  const r = spawnSync(
    'ffmpeg',
    ['-loglevel', 'error', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', `${kbps}k`, '-map_metadata', '-1', '-id3v2_version', '0', '-f', 'mp3', '-'],
    { input: Buffer.from(data.buffer, data.byteOffset, data.byteLength), maxBuffer: 1 << 26 },
  );
  if (r.status !== 0) throw new Error(`cannot encode: ${r.stderr}`);
  return r.stdout;
}

const outDir = 'public/assets/audio';
const listenDir = 'build/samples';
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(listenDir, { recursive: true });

const names = new Set();
const parts = [];
const list = [];
let seconds = 0;
for (const sound of SOUNDS) {
  if (names.has(sound.name)) throw new Error(`two sounds are named ${sound.name}`);
  names.add(sound.name);
  const data = cut(sound);
  const mp3 = encode(data, sound.kbps ?? 48);
  fs.writeFileSync(path.join(listenDir, `${sound.name}.mp3`), mp3);
  parts.push(mp3);
  list.push([sound.name, mp3.length]);
  seconds += data.length / RATE;
  console.log(`${sound.name.padEnd(14)} ${(data.length / RATE).toFixed(2).padStart(5)} s  ${String(mp3.length).padStart(6)} bytes`);
}

// The bank: four letters, how long the list is, the list, and then the sounds in its order.
const head = Buffer.from(JSON.stringify(list));
const lead = Buffer.alloc(8);
lead.write('LBA1', 0, 'latin1');
lead.writeUInt32LE(head.length, 4);
const bank = Buffer.concat([lead, head, ...parts]);
fs.writeFileSync(path.join(outDir, 'bank.bin'), bank);
console.log(`\n${list.length} sounds, ${seconds.toFixed(1)} s, ${(bank.length / 1024).toFixed(0)} KB in ${outDir}/bank.bin`);
