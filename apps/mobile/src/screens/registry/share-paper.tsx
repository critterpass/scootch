import { sampleSheet } from '../../features/share/share-sheet-sample';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The test paper picked: the graded paper, his check and comment. */
export const sharePaper: ScreenState = {
  id: 'share-paper',
  design: { board: 'ShareSheet', section: 'Share', screen: 'Test paper' },
  component: sampleSheet('paper'),
  variants: standardVariants(['long-text']),
};
