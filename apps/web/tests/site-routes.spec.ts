import { expect, test } from '@playwright/test';

import { workerUrl } from './playwright.config';

// The bundled site in the Workers runtime, routed as it is when deployed.
test.describe('addresses with and without a trailing slash', () => {
  const plain = ['privacy', 'terms', 'support', 'helplines', 'help'];

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
    applinks: { details: { appIDs: string[] }[] };
    webcredentials: { apps: string[] };
    appclips?: unknown;
  };
  const apps = ['YFND2EEW8S.com.phusclass', 'YFND2EEW8S.com.phusclass.dev'];
  expect(file.applinks.details[0]?.appIDs).toEqual(apps);
  expect(file.webcredentials.apps).toEqual(apps);
  expect(file.appclips).toBeUndefined();
});
