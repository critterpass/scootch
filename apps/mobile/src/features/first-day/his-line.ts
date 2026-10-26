import { createChooser, type FillValues, type Moment } from '@phusclass/voice/class';

import { useLanguage } from '../../i18n/i18n-provider';

/** One of his offline lines for a moment, the same for the same seed. Empty where he is silent. */
export function hisLine(
  language: 'en' | 'vi',
  moment: Moment,
  seed: string | number,
  values: FillValues = {},
): string {
  return createChooser(language).say(moment, seed, values)?.text ?? '';
}

/** His lines in the app's language. */
export function useHisLine(): (
  moment: Moment,
  seed: string | number,
  values?: FillValues,
) => string {
  const { language } = useLanguage();
  return (moment, seed, values = {}) => hisLine(language, moment, seed, values);
}
