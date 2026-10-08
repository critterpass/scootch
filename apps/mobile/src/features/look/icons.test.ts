import { describe, expect, it } from '@jest/globals';

import type { CardFinish } from '@scootch/domain';

import { alternateName, APP_ICONS, iconFor, mayShow, type IconFacts } from './icons';

const everyone = (finish: CardFinish): boolean => finish === 'paper';
const plus = (_finish: CardFinish): boolean => true;

function icon(settings: Partial<IconFacts['settings']>, finish: CardFinish, mayWear = plus) {
  return iconFor({
    settings: { attitude: 'cheeky', iconFollows: 'attitude', iconPinned: 'cheeky', ...settings },
    finish,
    mayWear,
  });
}

describe('which icon the app wears', () => {
  it('follows the attitude by default, whatever finish is worn', () => {
    for (const attitude of ['soft', 'cheeky', 'unhinged'] as const) {
      expect(icon({ attitude }, 'holo')).toBe(attitude);
    }
  });

  it('follows the worn finish, and velvet is the icon of flock', () => {
    expect(icon({ iconFollows: 'finish' }, 'holo')).toBe('holo');
    expect(icon({ iconFollows: 'finish' }, 'flock')).toBe('velvet');
    expect(icon({ iconFollows: 'finish' }, 'paper', everyone)).toBe('paper');
  });

  it('stays as picked', () => {
    expect(icon({ iconFollows: 'pinned', iconPinned: 'unhinged', attitude: 'soft' }, 'paper')).toBe(
      'unhinged',
    );
    expect(icon({ iconFollows: 'pinned', iconPinned: 'riso' }, 'paper')).toBe('riso');
  });

  it("falls back to the attitude's icon for a finish that may not be worn", () => {
    expect(icon({ iconFollows: 'finish', attitude: 'soft' }, 'chrome', everyone)).toBe('soft');
    expect(icon({ iconFollows: 'pinned', iconPinned: 'jelly' }, 'paper', everyone)).toBe('cheeky');
    expect(icon({ iconFollows: 'pinned', iconPinned: 'not-an-icon' }, 'paper')).toBe('cheeky');
  });

  it('shows an attitude icon to everyone and a finish icon to whoever may wear the finish', () => {
    const shown = APP_ICONS.filter((one) => mayShow(one, everyone));
    expect(shown).toEqual(['soft', 'cheeky', 'unhinged', 'paper']);
    expect(APP_ICONS.filter((one) => mayShow(one, plus))).toHaveLength(10);
  });

  it("knows Cheeky as the app's own icon and the others by name", () => {
    expect(alternateName('cheeky')).toBeNull();
    expect(alternateName('velvet')).toBe('Icon-velvet');
  });
});
