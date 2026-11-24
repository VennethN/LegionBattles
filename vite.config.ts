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
      // Then every picture in the build is made small. The manifest is left as it is.
      const shrink = (dir: string): void => {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const file = path.join(dir, entry.name);
          if (entry.isDirectory()) shrink(file);
          else if (entry.name.endsWith('.svg')) fs.writeFileSync(file, minifySvg(fs.readFileSync(file, 'utf8')));
        }
      };
      shrink(path.join(outDir, 'assets'));
    },
  };
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
