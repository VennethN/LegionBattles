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
  screenshot(o: { path: string }): Promise<unknown>;
  viewportSize(): { width: number; height: number } | null;
  /** The page's own clock, taken over: time passes only when it is run. */
  clock: { install(): Promise<void>; pauseAt(time: number): Promise<void>; runFor(ms: number): Promise<void> };
  keyboard: { down(key: string): Promise<void>; up(key: string): Promise<void>; press(key: string): Promise<void> };
  mouse: { click(x: number, y: number): Promise<void>; move(x: number, y: number): Promise<void>; down(): Promise<void>; up(): Promise<void> };
  touchscreen: { tap(x: number, y: number): Promise<void> };
}

export interface Context {
  newPage(): Promise<Page>;
  close(): Promise<void>;
}

export interface Browser {
  newContext(o: { viewport: { width: number; height: number }; deviceScaleFactor?: number; hasTouch?: boolean; isMobile?: boolean }): Promise<Context>;
  close(): Promise<void>;
}

const require = createRequire(import.meta.url);
export const { chromium } = require('playwright') as { chromium: { launch(o?: object): Promise<Browser> } };
