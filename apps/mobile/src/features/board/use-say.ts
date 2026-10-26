import { useCallback, useMemo } from 'react';

import { createChooser } from '@phusclass/voice/class';

import { useLanguage } from '../../i18n/i18n-provider';

import type { Say } from './board-controls';

/**
 * His offline lines in the app's language. The chooser remembers the last variant of each moment,
 * so the same line never comes twice in a row while the screen is open.
 */
export function useSay(): Say {
  const { language } = useLanguage();
  const chooser = useMemo(() => createChooser(language), [language]);
  return useCallback<Say>(
    (moment, seed, values) => chooser.say(moment, seed, values)?.text,
    [chooser],
  );
}
