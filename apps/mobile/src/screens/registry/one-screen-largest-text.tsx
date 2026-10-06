import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The waiting screen at the largest text size: Scootch shrinks and the controls stack. */
export const oneScreenLargestText: ScreenState = {
  id: 'one-screen-largest-text',
  design: {
    board: 'Care and Edge States',
    section: '03 Accessibility',
    screen: 'Largest text size',
  },
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenWaiting,
    })),
  ),
  variants: standardVariants().filter((variant) => variant.textSize === 'largest'),
};
