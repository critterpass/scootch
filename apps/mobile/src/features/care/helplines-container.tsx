import { useLocales } from 'expo-localization';
import { useRouter } from 'expo-router';

import { systemClock } from '../../effects/native-adapters';

import { openLink } from './crisis-screen';
import { HELPLINE_DIRECTORY, dialLink, textLink } from './helplines';
import { HelplinesPage } from './helplines-page';
import { useNow } from './use-now';

/** The helplines page as Settings opens it. */
export function HelplinesContainer() {
  const region = useLocales()[0]?.regionCode ?? null;
  const router = useRouter();
  const now = useNow(systemClock);
  return (
    <HelplinesPage
      region={region}
      now={now}
      onCall={(line) => openLink(dialLink(line))}
      onTextLine={(line) => openLink(textLink(line) ?? dialLink(line))}
      onDirectory={() => openLink(HELPLINE_DIRECTORY)}
      onClose={() => router.replace('/settings')}
    />
  );
}
