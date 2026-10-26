import { sampleSheet } from '../../features/share/share-sheet-sample';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The sheet opened for a finish that may not be shared: a serious task, or a crisis day. */
export const shareNothing: ScreenState = {
  id: 'share-nothing',
  design: null,
  undesignedReason:
    'Other screens never offer sharing for a serious task or on a crisis day; this is what the sheet shows if it is opened anyway.',
  component: sampleSheet(null),
  variants: standardVariants(),
};
