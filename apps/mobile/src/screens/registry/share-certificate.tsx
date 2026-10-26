import { sampleSheet } from '../../features/share/share-sheet-sample';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The giấy khen, offered only for a finish that earned one. */
export const shareCertificate: ScreenState = {
  id: 'share-certificate',
  design: { board: 'ShareSheet', section: 'Share', screen: 'Certificate' },
  component: sampleSheet('certificate'),
  variants: standardVariants(),
};
