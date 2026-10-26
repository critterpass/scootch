import { describe, expect, it } from '@jest/globals';

import { legalLink, PLANS, storeProductId } from './products';

describe('store product identifiers', () => {
  it('names the production products as App Store Connect has them', () => {
    expect(storeProductId('yearly', 'prd')).toBe('phusclass.tuition.yearly');
    expect(storeProductId('monthly', 'prd')).toBe('phusclass.tuition.monthly');
  });

  it("gives every other build the dev app's products, which Apple keeps apart", () => {
    for (const variant of ['dev', 'e2e-test', undefined]) {
      expect(storeProductId('yearly', variant)).toBe('phusclass.dev.tuition.yearly');
      expect(storeProductId('monthly', variant)).toBe('phusclass.dev.tuition.monthly');
    }
  });

  it('offers the school year first', () => {
    expect(PLANS[0]).toBe('yearly');
  });

  it('links the terms and privacy pages in the language the receipt is read in', () => {
    expect(legalLink('terms', 'en')).toBe('https://phusclass.com/terms');
    expect(legalLink('privacy', 'vi')).toBe('https://phusclass.com/vi/privacy');
  });
});
