import { describe, expect, it } from '@jest/globals';

import { siteBaseUrlFor } from '../../api/api-config';

import { sharedPageLink } from './share-links';

describe('a link to a shared page', () => {
  it('is the site, the language path, the kind and the id, for each of the four shares', () => {
    const site = siteBaseUrlFor('prd');
    expect(site).toBe('https://scootch.app');
    expect(sharedPageLink(site, 'en', 'h', 'abcdefgh234567ab')).toBe(`${site}/h/abcdefgh234567ab`);
    expect(sharedPageLink(site, 'vi', 'h', 'abcdefgh234567ab')).toBe(
      `${site}/vi/h/abcdefgh234567ab`,
    );
    expect(sharedPageLink(site, 'en', 't', 'abcdefgh23')).toBe(`${site}/t/abcdefgh23`);
    expect(sharedPageLink(site, 'vi', 't', 'abcdefgh23')).toBe(`${site}/vi/t/abcdefgh23`);
    expect(sharedPageLink(site, 'en', 'c', 'molar-7f3k9x')).toBe(`${site}/c/molar-7f3k9x`);
    expect(sharedPageLink(site, 'vi', 'c', 'rang-7f3k9x')).toBe(`${site}/vi/c/rang-7f3k9x`);
    expect(sharedPageLink(site, 'en', 's', 'molar-7f3k9x')).toBe(`${site}/s/molar-7f3k9x`);
    expect(sharedPageLink(site, 'vi', 's', 'rang-7f3k9x')).toBe(`${site}/vi/s/rang-7f3k9x`);
  });

  it('opens on the dev site from the dev app, a device run and an unknown variant', () => {
    const dev = 'https://scootch-web-dev.bkdev98.workers.dev';
    for (const variant of ['dev', 'e2e-test', 'something-else', undefined]) {
      expect(siteBaseUrlFor(variant)).toBe(dev);
    }
    expect(sharedPageLink(dev, 'vi', 't', 'abcdefgh23')).toBe(`${dev}/vi/t/abcdefgh23`);
    expect(sharedPageLink(dev, 'en', 's', 'molar-7f3k9x')).toBe(`${dev}/s/molar-7f3k9x`);
  });
});
