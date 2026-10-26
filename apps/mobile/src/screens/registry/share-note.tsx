import { sampleSheet } from '../../features/share/share-sheet-sample';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The note home in his hand. */
export const shareNote: ScreenState = {
  id: 'share-note',
  design: { board: 'ShareSheet', section: 'Share', screen: 'Note home' },
  component: sampleSheet('note'),
  variants: standardVariants(['long-text']),
};
