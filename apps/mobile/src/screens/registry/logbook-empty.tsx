import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The logbook before anything is finished. */
export const logbookEmpty: ScreenState = {
  id: 'logbook-empty',
  design: { board: 'LogbookEmpty', section: 'Pull and swipe', screen: 'LogbookEmpty' },
  component: lazy(() =>
    import('../../features/logbook/logbook-fixtures').then((screen) => ({
      default: screen.LogbookEmpty,
    })),
  ),
  variants: standardVariants(),
};
