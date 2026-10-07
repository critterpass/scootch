import { describe, expect, it } from '@jest/globals';

import { storeProductId } from './products';

describe('store product identifiers', () => {
  it('keeps the plain identifier outside production', () => {
    expect(storeProductId('plus_monthly', 'dev')).toBe('plus_monthly');
    expect(storeProductId('ink_gold_leaf', 'e2e-test')).toBe('ink_gold_leaf');
    expect(storeProductId('plus_yearly', undefined)).toBe('plus_yearly');
  });

  it('prefixes every production identifier, since Apple keeps them unique per account', () => {
    expect(storeProductId('plus_monthly', 'prd')).toBe('scootch_plus_monthly');
    expect(storeProductId('ink_gold_leaf', 'prd')).toBe('scootch_ink_gold_leaf');
  });
});
