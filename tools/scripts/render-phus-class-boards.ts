/// <reference lib="dom" />
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

import type { Browser, Page } from 'playwright';

/**
 * The Phu's Class boards in `design/phus-class/`: each board is one screen, drawn whole at the size
 * the canvas gives it. A board's section is the canvas row it sits in (the nearest row title above
 * it in `canvas.json`), and its screen is the board's own name, so a registry state names
 * `{ board: 'Finish', section: 'The drum, and after', screen: 'Finish' }`. A board that shows more
 * than one screen by its own controls (the share sheet's cards) is rendered once per screen, with
 * the control pressed as a person would. Boards kept off the canvas are not rendered.
 */
export const phusClassFolder = 'phus-class';
const settleTimeout = 60_000;

interface CanvasBoard {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
interface CanvasNote {
  readonly y: number;
  readonly text: string;
  readonly kind: string;
}
interface Canvas {
  readonly order: readonly string[];
  readonly boards: Readonly<Record<string, CanvasBoard>>;
  readonly notes: Readonly<Record<string, CanvasNote>>;
}

export interface BoardScreen {
  readonly board: string;
  readonly section: string;
  readonly screen: string;
  readonly width: number;
  readonly height: number;
  /** What is pressed on the board before it is taken: a control's role and its name. */
  readonly press?: readonly { readonly role: 'radio' | 'switch'; readonly name: string }[];
}

/** Screens a board shows only after one of its own controls is pressed. */
const PRESSED: Readonly<Record<string, readonly Pick<BoardScreen, 'screen' | 'press'>[]>> = {
  ShareSheet: [
    { screen: 'Test paper', press: [{ role: 'radio', name: 'Test' }] },
    { screen: 'Certificate', press: [{ role: 'radio', name: 'Certificate' }] },
    { screen: 'Note home', press: [{ role: 'radio', name: 'Note home' }] },
    { screen: 'Your desk', press: [{ role: 'radio', name: 'Your desk' }] },
    { screen: 'Task hidden', press: [{ role: 'switch', name: 'White-out the task' }] },
  ],
};

/** Every board on the canvas, in canvas order, as the screens it renders. */
export function phusClassScreens(canvas: Canvas): BoardScreen[] {
  const rows = Object.values(canvas.notes)
    .filter((note) => note.kind === 'title1')
    .sort((a, b) => b.y - a.y);
  return canvas.order.flatMap((file) => {
    const placed = canvas.boards[file];
    if (placed === undefined) return [];
    const board = path.basename(file, '.dc.html');
    const section = rows.find((row) => row.y <= placed.y)?.text ?? '';
    const size = { width: placed.w, height: placed.h };
    const pressed = PRESSED[board];
    if (pressed === undefined) return [{ board, section, screen: board, ...size }];
    return [
      { board, section, screen: board, ...size },
      ...pressed.map((one) => ({ board, section, ...one, ...size })),
    ];
  });
}

/** A file directly inside `design/`, or inside `design/phus-class/` or its `assets/`. */
export function servable(name: string): boolean {
  if (name.split('/').some((part) => part === '' || part === '.' || part === '..')) return false;
  const folder = path.posix.dirname(name);
  return folder === '.' || folder === phusClassFolder || folder === `${phusClassFolder}/assets`;
}

export function readCanvas(designDir: string): Canvas {
  return JSON.parse(
    readFileSync(path.join(designDir, phusClassFolder, 'canvas.json'), 'utf8'),
  ) as Canvas;
}

/** Resolves once the board's fonts are in and its layout has held still for a moment. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForFunction(
    () => {
      const state = window as unknown as { lastLayout?: string };
      const layout = `${document.querySelectorAll('*').length}:${document.documentElement.scrollHeight}`;
      const still = state.lastLayout === layout;
      state.lastLayout = layout;
      return document.fonts.status === 'loaded' && still;
    },
    undefined,
    { polling: 500, timeout: settleTimeout },
  );
}

/**
 * Renders the boards to `<out>/phus-class/<board>/<section>--<screen>.png` at twice the design size,
 * read from `origin` (the design folder served over http, so the hand font loads from `assets/`).
 * Returns each screen with its image's path under `<out>`.
 */
export async function renderPhusClassBoards(
  browser: Browser,
  origin: string,
  screens: readonly BoardScreen[],
  outDir: string,
  slug: (text: string) => string,
): Promise<{ screen: BoardScreen; file: string }[]> {
  const rendered: { screen: BoardScreen; file: string }[] = [];
  rmSync(path.join(outDir, phusClassFolder), { recursive: true, force: true });
  for (const screen of screens) {
    const page = await browser.newPage({
      viewport: { width: screen.width, height: screen.height },
      deviceScaleFactor: 2,
    });
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(error.message));
    try {
      const url = `${origin}/${phusClassFolder}/${encodeURIComponent(screen.board)}.dc.html`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await settle(page);
      for (const control of screen.press ?? []) {
        await page.getByRole(control.role, { name: control.name }).click();
      }
      // The boards' own entrances (a sheet rising, a bubble fading in) finish well inside this.
      await page.waitForTimeout(1500);
      if (problems.length > 0) {
        throw new Error(`${screen.board} did not render cleanly:\n  ${problems.join('\n  ')}`);
      }
      const folder = `${phusClassFolder}/${slug(screen.board)}`;
      mkdirSync(path.join(outDir, folder), { recursive: true });
      const name = `${slug(screen.section)}--${slug(screen.screen)}.png`;
      await page.screenshot({
        path: path.join(outDir, folder, name),
        clip: { x: 0, y: 0, width: screen.width, height: screen.height },
      });
      rendered.push({ screen, file: `${folder}/${name}` });
    } finally {
      await page.close();
    }
  }
  return rendered;
}
