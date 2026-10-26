// Draws the site's icons and link previews from the art in `src/art` and the words in `src/copy`,
// in a headless browser, and writes them into `public/`. Run it again after the art or a page's
// title changes:
//
//   pnpm --filter @phusclass/web images
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

import { en } from '../src/copy/en.ts';
import { helpEn } from '../src/copy/help-en.ts';
import { helpVi } from '../src/copy/help-vi.ts';
import { legalEn } from '../src/copy/legal-en.ts';
import { legalVi } from '../src/copy/legal-vi.ts';
import { vi } from '../src/copy/vi.ts';

const web = path.resolve(import.meta.dirname, '..');
const art = (file) => readFileSync(path.join(web, 'src/art', file), 'utf8');
const font = readFileSync(path.join(web, 'public/fonts/kithfield-hand-bold.woff2')).toString(
  'base64',
);
const icon = art('icon.svg');

// The rounded icon is the favicon; Apple rounds the touch icon itself, so it is drawn square.
writeFileSync(path.join(web, 'public/favicon.svg'), icon);
const square = icon.replace(' clip-path="url(#ic)"', '');

const copies = {
  en: { site: en, legal: legalEn, help: helpEn },
  vi: { site: vi, legal: legalVi, help: helpVi },
};
const pages = {
  home: { mood: 'over', line: (c) => c.site.home.hero.line, sub: (c) => c.site.home.hero.eyebrow },
  tuition: {
    mood: 'approve',
    line: (c) => c.site.tuitionPage.headline,
    sub: (c) => c.site.home.tuition.title,
  },
  support: {
    mood: 'think',
    line: (c) => c.help.support.headline,
    sub: (c) => c.help.support.email,
  },
  privacy: {
    mood: 'grading',
    line: (c) => c.legal.privacy.headline,
    sub: (c) => c.site.footer.tagline,
  },
  terms: { mood: 'calm', line: (c) => c.legal.terms.headline, sub: (c) => c.site.footer.tagline },
  helplines: {
    mood: null,
    line: (c) => c.help.helplines.headline,
    sub: (c) => c.help.helplines.description,
  },
};

const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

function preview(language, page) {
  const copy = copies[language];
  const { mood, line, sub } = pages[page];
  const phu = mood
    ? `<div class="phu">${art(`phu/${mood}.svg`)}</div><div class="desk"></div>`
    : '';
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><style>
@font-face{font-family:Hand;src:url(data:font/woff2;base64,${font}) format('woff2')}
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#fff6e9;font-family:system-ui,sans-serif;overflow:hidden}
.board{position:absolute;left:40px;top:40px;width:${mood ? 760 : 1120}px;height:550px;background:#2f6b56;border:18px solid #8a5a36;border-radius:28px;padding:56px 60px;color:#f5f2e8;
background-image:linear-gradient(105deg,transparent 0 34%,rgba(255,255,255,.05) 34% 50%,transparent 50%)}
.brand{font-family:Hand;font-size:46px;opacity:.75;margin:0 0 26px}
.line{font-family:Hand;font-size:${page === 'home' ? 92 : 80}px;line-height:1.02;margin:0 0 28px}
.sub{font-size:28px;font-weight:700;line-height:1.3;opacity:.8;margin:0;max-width:640px}
.phu{position:absolute;right:30px;top:120px;width:420px}
.phu svg{width:100%;height:auto;display:block}
.desk{position:absolute;right:0;top:520px;width:500px;height:110px;background:linear-gradient(#e8b07a 0 22%,#c8884f 22%)}
</style></head><body><div class="board"><p class="brand">${escape(copy.site.brand.name)}</p><p class="line">${escape(line(copy))}</p><p class="sub">${escape(sub(copy))}</p></div>${phu}</body></html>`;
}

const browser = await chromium.launch();
const shot = async (html, size, file) => {
  const page = await browser.newPage({ viewport: size });
  await page.setContent(html);
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.screenshot({
    path: path.join(web, 'public', file),
    omitBackground: file === 'favicon.png',
  });
  await page.close();
};
const iconPage = (svg, size) =>
  `<body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`;

await shot(iconPage(icon, 64), { width: 64, height: 64 }, 'favicon.png');
await shot(iconPage(square, 180), { width: 180, height: 180 }, 'apple-touch-icon.png');
mkdirSync(path.join(web, 'public/og'), { recursive: true });
for (const language of Object.keys(copies)) {
  for (const page of Object.keys(pages)) {
    await shot(preview(language, page), { width: 1200, height: 630 }, `og/${language}-${page}.png`);
  }
}
await browser.close();
console.log('icons and link previews written to public/');
