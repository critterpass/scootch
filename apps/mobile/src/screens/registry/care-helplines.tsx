import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The helplines page, one tap from Settings. */
export const careHelplines: ScreenState = {
  id: 'care-helplines',
  design: null,
  undesignedReason:
    'The board says helplines are one tap from Settings but draws no page for them; it lists the table by country, with no critter.',
  component: lazy(() =>
    import('../../features/care/captures').then((captures) => ({
      default: captures.CareHelplines,
    })),
  ),
  variants: standardVariants(),
};
