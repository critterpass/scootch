import { sampleSheet } from '../../features/share/share-sheet-sample';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The note home with white-out over the task inside his sentence. */
export const shareNoteHidden: ScreenState = {
  id: 'share-note-hidden',
  design: { board: 'ShareSheet', section: 'Share', screen: 'Note home' },
  component: sampleSheet('note', true),
  variants: standardVariants(),
};
