import { expect, test } from '@playwright/test';

import { workerUrl } from './playwright.config';

// The bundled site in the Workers runtime, routed as it is when deployed.
test.describe('addresses with and without a trailing slash', () => {
  const plain = ['tuition', 'privacy', 'terms', 'support', 'helplines'];

  for (const path of [...plain.flatMap((name) => [`/${name}`, `/vi/${name}`]), '/vi']) {
    test(`${path} answers in both forms`, async ({ request }) => {
      const bare = await request.get(`${workerUrl}${path}`);
      const slashed = await request.get(`${workerUrl}${path}/`);

      expect(bare.status()).toBe(200);
      expect(slashed.status()).toBe(200);
      expect(await bare.text()).toBe(await slashed.text());
    });
  }
});

test('the association file is JSON at Apple’s address, with no redirect, for both apps', async ({
  request,
}) => {
  const response = await request.get(`${workerUrl}/.well-known/apple-app-site-association`, {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('application/json');
  const file = (await response.json()) as {
    applinks: { details: { appIDs: string[]; components: { '/': string; exclude?: boolean }[] }[] };
    webcredentials: { apps: string[] };
    appclips?: unknown;
  };
  const apps = ['YFND2EEW8S.com.phusclass', 'YFND2EEW8S.com.phusclass.dev'];
  expect(file.applinks.details[0]?.appIDs).toEqual(apps);
  expect(file.webcredentials.apps).toEqual(apps);
  expect(file.appclips).toBeUndefined();
  // The home page opens the app; the helplines never do, in either language.
  const components = file.applinks.details[0]?.components ?? [];
  expect(components).toContainEqual({ '/': '/' });
  expect(components).toContainEqual({ '/': '/vi/*' });
  const first = (path: string) =>
    components.find((rule) => new RegExp(`^${rule['/'].replace('*', '.*')}$`).test(path));
  expect(first('/vi/helplines')?.exclude).toBe(true);
  expect(first('/vi/')?.exclude).toBeUndefined();
});

test('the site describes itself to robots and to security researchers', async ({ request }) => {
  const robots = await request.get(`${workerUrl}/robots.txt`);
  expect(await robots.text()).toContain('Sitemap: https://phusclass.com/sitemap.xml');
  const security = await request.get(`${workerUrl}/.well-known/security.txt`);
  expect(security.status()).toBe(200);
  expect(await security.text()).toMatch(/^Contact: mailto:/m);
  const sitemap = await (await request.get(`${workerUrl}/sitemap.xml`)).text();
  for (const path of ['/', '/vi/', '/tuition', '/vi/helplines']) {
    expect(sitemap).toContain(`<loc>https://phusclass.com${path}</loc>`);
  }
});
