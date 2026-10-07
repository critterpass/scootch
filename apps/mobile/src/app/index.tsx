import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { RestoreGate } from '../features/backup/restore-offer';
import { phoneSpeech } from '../features/composer/phone-speech';
import { nativeSpeech } from '../features/composer/speech';
import { HauntArrival } from '../features/haunt/haunt-containers';
import { HomePager } from '../features/home-pager/home-pager';
import { FirstLaunch } from '../features/launch/first-launch';
import { firstLaunchPending, type LaunchOutcome } from '../features/launch/launch-machine';
import { OneScreen } from '../features/one-screen/one-screen';
import { useLanguage } from '../i18n/i18n-provider';
import { useToday } from '../state/day-store-provider';
import { usePalette } from '../ui/use-palette';

/**
 * The app's only screen. A new phone meets first launch once; after that it is always the one
 * screen, with the world a swipe to one side of it and Settings a swipe to the other. Nothing is
 * drawn until today has been rebuilt from storage, so neither ever flashes by.
 */
export default function Home() {
  const { ready, settings } = useToday();
  const palette = usePalette();
  const { language } = useLanguage();
  const spoken = useRef(language);
  spoken.current = language;
  const speech = useMemo(
    () => phoneSpeech({ onDevice: nativeSpeech(), language: () => spoken.current }),
    [],
  );
  // Set as first launch finishes, and gone with the next start of the app.
  const [arrival, setArrival] = useState<LaunchOutcome | null>(null);

  if (!ready) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  if (firstLaunchPending(settings)) {
    // A new phone that already holds the backup token is offered its world back before anything.
    return (
      <RestoreGate>
        <FirstLaunch speech={speech} onDone={setArrival} />
      </RestoreGate>
    );
  }
  // A phone that could not be asked at first launch is asked once the server can be reached.
  return (
    <RestoreGate late>
      <HauntArrival />
      <HomePager>
        <OneScreen
          speech={speech}
          warmUp={arrival !== null}
          notificationsRefused={arrival?.notifications === 'refused'}
        />
      </HomePager>
    </RestoreGate>
  );
}
