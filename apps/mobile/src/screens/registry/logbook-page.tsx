import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The logbook page: finished tasks newest first, the day in the margin, his comment in red and his signature. */
export const logbookPage: ScreenState = {
  id: 'logbook-page',
  design: { board: 'LogbookPage', section: 'Pull and swipe', screen: 'LogbookPage' },
  component: lazy(() =>
    import('../../features/logbook/logbook-fixtures').then((screen) => ({
      default: screen.LogbookFull,
    })),
  ),
  variants: standardVariants(),
};
