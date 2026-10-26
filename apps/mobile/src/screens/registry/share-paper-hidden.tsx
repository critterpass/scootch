import { sampleSheet } from '../../features/share/share-sheet-sample';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The test paper with white-out over the task. */
export const sharePaperHidden: ScreenState = {
  id: 'share-paper-hidden',
  design: { board: 'ShareSheet', section: 'Share', screen: 'Task hidden' },
  component: sampleSheet('paper', true),
  variants: standardVariants(),
};
