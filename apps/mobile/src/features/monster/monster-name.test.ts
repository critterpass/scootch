import { describe, expect, it } from '@jest/globals';

import { nameAndTitle } from './monster-name';

describe('how a hatched monster is introduced', () => {
  it('gives its name and its title', () => {
    expect(nameAndTitle({ name: 'Molar', title: 'Keeper of Thursday' })).toBe(
      'Molar, Keeper of Thursday',
    );
  });

  it('does not add a second title to a name that carries its own', () => {
    expect(nameAndTitle({ name: 'Tooth, Keeper of Thursday', title: 'Baron of Later' })).toBe(
      'Tooth, Keeper of Thursday',
    );
  });
});
