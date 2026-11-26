// The headless browser the scripts drive. Playwright is the machine's, not
// the project's: it is asked for where it is installed, and only what the
// scripts use of it is typed here.

import { createRequire } from 'node:module';

export interface Page {
  on(event: 'pageerror', fn: (e: { message: string; stack?: string }) => void): void;
  on(event: 'console', fn: (m: { type(): string; text(): string }) => void): void;
  goto(url: string): Promise<unknown>;
  reload(): Promise<unknown>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
  evaluate<T, A>(fn: (arg: A) => T | Promise<T>, arg: A): Promise<T>;
  screenshot(o: { path?: string; type?: 'png' | 'jpeg'; quality?: number }): Promise<unknown>;
  /** Puts a page of its own making in the window: a cover is laid out there. */
  setContent(html: string): Promise<void>;
  viewportSize(): { width: number; height: number } | null;
  /** The page's own clock, taken over: time passes only when it is run. */
  clock: { install(): Promise<void>; pauseAt(time: number): Promise<void>; runFor(ms: number): Promise<void> };
  keyboard: { down(key: string): Promise<void>; up(key: string): Promise<void>; press(key: string): Promise<void> };
  mouse: { click(x: number, y: number): Promise<void>; move(x: number, y: number): Promise<void>; down(): Promise<void>; up(): Promise<void> };
  touchscreen: { tap(x: number, y: number): Promise<void> };
}

export interface Context {
  newPage(): Promise<Page>;
  /** Runs in every page of the context before the page's own scripts. */
  addInitScript(script: string): Promise<void>;
  /** The browser's own wire, for what the page's calls cannot do: a finger dragged across the screen. */
  newCDPSession(page: Page): Promise<{ send(method: string, params: object): Promise<unknown> }>;
  close(): Promise<void>;
}

export interface Browser {
  newContext(o: { viewport: { width: number; height: number }; deviceScaleFactor?: number; hasTouch?: boolean; isMobile?: boolean }): Promise<Context>;
  close(): Promise<void>;
}

const require = createRequire(import.meta.url);
export const { chromium } = require('playwright') as { chromium: { launch(o?: object): Promise<Browser> } };

/**
 * A page in a new window of this size. The scripts hand the page functions
 * to run, and the tool that runs these scripts marks every function it
 * compiles with a helper of its own, which a page has never heard of: it
 * is given one that does nothing.
 */
export async function open(browser: Browser, o: Parameters<Browser['newContext']>[0]): Promise<{ context: Context; page: Page }> {
  const context = await browser.newContext(o);
  await context.addInitScript('globalThis.__name = (f) => f;');
  return { context, page: await context.newPage() };
}
