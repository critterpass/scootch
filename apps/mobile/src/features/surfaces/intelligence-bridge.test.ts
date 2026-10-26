import { describe, expect, it } from '@jest/globals';

import { createIntelligence } from '../../../modules/phusclass-intelligence';

describe('the on-device model bridge', () => {
  it('answers "not there" in a build without the module', async () => {
    const none = createIntelligence(null);
    expect(none.isAvailable()).toBe(false);
    expect(await none.splitTasks('buy milk and call mum', 'en')).toBeNull();
    expect(await none.screenHint('buy milk', 'en')).toBeNull();
  });

  it('passes on only what the contract allows', async () => {
    const model = createIntelligence({
      isAvailable: () => true,
      splitTasks: () => Promise.resolve(['buy milk', ' ', 'call mum', 7 as unknown as string]),
      screenHint: (text) => Promise.resolve(text.includes('hospital') ? 'serious' : 'maybe'),
    });
    expect(model.isAvailable()).toBe(true);
    expect(await model.splitTasks('buy milk and call mum', 'en')).toEqual(['buy milk', 'call mum']);
    expect(await model.screenHint('the hospital results', 'en')).toBe('serious');
    // Anything outside none, serious and crisis is no answer at all.
    expect(await model.screenHint('buy milk', 'en')).toBeNull();
  });

  it('turns every failure into "not there"', async () => {
    const failing = createIntelligence({
      isAvailable: () => {
        throw new Error('no model');
      },
      splitTasks: () => Promise.reject(new Error('refused')),
      screenHint: () => Promise.reject(new Error('guardrail')),
    });
    expect(failing.isAvailable()).toBe(false);
    expect(await failing.splitTasks('buy milk and call mum', 'vi')).toBeNull();
    expect(await failing.screenHint('buy milk', 'vi')).toBeNull();
  });
});
