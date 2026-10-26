import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useLanguage } from '../../i18n/i18n-provider';
import { lineFor } from '../desk/his-line';
import { useStudentName } from '../desk/use-student-name';

import { ScholarshipView } from './scholarship-view';
import { useTuition } from './tuition-provider';

/**
 * The scholarship on the server and the store: the ask goes to the server, which grants tuition
 * for a school year at RevenueCat; the store is then read again, and the certificate shows. The
 * note is the person's own and stays on the phone; the answer is the same without it.
 */
export function ScholarshipScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const tuition = useTuition();
  const name = useStudentName();
  const [state, setState] = useState<'asking' | 'sending' | 'failed' | 'granted'>('asking');
  const [askedAt] = useState(() => Date.now());

  return (
    <ScholarshipView
      state={state}
      name={name}
      now={askedAt}
      timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      line={
        state === 'granted'
          ? (lineFor(language, 'scholarshipGranted', askedAt)?.text ?? null)
          : null
      }
      onAsk={() => {
        setState('sending');
        void tuition.askScholarship().then((answer) => setState(answer));
      }}
      onBack={() => router.dismissTo('/')}
    />
  );
}
