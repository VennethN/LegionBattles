// npm run video:cut [landscape] [portrait]
//
// Cuts the game's preview video from what scripts/video.ts filmed
// (build/video/frames), and encodes it: build/video/preview-landscape.mp4,
// 1920 by 1080, and build/video/preview-portrait.mp4, 1080 by 1620. Those
// are the two a portal asks for (CrazyGames: 15 to 20 seconds, 1080p in
// 16:9 and in 2:3, no sound). It needs Playwright and ffmpeg. The videos
// are not kept in the repository, as nothing in build is: they are some
// 25 MB, and are made again from the game whenever it changes.
//
// What a portal asks of a preview is held to here:
//
// - It opens on the cover, so that the still picture a player was looking
//   at comes to life.
// - Nothing is sped up. A frame of the film is a thirtieth of a second of
//   the game (video.ts), and the cut shows them in order, one each.
// - No black: no bars, no fade to black, no title card. A clip follows
//   another by a hard cut or by melting into it.
// - No words but the game's own, no pointer, no sound.
//
// The film is 2880 by 1620, two and a quarter times the game's layout of
// 1280 by 720. A clip is shown through a camera: a window on that layout,
// which may move and close in while the clip plays. The landscape video's
// window is 16:9 and as small as 853 by 480 without a pixel being
// stretched; the portrait video's is 2:3, and at the layout's full height
// it is 480 wide, a slice that follows the fighting.
//
// The plan at the foot says which frames of which shot follow which, and
// where the camera is. It is set by looking: video.ts's sheets for the
// moment, and `frames=` here for single frames of a cut.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Playwright is the machine's, not the project's, and comes without its types here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const { chromium } = require('playwright') as { chromium: Any };

const BUILD = path.resolve('build/video');
const FPS = 30;
/** The game's layout: what a camera's numbers are in. */
const LAYOUT_H = 720;

/** A camera: the middle of its window on the layout, and the window's height. Its width follows from the video's shape. */
type View = [x: number, y: number, h: number];

interface Clip {
  /** A shot of video.ts, or "cover" for the game's cover. */
  shot: string;
  /** Its first frame, and how many. */
  from: number;
  frames: number;
  /** The landscape video's camera as the clip starts and as it ends. */
  wide: [View, View];
  /** The portrait video's. Its window is 480 wide at the layout's full height. */
  tall: [View, View];
  /** How many of its first frames it melts in over, from the clip before. None is a hard cut. */
  cross?: number;
}

interface Shape {
  name: 'landscape' | 'portrait';
  w: number;
  h: number;
  /** The cover a video of this shape opens on. */
  cover: string;
}

const SHAPES: Shape[] = [
  { name: 'landscape', w: 1920, h: 1080, cover: path.resolve('docs/covers/cover-landscape.png') },
  // The portrait cover is 800 wide: scripts/cover.ts draws it again at this size (npm run cover -- portrait width=1080 out=build/video).
  { name: 'portrait', w: 1080, h: 1620, cover: path.join(BUILD, 'cover-portrait.png') },
];

/** The whole screen, in each shape. A portrait window can't be wider than 480, so its "whole" is the middle slice. */
const ALL: View = [640, 360, 720];

// ------------------------------------------------------------ the plan

/** A portrait window at a place along the screen: all of its height, 480 of its width. */
const slice = (x: number): View => [x, 360, 720];

const PLAN: Clip[] = [
  // The cover, as the player was looking at it, for a moment.
  { shot: 'cover', from: 0, frames: 26, wide: [ALL, [640, 345, 640]], tall: [slice(240), slice(240)] },
  // It comes to life: the Warlord's stage in the first land, from the whole screen in to the fighting.
  { shot: 'meadow', from: 6, frames: 102, cross: 10, wide: [ALL, [650, 320, 500]], tall: [slice(560), slice(660)] },
  // Six packs at one press: the pouch bursts, the cards are dealt and turned, the best last.
  // The tall video's window is kept inside the packs' own, which stops short of the screen's edges: no strip of the field shows over and under it.
  // (The cards lie face down for most of a second before the first is turned. That wait is cut out, across a
  // short melt: nothing moves in it, and nothing is sped up by leaving it out.)
  { shot: 'packs', from: 54, frames: 26, wide: [[640, 338, 640], [640, 336, 610]], tall: [[640, 360, 640], [640, 360, 640]] },
  { shot: 'packs', from: 96, frames: 90, cross: 4, wide: [[640, 336, 610], [640, 330, 530]], tall: [[640, 360, 640], [640, 360, 640]] },
  // The screen of units: the cards held, and FILL TEAM setting the legion out. The wide video sees the field
  // fill; the tall one leafs across the cards, on which the ticks come up, to the card in the hand. (The field's
  // window on that screen is nearly square, with the screen's dark ground over and under it: in a tall frame
  // that ground stands as two dark bands, which a tall video is not to have.)
  { shot: 'team', from: 6, frames: 42, wide: [ALL, [700, 350, 640]], tall: [slice(240), slice(430)] },
  // The second land, and the Colossus.
  { shot: 'dunes', from: 10, frames: 96, wide: [[670, 330, 560], [720, 300, 480]], tall: [slice(640), slice(730)] },
  // The third land: the lines meet in the snow.
  { shot: 'frost', from: 10, frames: 80, wide: [[660, 350, 640], [660, 340, 540]], tall: [slice(640), slice(680)] },
  // The Jarl falls.
  { shot: 'frost', from: 122, frames: 54, cross: 6, wide: [[690, 290, 520], [712, 292, 470]], tall: [slice(690), slice(725)] },
  // And the result: what the win paid.
  { shot: 'frost', from: 256, frames: 74, cross: 6, wide: [[640, 350, 640], [640, 335, 520]], tall: [slice(640), slice(640)] },
];

// ------------------------------------------------------------ the cut

const ease = (t: number): number => t * t * (3 - 2 * t);

/** Where a clip's file for a frame is, as the page asks for it. */
function source(clip: Clip, i: number): string {
  return clip.shot === 'cover' ? 'cover' : `frames/${clip.shot}/f-${String(clip.from + i).padStart(5, '0')}.jpg`;
}

interface Layer {
  url: string;
  /** The camera's window as parts of the picture: left, top, width, height. */
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  alpha: number;
}

/** What is drawn for one frame of a clip, through its camera. */
function layer(shape: Shape, clip: Clip, i: number, alpha: number): Layer {
  const [a, b] = shape.name === 'landscape' ? clip.wide : clip.tall;
  const t = clip.frames > 1 ? ease(i / (clip.frames - 1)) : 0;
  const at = (k: 0 | 1 | 2): number => a[k] + (b[k] - a[k]) * t;
  // The layout the picture is of: the game's is 1280 wide, and a cover's is as wide as its own shape makes it.
  const layoutW = clip.shot === 'cover' ? (LAYOUT_H * shape.w) / shape.h : 1280;
  const h = Math.min(LAYOUT_H, at(2));
  const w = Math.min(layoutW, (h * shape.w) / shape.h);
  // The window is kept on the picture: a camera pushed past an edge stops at it.
  const x = Math.max(0, Math.min(layoutW - w, at(0) - w / 2));
  const y = Math.max(0, Math.min(LAYOUT_H - h, at(1) - h / 2));
  return { url: source(clip, i), fx: x / layoutW, fy: y / LAYOUT_H, fw: w / layoutW, fh: h / LAYOUT_H, alpha };
}

/** Every frame of the video: the clip it is of, and the one before while that melts away under it. */
function timeline(shape: Shape, plan: Clip[]): Layer[][] {
  const out: Layer[][] = [];
  plan.forEach((clip, k) => {
    const cross = k > 0 ? clip.cross ?? 0 : 0;
    const before = plan[k - 1];
    for (let i = 0; i < clip.frames; i++) {
      if (i < cross) {
        // The clip before plays on under this one: its last frames are these same frames of the video.
        const j = before.frames - cross + i;
        out[out.length - cross + i] = [layer(shape, before, j, 1), layer(shape, clip, i, ease((i + 1) / (cross + 1)))];
      } else out.push([layer(shape, clip, i, 1)]);
    }
  });
  return out;
}

const PAGE = (w: number, h: number): string => `<!doctype html><html><body style="margin:0;background:#2a1a10;overflow:hidden">
<canvas id="c" width="${w}" height="${h}" style="display:block"></canvas>
<script>
  const ctx = document.getElementById('c').getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const kept = new Map();
  const load = (url) => {
    if (!kept.has(url)) {
      kept.set(url, new Promise((done, failed) => {
        const img = new Image();
        img.onload = () => done(img);
        img.onerror = () => failed(new Error('no picture at ' + url));
        img.src = url;
      }));
      // A frame is big: only the last few are kept at hand.
      if (kept.size > 6) kept.delete(kept.keys().next().value);
    }
    return kept.get(url);
  };
  window.draw = async (layers) => {
    for (const l of layers) {
      const img = await load(l.url);
      ctx.globalAlpha = l.alpha;
      ctx.drawImage(img, l.fx * img.naturalWidth, l.fy * img.naturalHeight, l.fw * img.naturalWidth, l.fh * img.naturalHeight, 0, 0, ${w}, ${h});
    }
    ctx.globalAlpha = 1;
  };
</script></body></html>`;

async function cut(browser: Any, shape: Shape, only: number[] | null): Promise<void> {
  const frames = timeline(shape, PLAN);
  const dir = path.join(BUILD, 'cut', shape.name);
  if (!only) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: shape.w, height: shape.h }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  // The page and its pictures are served from the disk, under an address of its own.
  await page.route('http://film.local/**', (route: Any) => {
    const name = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
    if (name === '') return route.fulfill({ contentType: 'text/html', body: PAGE(shape.w, shape.h) });
    const file = name === 'cover' ? shape.cover : path.join(BUILD, name);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: 'none' });
    return route.fulfill({ path: file });
  });
  await page.goto('http://film.local/');
  const began = Date.now();
  for (let n = 0; n < frames.length; n++) {
    if (only && !only.includes(n)) continue;
    await page.evaluate((layers: Layer[]) => (window as Any).draw(layers), frames[n]);
    await page.screenshot({ path: path.join(dir, `f-${String(n).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 96 });
  }
  await context.close();
  const seconds = (frames.length / FPS).toFixed(1);
  if (only) {
    console.log(`videocut: ${shape.name}: frames ${only.join(', ')} of ${frames.length} (${seconds} s) in build/video/cut/${shape.name}`);
    return;
  }
  console.log(`videocut: ${shape.name}: ${frames.length} frames, ${seconds} s, drawn in ${((Date.now() - began) / 1000).toFixed(0)} s`);
  const file = path.join(BUILD, `preview-${shape.name}.mp4`);
  // H.264 as every browser plays it, the picture's index at the front so that it starts at once, and no sound.
  execFileSync('ffmpeg', [
    '-loglevel', 'error', '-y', '-framerate', String(FPS), '-start_number', '0', '-i', path.join(dir, 'f-%05d.jpg'), '-frames:v', String(frames.length),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', file,
  ]);
  console.log(`videocut: build/video/preview-${shape.name}.mp4 (${(fs.statSync(file).size / 1e6).toFixed(1)} MB)`);
}

const args = process.argv.slice(2);
// `frames=0,120,300` draws those frames of the cut alone, to look at, and encodes nothing.
const asked = args.find((a) => a.startsWith('frames='));
const only = asked ? asked.slice(7).split(',').map(Number) : null;
const shapes = args.filter((a) => !a.includes('='));
if (PLAN.length === 0) {
  console.error('videocut: the plan is empty');
  process.exit(1);
}
const browser = await chromium.launch();
try {
  for (const shape of SHAPES) if (shapes.length === 0 || shapes.includes(shape.name)) await cut(browser, shape, only);
} finally {
  await browser.close();
}
