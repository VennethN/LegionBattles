import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * An SVG as it is shipped: the same picture in fewer bytes. The files in
 * public/assets and art/overrides are written to be read and edited: every
 * shape has an id that says what it is, and every element is on a line of
 * its own. None of that is needed to draw them, and it is a third of their
 * size, which matters because a portal wants the whole build under 5 MB. So
 * in a build, an id that nothing points at goes, one that something points
 * at gets a short name, and the space a path does not need goes.
 */
/**
 * A path's numbers rounded to whole units, for the figures' pictures. A
 * figure's canvas is 192 units and it is drawn at well under its size, so a
 * unit is a fraction of a pixel; the tenths the kit writes are a fifth of a
 * figure's bytes. Relative numbers are rounded from the absolute points they
 * lead to, so that no error adds up along a path: every point lands within
 * half a unit of where it was drawn.
 */
export function roundPath(d: string): string {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  const sizes: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
  let out = '';
  let cmd = '';
  // Where the pen truly is, and where it is in the rounded path.
  let x = 0;
  let y = 0;
  let rx = 0;
  let ry = 0;
  let sx = 0;
  let sy = 0;
  let rsx = 0;
  let rsy = 0;
  let i = 0;
  const write = (vals: number[]): void => {
    // A minus or a letter already parts two numbers.
    for (const v of vals) out += (v < 0 || /[A-Za-z]$/.test(out) ? '' : ' ') + String(v === 0 ? 0 : v);
  };
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === 'Z' || cmd === 'z') {
        out += cmd;
        x = sx;
        y = sy;
        rx = rsx;
        ry = rsy;
        continue;
      }
      out += cmd;
    } else if (!cmd) return d;
    const lower = cmd.toLowerCase();
    const n = sizes[lower];
    if (n === undefined || n === 0) return d;
    const vals = tokens.slice(i, i + n).map(Number);
    if (vals.length < n || vals.some((v) => Number.isNaN(v))) return d;
    i += n;
    const rel = cmd === lower;
    if (lower === 'a') {
      // Radii and the angle rounded as they are; the flags kept; the end point as any other.
      const ex = rel ? x + vals[5] : vals[5];
      const ey = rel ? y + vals[6] : vals[6];
      const rex = Math.round(ex);
      const rey = Math.round(ey);
      write([Math.max(1, Math.round(vals[0])), Math.max(1, Math.round(vals[1])), Math.round(vals[2]), vals[3], vals[4], rel ? rex - rx : rex, rel ? rey - ry : rey]);
      x = ex;
      y = ey;
      rx = rex;
      ry = rey;
      continue;
    }
    const pts: number[] = [];
    if (lower === 'h') {
      const ex = rel ? x + vals[0] : vals[0];
      const rex = Math.round(ex);
      pts.push(rel ? rex - rx : rex);
      x = ex;
      rx = rex;
    } else if (lower === 'v') {
      const ey = rel ? y + vals[0] : vals[0];
      const rey = Math.round(ey);
      pts.push(rel ? rey - ry : rey);
      y = ey;
      ry = rey;
    } else {
      // Every pair is a point measured from where the segment began.
      let ex = x;
      let ey = y;
      for (let k = 0; k < n; k += 2) {
        const px = rel ? x + vals[k] : vals[k];
        const py = rel ? y + vals[k + 1] : vals[k + 1];
        const rpx = Math.round(px);
        const rpy = Math.round(py);
        pts.push(rel ? rpx - rx : rpx, rel ? rpy - ry : rpy);
        ex = px;
        ey = py;
      }
      const rex = Math.round(ex);
      const rey = Math.round(ey);
      x = ex;
      y = ey;
      rx = rex;
      ry = rey;
    }
    if (lower === 'm') {
      sx = x;
      sy = y;
      rsx = rx;
      rsy = ry;
      // Pairs after the first of a move are lines.
      cmd = rel ? 'l' : 'L';
    }
    write(pts);
  }
  return out;
}

export function minifySvg(svg: string): string {
  const pointed = new Set<string>();
  for (const m of svg.matchAll(/(?:href="#|url\(#)([^")]+)/g)) pointed.add(m[1]);
  const short = new Map<string, string>();
  const name = (id: string): string => {
    let s = short.get(id);
    if (!s) {
      s = `i${short.size.toString(36)}`;
      short.set(id, s);
    }
    return s;
  };
  return svg
    .replace(/ id="([^"]+)"/g, (_all, id: string) => (pointed.has(id) ? ` id="${name(id)}"` : ''))
    .replace(/href="#([^"]+)"/g, (_all, id: string) => `href="#${name(id)}"`)
    .replace(/url\(#([^)]+)\)/g, (_all, id: string) => `url(#${name(id)})`)
    .replace(/ d="([^"]+)"/g, (_all, d: string) => ` d="${d.replace(/\s*([MLQCZ])\s*/g, '$1').replace(/ -/g, '-')}"`)
    .replace(/>\s+</g, '><')
    .trim();
}

// Hand-edited SVGs in art/overrides take the place of generated ones at the
// same path under /assets. In dev they are served straight from that folder,
// so an edit in Inkscape shows on reload. In a build they are copied over the
// generated files in the output, and every picture there is then made small.
function artOverrides(): Plugin {
  const root = path.join(here, 'art', 'overrides');
  let outDir = path.join(here, 'dist');
  const copy = (from: string, to: string): void => {
    if (!fs.existsSync(from)) return;
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      const src = path.join(from, entry.name);
      const dst = path.join(to, entry.name);
      if (entry.isDirectory()) copy(src, dst);
      else if (entry.name.endsWith('.svg')) {
        fs.mkdirSync(to, { recursive: true });
        fs.copyFileSync(src, dst);
      }
    }
  };
  return {
    name: 'art-overrides',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0]);
        const match = /\/assets\/(.+\.svg)$/.exec(url);
        if (match) {
          const file = path.join(root, match[1]);
          if (file.startsWith(root) && fs.existsSync(file)) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'no-cache');
            fs.createReadStream(file).pipe(res);
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      copy(root, path.join(outDir, 'assets'));
      // Then every picture in the build is made small.
      const shrink = (dir: string): void => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const file = path.join(dir, entry.name);
          if (entry.isDirectory()) shrink(file);
          else if (entry.name.endsWith('.svg')) {
            let svg = minifySvg(fs.readFileSync(file, 'utf8'));
            // The figures are drawn small, and a whole unit is a fraction of a pixel there; a field's ground is grass and
            // stone, where half a unit is nothing anyone sees.
            if (file.includes(`${path.sep}units${path.sep}`) || file.includes(`${path.sep}arena${path.sep}`)) svg = svg.replace(/ d="([^"]+)"/g, (_all, d: string) => ` d="${roundPath(d)}"`);
            fs.writeFileSync(file, svg);
          }
        }
      };
      shrink(path.join(outDir, 'assets'));
      // The manifest without the spaces that make it readable: the same data in half the bytes.
      const manifest = path.join(outDir, 'assets', 'manifest.json');
      if (fs.existsSync(manifest)) fs.writeFileSync(manifest, JSON.stringify(JSON.parse(fs.readFileSync(manifest, 'utf8'))));
      bundleArt(path.join(outDir, 'assets'));
    },
  };
}

/**
 * The small pictures of a build put together in bundles, and their own files taken out (src/view/art/bundles.ts says
 * why): everything kept from the start in kept.json, and each unit's pictures in units/<team>/<unit>.json. A
 * bundle is an object of each picture's path to its text. The text's double quotes are made single, which JSON does
 * not have to escape, so that a bundle is no bigger than its files.
 */
export function bundleArt(assets: string): void {
  const text = (file: string): string => {
    const svg = fs.readFileSync(file, 'utf8');
    return svg.includes("'") ? svg : svg.replace(/"/g, "'");
  };
  const kept: Record<string, string> = {};
  for (const folder of ['fx', 'icons', 'packs']) {
    const dir = path.join(assets, folder);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) if (name.endsWith('.svg')) kept[`assets/${folder}/${name}`] = text(path.join(dir, name));
    fs.rmSync(dir, { recursive: true });
  }
  if (Object.keys(kept).length > 0) fs.writeFileSync(path.join(assets, 'kept.json'), JSON.stringify(kept));
  for (const team of ['blue', 'red']) {
    const dir = path.join(assets, 'units', team);
    if (!fs.existsSync(dir)) continue;
    for (const unit of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!unit.isDirectory()) continue;
      const from = path.join(dir, unit.name);
      const pics: Record<string, string> = {};
      for (const name of fs.readdirSync(from)) if (name.endsWith('.svg')) pics[`assets/units/${team}/${unit.name}/${name}`] = text(path.join(from, name));
      fs.writeFileSync(path.join(dir, `${unit.name}.json`), JSON.stringify(pics));
      fs.rmSync(from, { recursive: true });
    }
  }
}

export default defineConfig({
  // Portals serve a build from a subfolder, so every path is relative.
  base: './',
  plugins: [artOverrides()],
  build: {
    target: 'es2020',
    assetsDir: 'bundle',
    chunkSizeWarningLimit: 2000,
  },
  server: { host: '127.0.0.1', port: 5174 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
