import { sampleSheet } from '../../features/share/share-sheet-sample';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The carved desk from above. */
export const shareDesk: ScreenState = {
  id: 'share-desk',
  design: { board: 'ShareSheet', section: 'Share', screen: 'Your desk' },
  component: sampleSheet('desk'),
  variants: standardVariants(),
};
