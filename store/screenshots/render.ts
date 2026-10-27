// Draws the App Store frames from simulator captures.
//
//   pnpm exec tsx store/screenshots/render.ts <captures folder> <out folder>
//
// <captures folder> holds `<state>--<lang>-light-default.png` images, as a capture run of
// e2e/sheets/capture-registry.yaml leaves them (see store/README.md). The frames go to
// <out folder>/<size>/<lang>/NN-<state>.jpg, one set per display size, with a contact sheet of
// each size beside them. Nothing it writes belongs in the repository.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { colors } from '../../packages/tokens/src/index.ts';
import { checkClassLine } from '../../packages/voice/src/class/check.ts';

import { frames, type FrameLanguage } from './captions.ts';

// Playwright is a dependency of the repo scripts package, so it is found from there. Its types are
// not visible from this folder, so the few calls used here are typed below.
type Page = {
  goto(url: string): Promise<unknown>;
  waitForSelector(selector: string): Promise<unknown>;
  evaluate(expression: string): Promise<unknown>;
  screenshot(options: {
    path: string;
    type?: 'jpeg' | 'png';
    quality?: number;
    fullPage?: boolean;
  }): Promise<unknown>;
  close(): Promise<void>;
};
type Browser = {
  newPage(options: {
    viewport: { width: number; height: number };
    deviceScaleFactor?: number;
  }): Promise<Page>;
  close(): Promise<void>;
};
type Chromium = { launch(options: { args: string[] }): Promise<Browser> };

const here = dirname(fileURLToPath(import.meta.url));
const requireFromScripts = createRequire(join(here, '../../tools/scripts/package.json'));
const { chromium } = requireFromScripts('playwright') as { chromium: Chromium };

/** The App Store display sizes drawn, in pixels, with their App Store Connect display type. */
export const sizes = [
  // iPhone with Dynamic Island, large display (6.9"): also covers the 6.5" set.
  { name: 'iphone-69', displayType: 'APP_IPHONE_67', width: 1320, height: 2868 },
  // iPhone with Dynamic Island, medium display (6.3"): the set App Store Connect requires.
  { name: 'iphone-63', displayType: 'APP_IPHONE_61', width: 1206, height: 2622 },
] as const;

export const languages: readonly FrameLanguage[] = ['en', 'vi'];

/** The share of each capture's height drawn: below it the debug build prints its commit. */
const visible = 0.976;

const font = '/System/Library/Fonts/SFNSRounded.ttf';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Every caption passes the word check before anything is drawn. */
function checkCaptions(): void {
  const failures: string[] = [];
  for (const frame of frames) {
    for (const lang of languages) {
      const { title, sub } = frame.caption[lang];
      for (const text of [title, sub]) {
        const result = checkClassLine(text, lang);
        if (!result.ok)
          failures.push(`${frame.state} ${lang} "${text}": ${result.reasons.join(', ')}`);
      }
    }
  }
  if (failures.length > 0) throw new Error(`Captions fail the word check:\n${failures.join('\n')}`);
}

function pageFor(
  capture: string,
  lang: FrameLanguage,
  title: string,
  sub: string,
  ratio: number,
): string {
  const palette = colors.light;
  const slots: Record<string, string> = {
    lang,
    font: pathToFileURL(font).href,
    page: palette.page,
    ink: palette.ink,
    muted: palette.muted,
    blob: palette.risoBlob,
    tomato: palette.tomato,
    ratio: (ratio * visible).toFixed(5),
    visible: String(visible),
    title: escapeHtml(title),
    sub: escapeHtml(sub),
    capture: pathToFileURL(capture).href,
  };
  const template = readFileSync(join(here, 'frame.html'), 'utf8');
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = slots[key];
    if (value === undefined) throw new Error(`frame.html has an unknown slot {{${key}}}`);
    return value;
  });
}

/** Width over height of a PNG, read from its header. */
function pngRatio(path: string): number {
  const header = readFileSync(path).subarray(16, 24);
  return header.readUInt32BE(4) / header.readUInt32BE(0);
}

async function main(): Promise<void> {
  const [capturesArg, outArg] = process.argv.slice(2);
  if (!capturesArg || !outArg) throw new Error('Usage: render.ts <captures folder> <out folder>');
  const captures = resolve(capturesArg);
  const out = resolve(outArg);
  checkCaptions();

  const missing = frames.flatMap((frame) =>
    languages
      .map((lang) => join(captures, `${frame.state}--${lang}-light-default.png`))
      .filter((path) => !existsSync(path)),
  );
  if (missing.length > 0) throw new Error(`Missing captures:\n${missing.join('\n')}`);

  const browser = await chromium.launch({ args: [] });
  try {
    for (const size of sizes) {
      // Three pixels to the point, as on the phones themselves.
      const page = await browser.newPage({
        viewport: { width: size.width / 3, height: size.height / 3 },
        deviceScaleFactor: 3,
      });
      const drawn: string[] = [];
      for (const lang of languages) {
        const folder = join(out, size.name, lang);
        mkdirSync(folder, { recursive: true });
        for (const [index, frame] of frames.entries()) {
          const capture = join(captures, `${frame.state}--${lang}-light-default.png`);
          const { title, sub } = frame.caption[lang];
          const html = join(folder, `.frame.html`);
          writeFileSync(html, pageFor(capture, lang, title, sub, pngRatio(capture)));
          await page.goto(pathToFileURL(html).href);
          await page.waitForSelector('body[data-ready="true"]');
          await page.evaluate('document.fonts.ready');
          const file = join(folder, `${String(index + 1).padStart(2, '0')}-${frame.state}.jpg`);
          // JPEG: opaque by nature, and App Store Connect refuses an alpha channel.
          await page.screenshot({ path: file, type: 'jpeg', quality: 95 });
          drawn.push(file);
        }
      }
      await page.close();
      await contactSheet(browser, drawn, join(out, `contact-${size.name}.png`));
      console.log(`${size.name}: ${drawn.length} frames`);
    }
  } finally {
    await browser.close();
  }
}

/** All frames of one size side by side, a row per language, for looking them over at once. */
async function contactSheet(
  browser: Browser,
  files: readonly string[],
  path: string,
): Promise<void> {
  const perRow = frames.length;
  const cells = files
    .map((file) => `<img src="${pathToFileURL(file).href}" style="width:300px;margin:12px">`)
    .join('');
  const page = await browser.newPage({ viewport: { width: perRow * 324 + 24, height: 800 } });
  // A file page, so it may show the frames beside it.
  const html = `${path}.html`;
  writeFileSync(html, `<body style="margin:12px;background:#ddd">${cells}</body>`);
  await page.goto(pathToFileURL(html).href);
  await page.screenshot({ path, fullPage: true });
  await page.close();
}

await main();
