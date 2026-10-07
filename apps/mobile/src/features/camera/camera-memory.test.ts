import { describe, expect, it } from '@jest/globals';

import { consentFromStored, triesFromStored } from './camera-memory';

describe('what the phone remembers about the camera', () => {
  it('reads back the tries it stored', () => {
    expect(triesFromStored({ paper: 1, screen: 0 })).toEqual({ paper: 1, screen: 0 });
  });

  it.each([null, 'x', 4, {}, { paper: -1, screen: 0.5 }, { paper: '1' }])(
    'counts no try used for a stored value it cannot read: %j',
    (stored) => {
      expect(triesFromStored(stored)).toEqual({ paper: 0, screen: 0 });
    },
  );

  it.each([null, 'not_given', 'yes', true, { given: true }])(
    'reads consent as given only when exactly that was stored: %j',
    (stored) => {
      expect(consentFromStored(stored)).toBe('not_given');
    },
  );

  it('reads a stored yes', () => {
    expect(consentFromStored('given')).toBe('given');
  });
});
