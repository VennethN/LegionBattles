// The build ships the small pictures in bundles: everything kept from the
// start in one file, and each unit's pictures (its parts, its stills, its
// whole figure) in one file of its own. A wave's hundred pictures were a
// hundred requests, and on a slow connection the wait between them, not
// their bytes, was most of the time it took to start playing (the owner:
// "this is so players get more quickly into the game").
//
// A bundle is a JSON object of picture paths to SVG text. Once one has come,
// each of its pictures is a blob in the page, and `svgUrl` hands the loader
// that instead of the path. Where there is no bundle (`npm run dev`, which
// serves the files one by one), it hands back the path and nothing changes.

const urls = new Map<string, string>();
const asked = new Map<string, Promise<void>>();

/** Fetches a bundle once, by its name under assets/ ("kept", "units/blue/wren"). Never fails: without it the files are asked for one by one. */
export function bundle(name: string): Promise<void> {
  let p = asked.get(name);
  if (!p) {
    p = fetch(`assets/${name}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : null))
      .then((pics) => {
        if (!pics || typeof URL.createObjectURL !== 'function') return;
        for (const [path, svg] of Object.entries(pics)) urls.set(path, URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
      })
      .catch(() => undefined);
    asked.set(name, p);
  }
  return p;
}

/** The bundles of these units' pictures. */
export function unitBundles(keys: ReadonlyArray<{ team: string; unit: string }>): Promise<void> {
  return Promise.all([...new Set(keys.map((k) => `units/${k.team}/${k.unit}`))].map(bundle)).then(() => undefined);
}

/** Where a picture is to be loaded from: its blob if its bundle has come, its own file if not. */
export function svgUrl(path: string): string {
  return urls.get(path) ?? path;
}

/** Fetches one picture ahead of its loader, so that the wait for it is spent while something else is being done. */
export function prefetchSvg(path: string): Promise<void> {
  let p = asked.get(path);
  if (!p) {
    p = fetch(path)
      .then((r) => (r.ok ? r.text() : null))
      .then((svg) => {
        if (svg && typeof URL.createObjectURL === 'function') urls.set(path, URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
      })
      .catch(() => undefined);
    asked.set(path, p);
  }
  return p;
}
