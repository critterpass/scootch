import { describe, expect, it } from '@jest/globals';

import { t as translate } from '@scootch/i18n';

import type { Translate } from '../../i18n/i18n-provider';

import { cardName, nameAndTitle } from './monster-name';

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

describe("the name on a monster's card", () => {
  const en: Translate = (key, ...params) => translate('en', key, ...params);
  const vi: Translate = (key, ...params) => translate('vi', key, ...params);

  it('carries the word of an odd hatch after the name', () => {
    expect(cardName({ name: 'Molar', oddWord: 'tiny' }, en)).toBe('Molar (tiny)');
    expect(cardName({ name: 'Molar', oddWord: 'tiny' }, vi)).toBe('Molar (tí hon)');
  });

  it('is the name alone on every other monster, with the field unset or absent', () => {
    expect(cardName({ name: 'Molar', oddWord: null }, en)).toBe('Molar');
    expect(cardName({ name: 'Molar' }, en)).toBe('Molar');
  });
});
