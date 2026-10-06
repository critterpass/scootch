import { useLocales } from 'expo-localization';
import { useRouter } from 'expo-router';

import { openLink } from './crisis-screen';
import { HELPLINE_DIRECTORY, dialLink } from './helplines';
import { HelplinesPage } from './helplines-page';

/** The helplines page as Settings opens it. */
export function HelplinesContainer() {
  const region = useLocales()[0]?.regionCode ?? null;
  const router = useRouter();
  return (
    <HelplinesPage
      region={region}
      onCall={(line) => openLink(dialLink(line))}
      onDirectory={() => openLink(HELPLINE_DIRECTORY)}
      onClose={() => router.replace('/settings')}
    />
  );
}
