import { test } from '@playwright/test';

import { en } from '../src/copy/en';
import { vi } from '../src/copy/vi';
import { scootchSvg } from '../src/lib/drawings';

// Draws the home page's link preview image (`public/og/home-<language>.png`, 1200 by 630): printed
// paper, one tomato blob, Scootch on the left and one line on the right, inside the middle 1000
// pixels. Runs only when RENDER_HOME_PREVIEW is set; the images are committed.
test.skip(!process.env['RENDER_HOME_PREVIEW'], 'RENDER_HOME_PREVIEW is not set');

// The site's light inks, as in `@scootch/tokens` (its JSON cannot be imported from a test file).
const ink = {
  page: '#F6F3EE',
  ink: '#1C1A17',
  muted: '#6F6A62',
  tomato: '#F0562E',
  risoBlob: '#F3E6D3',
};
const lines = {
  en: { headline: en.maker.headline, sub: 'Type it. Get a monster. Feel a bit better.' },
  vi: { headline: vi.maker.headline, sub: 'Gõ ra. Nhận một con quái. Thấy nhẹ hơn chút.' },
};

for (const [language, copy] of Object.entries(lines)) {
  test(`home preview ${language}`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.setContent(`<!doctype html><html lang="${language}"><body style="margin:0">
      <div style="position:relative;width:1200px;height:630px;overflow:hidden;background:${ink.page};
        font-family:ui-rounded,'SF Pro Rounded','Nunito',system-ui,sans-serif;color:${ink.ink}">
        <div style="position:absolute;left:680px;top:-160px;width:660px;height:660px;border-radius:50%;
          background-color:${ink.risoBlob};background-image:radial-gradient(${ink.tomato}55 1.6px,transparent 2px);
          background-size:13px 13px"></div>
        <div style="position:absolute;left:120px;top:165px;width:320px">${scootchSvg('waiting')}</div>
        <div style="position:absolute;left:500px;top:190px;width:600px">
          <div style="font:800 25px system-ui;letter-spacing:3px;color:#C63D1B">SCOOTCH</div>
          <div style="font-weight:800;font-size:64px;line-height:1.08;letter-spacing:-1.5px;margin-top:10px">${copy.headline}</div>
          <div style="font:500 29px system-ui;color:${ink.muted};margin-top:18px">${copy.sub}</div>
          <div style="font-weight:800;font-size:32px;margin-top:26px">scootch<span style="color:${ink.tomato}">.</span>app</div>
        </div>
      </div></body></html>`);
    await page.screenshot({ path: `public/og/home-${language}.png` });
  });
}
