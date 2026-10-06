/// <reference lib="dom" />
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, type Browser, type Page } from 'playwright';

/**
 * Renders every designed screen of the boards in `design/` to its own image, so a screen on a device
 * can be put beside its design.
 *
 *   tsx tools/scripts/render-design-screens.ts [--out <folder>] [--manifest <file>] [<board file>...]
 *
 * A board marks its numbered sections and, inside them, each screen with `data-screen-label`. A screen
 * is a labelled element inside a labelled section; the sections themselves (and a board's title blocks)
 * are not rendered. Images go to `<out>/<board>/<section>--<screen>.png` at twice the design size, with a
 * small margin for the device frame, and the manifest lists them in board and document order with the
 * screen's own size in design points.
 *
 * The boards fetch their scripts, which a browser refuses on `file:` addresses, so the folder is served
 * from this machine for the length of the run. React and the web font still come from the network.
 */
const repoRoot = path.resolve(import.meta.dirname, '../..');
const designDir = path.join(repoRoot, 'design');
const boardSuffix = '.dc.html';
const rendersPath = 'design/renders';
const settleTimeout = 60_000;
/** Design points kept around a screen, so the device frame drawn outside its box is not cut. */
const frameMargin = 12;

export interface DesignScreen {
  board: string;
  section: string;
  screen: string;
  path: string;
  width: number;
  height: number;
}

export function slug(text: string): string {
  const cleaned = text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'untitled';
}

/** "Scootch - Tables.dc.html" is the board "Tables"; "Scootch.dc.html" is the board "Scootch". */
export function boardName(file: string): string {
  return path.basename(file, boardSuffix).replace(/^Scootch - /, '');
}

/** File names for labels in document order; a repeated name gets `-2`, `-3` and so on. */
export function uniqueNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name}-${count}`;
  });
}

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

/** Serves the files directly inside `design/`, and nothing else, on a loopback port. */
function serveDesignFolder(): Promise<Server> {
  const server = createServer((request, response) => {
    const name = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname).slice(
      1,
    );
    const type = contentTypes[path.extname(name)];
    if (!type || name !== path.basename(name)) {
      response.writeHead(404).end();
      return;
    }
    try {
      const body = readFileSync(path.join(designDir, name));
      response.writeHead(200, { 'content-type': type }).end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** Resolves once the board's components are registered, its fonts are in and its layout is still. */
async function waitUntilRendered(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const labelled = document.querySelectorAll('[data-screen-label]').length;
      const pending = [...document.querySelectorAll('*')].some(
        (element) =>
          element.localName.startsWith('scootch-') && !customElements.get(element.localName),
      );
      const state = window as unknown as { lastLayout?: string };
      const layout = `${labelled}:${document.documentElement.scrollWidth}:${document.documentElement.scrollHeight}`;
      const still = state.lastLayout === layout;
      state.lastLayout = layout;
      return labelled > 0 && !pending && document.fonts.status === 'loaded' && still;
    },
    undefined,
    { polling: 500, timeout: settleTimeout },
  );
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

interface Measured {
  section: string;
  screen: string;
  width: number;
  height: number;
}

/** Tags each screen with its index and returns its labels and size, in document order. */
function measureScreens(page: Page): Promise<Measured[]> {
  return page.evaluate(() => {
    const measured: { section: string; screen: string; width: number; height: number }[] = [];
    for (const element of document.querySelectorAll('[data-screen-label]')) {
      const section = element.parentElement?.closest('[data-screen-label]');
      if (!section) continue;
      const box = element.getBoundingClientRect();
      element.setAttribute('data-render-index', String(measured.length));
      measured.push({
        section: section.getAttribute('data-screen-label') ?? '',
        screen: element.getAttribute('data-screen-label') ?? '',
        width: Math.round(box.width),
        height: Math.round(box.height),
      });
    }
    return measured;
  });
}

async function renderBoard(
  browser: Browser,
  origin: string,
  file: string,
  outDir: string,
): Promise<DesignScreen[]> {
  const board = boardName(file);
  const boardSlug = slug(board);
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  });
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });

  try {
    await page.goto(`${origin}/${encodeURIComponent(file)}`, { waitUntil: 'load' });
    await waitUntilRendered(page);
    // The board's own navigation bar sticks to the top and would cover a screen scrolled under it.
    await page.addStyleTag({ content: 'body nav { position: static !important; }' });

    // The drawn characters only paint while inside the viewport, so it must hold the tallest screen.
    const first = await measureScreens(page);
    await page.setViewportSize({
      width: Math.max(1600, ...first.map((screen) => screen.width + 200)),
      height: Math.max(1000, ...first.map((screen) => screen.height + 200)),
    });
    await waitUntilRendered(page);
    const screens = await measureScreens(page);
    if (problems.length > 0) {
      throw new Error(`${file} did not render cleanly:\n  ${problems.join('\n  ')}`);
    }

    rmSync(path.join(outDir, boardSlug), { recursive: true, force: true });
    mkdirSync(path.join(outDir, boardSlug), { recursive: true });
    const names = uniqueNames(
      screens.map((screen) => `${slug(screen.section)}--${slug(screen.screen)}`),
    );
    const rendered: DesignScreen[] = [];
    for (const [index, screen] of screens.entries()) {
      const name = `${names[index] ?? String(index)}.png`;
      const element = page.locator(`[data-render-index="${index}"]`);
      const box = await element.evaluate((node) => {
        node.scrollIntoView({ block: 'center', inline: 'center' });
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y, width, height };
      });
      // A few frames, so the characters that just came into view have painted.
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(outDir, boardSlug, name),
        clip: {
          x: Math.max(0, box.x - frameMargin),
          y: Math.max(0, box.y - frameMargin),
          width: box.width + 2 * frameMargin,
          height: box.height + 2 * frameMargin,
        },
      });
      const { section, screen: label, width, height } = screen;
      const file = `${rendersPath}/${boardSlug}/${name}`;
      rendered.push({ board, section, screen: label, path: file, width, height });
    }
    return rendered;
  } finally {
    await page.close();
  }
}

function option(args: string[], name: string): string | undefined {
  const at = args.indexOf(name);
  if (at === -1) return undefined;
  const [, value] = args.splice(at, 2);
  return value;
}

async function main(argv: readonly string[]): Promise<void> {
  const args = [...argv];
  const outDir = path.resolve(option(args, '--out') ?? path.join(repoRoot, rendersPath));
  const manifest = path.resolve(option(args, '--manifest') ?? path.join(designDir, 'screens.json'));
  const boards = (
    args.length > 0
      ? args.map((file) => path.basename(file))
      : readdirSync(designDir).filter((file) => file.endsWith(boardSuffix))
  ).sort((a, b) => slug(boardName(a)).localeCompare(slug(boardName(b))));

  const server = await serveDesignFolder();
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const browser = await chromium.launch();
  const all: DesignScreen[] = [];
  const empty: string[] = [];
  try {
    for (const file of boards) {
      const screens = await renderBoard(browser, origin, file, outDir);
      console.log(`${String(screens.length).padStart(4)}  ${boardName(file)}`);
      if (screens.length === 0) empty.push(file);
      all.push(...screens);
    }
  } finally {
    await browser.close();
    server.close();
  }

  mkdirSync(path.dirname(manifest), { recursive: true });
  writeFileSync(manifest, `${JSON.stringify(all, null, 2)}\n`);
  console.log(`${String(all.length).padStart(4)}  screens in ${boards.length} boards`);
  if (empty.length > 0) {
    throw new Error(`No screens were found in: ${empty.join(', ')}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
