import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/**
 * The one screen as a new day meets it: Scootch waiting, his sentence and the one action. It has
 * no field, no list and no request yet, so there is no keyboard, empty or offline capture, and
 * its only sentence is fixed, so there is no long-text capture either.
 */
export const oneScreenWaiting: ScreenState = {
  id: 'one-screen-waiting',
  design: { board: 'Scootch', section: '02 The one screen', screen: 'Waiting · live composer' },
  component: lazy(() => import('../../app/index')),
  variants: standardVariants(),
};
