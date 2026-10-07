import { describe, expect, it } from '@jest/globals';
import { builtInTaskTexts, isBuiltInTaskText } from '@scootch/domain';
import { languages, t } from '@scootch/i18n';

import { careGate } from './care-gate';

const CHIPS = ['launch.chip.reply', 'launch.chip.water', 'launch.chip.email'] as const;

describe('the first-run suggestions', () => {
  it.each(languages)('are the texts the server knows by heart, in %s', (language) => {
    expect(CHIPS.map((key) => t(language, key))).toEqual([...builtInTaskTexts[language]]);
  });

  it.each(languages)('are ordinary to the phone and never held, in %s', (language) => {
    for (const key of CHIPS) {
      expect(isBuiltInTaskText(t(language, key))).toBe(true);
      expect(careGate(t(language, key))).toBe('clear');
    }
  });

  it('are only those exact words', () => {
    expect(isBuiltInTaskText('open the scary email from the court')).toBe(false);
  });
});
