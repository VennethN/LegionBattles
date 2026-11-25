// What the walks share: ways to press things in the game by what they are,
// not by where they stand. A walk that presses at a place on the layout is
// broken by every change to the layout; one that presses the button that
// says FILL TEAM is not.

/** Ways to press things on a page the game is running in. */
export function walker(page) {
  /**
   * Where a place on the game's 1280 by 720 layout is on the page. A menu is drawn in a window (view/app.ts), so
   * that is not always where it is on the canvas; and the canvas is as big as the page lets it be, which in a
   * portal's frame is smaller than the layout.
   */
  const at = async (x, y) => {
    return page.evaluate(([a, b]) => {
      const p = window.screenOf?.(a, b) ?? { x: a, y: b };
      const box = window.game.canvas.getBoundingClientRect();
      const k = box.width / 1280;
      return { x: box.left + p.x * k, y: box.top + p.y * k };
    }, [x, y]);
  };

  /** Presses at a place on the game's layout. */
  const click = async (x, y) => {
    const p = await at(x, y);
    await page.mouse.click(p.x, p.y);
  };

  /** The middle of the first button on a screen that says `text`, or null. */
  const find = (key, text) =>
    page.evaluate(([k, t]) => {
      const sc = window.game.scene.getScene(k);
      const hits = [];
      const walk = (list, ox, oy) => {
        for (const o of list) {
          if (o.type !== 'Container' || !o.visible) continue;
          if (o.list.some((c) => typeof c.text === 'string' && c.text.trim() === t)) hits.push({ x: ox + o.x, y: oy + o.y });
          walk(o.list, ox + o.x, oy + o.y);
        }
      };
      walk(sc.children.list, 0, 0);
      return hits[0] ?? null;
    }, [key, text]);

  /** Presses the button on a screen that says `text`. */
  const press = async (key, text) => {
    const at = await find(key, text);
    if (!at) throw new Error(`no button says "${text}" on ${key}`);
    await click(at.x, at.y);
  };

  /** Presses the middle of what a screen has marked by name for its tutorials (guide.mark). */
  const mark = async (key, name) => {
    const r = await page.evaluate(([k, n]) => window.game.scene.getScene(k).guide?.marks.get(n)?.() ?? null, [key, name]);
    if (!r) throw new Error(`${key} has nothing marked "${name}"`);
    await click(r.x + r.w / 2, r.y + r.h / 2);
  };

  /** The middle of a card on the units side screen, by its place on the page: 0 is the first. */
  const card = (i) => [14 + 52 + (i % 3) * 110, 78 + 52 + Math.floor(i / 3) * 110];

  return { at, click, find, press, mark, card };
}
