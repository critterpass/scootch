import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** "Just this, today": a serious task in plain words, with the quiet choices. */
export const careSerious: ScreenState = {
  id: 'care-serious',
  design: {
    board: 'Care and Edge States',
    section: '01 Serious mode and crisis',
    screen: 'Serious mode · something heavy',
  },
  component: lazy(() =>
    import('../../features/care/captures').then((captures) => ({
      default: captures.CareSerious,
    })),
  ),
  variants: standardVariants(),
};
