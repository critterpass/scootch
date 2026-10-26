import { sampleSheet } from '../../features/share/share-sheet-sample';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The giấy khen with white-out over the task. */
export const shareCertificateHidden: ScreenState = {
  id: 'share-certificate-hidden',
  design: { board: 'ShareSheet', section: 'Share', screen: 'Certificate' },
  component: sampleSheet('certificate', true),
  variants: standardVariants(),
};
