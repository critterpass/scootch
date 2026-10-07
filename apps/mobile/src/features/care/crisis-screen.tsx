import { useLocales } from 'expo-localization';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { systemClock } from '../../effects/native-adapters';
import { useToday } from '../../state/day-store-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import { CrisisView } from './crisis-view';
import { HELPLINE_DIRECTORY, dialLink, helplinesFor, textLink } from './helplines';
import { useNow } from './use-now';

/** Opens a link in whatever the phone uses for it. A phone that cannot open it does nothing. */
export function openLink(url: string): void {
  void Linking.openURL(url).catch(() => undefined);
}

/**
 * Where a crisis day lands, and stays: there is no override and no way round it for the rest of
 * the day. On any other day this route has nothing to show and goes back to the one screen; the
 * helplines themselves are always in Settings.
 */
export function CrisisScreen() {
  const { ready, today } = useToday();
  const { palette } = useScreenStyle();
  const region = useLocales()[0]?.regionCode ?? null;
  const [sitting, setSitting] = useState(false);
  const now = useNow(systemClock);

  if (!ready) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  if (today.kind !== 'crisis') return <Redirect href="/" />;
  return (
    <CrisisView
      helplines={helplinesFor(region)}
      now={now}
      sitting={sitting}
      onCall={(line) => openLink(dialLink(line))}
      onTextLine={(line) => openLink(textLink(line) ?? dialLink(line))}
      onDirectory={() => openLink(HELPLINE_DIRECTORY)}
      onText={() => openLink('sms:')}
      onSit={() => setSitting(true)}
    />
  );
}
