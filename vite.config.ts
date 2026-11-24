import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const here = path.dirname(fileURLToPath(import.meta.url));

// Hand-edited SVGs in art/overrides take the place of generated ones at the
// same path under /assets. In dev they are served straight from that folder,
// so an edit in Inkscape shows on reload. In a build they are copied over the
// generated files in the output.
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
  server: { host: '127.0.0.1', port: 5173 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
