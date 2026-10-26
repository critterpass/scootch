import type { ComponentType } from 'react';

import { useLanguage } from '../../i18n/i18n-provider';
import { useForcedVariant } from '../../screens/registry/support/forced-variant';

import { ShareSheet } from './share-sheet';
import { formatsFor, type ShareFormat } from './share-rules';
import { sampleSubject } from './share-samples';

/**
 * The share sheet as a registry capture shows it: the brief's example finish (the certificate's
 * own for the giấy khen, a long task under the long-text condition), one format picked, white-out
 * on or off. `null` shows the sheet with nothing to share.
 */
export function sampleSheet(format: ShareFormat | null, hide = false): ComponentType {
  return function SampleShareSheet() {
    const { language } = useLanguage();
    const long = useForcedVariant()?.condition === 'long-text';
    const close = () => undefined;
    if (format === null)
      return <ShareSheet offer={{ kind: 'blocked', why: 'heavy task' }} onClose={close} />;
    const subject = sampleSubject(
      language,
      long ? 'long' : format === 'certificate' ? 'certificate' : 'plain',
    );
    const ready = { ...subject, giayKhen: format === 'certificate' || subject.giayKhen };
    return (
      <ShareSheet
        offer={{ kind: 'ready', subject: ready, formats: formatsFor(ready) }}
        onClose={close}
        initialFormat={format}
        initialHide={hide}
      />
    );
  };
}
