import { useLocales } from 'expo-localization';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { systemClock } from '../../effects/native-adapters';
import { useDispatch, useToday } from '../../state/day-store-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import { CrisisView } from './crisis-view';
import { HELPLINE_DIRECTORY, dialLink, helplinesFor, textLink } from './helplines';
import { useNow } from './use-now';

/** Opens a link in whatever the phone uses for it. A phone that cannot open it does nothing. */
export function openLink(url: string): void {
  void Linking.openURL(url).catch(() => undefined);
}

/**
 * Where a crisis lands: real help first, and nothing of the day behind it. Nothing gets round it
 * but the person closing it; then the day's things are back in plain company, and this route,
 * with nothing left to show, goes back to the one screen. The helplines themselves are always in
 * Settings.
 */
export function CrisisScreen() {
  const { ready, today } = useToday();
  const { palette } = useScreenStyle();
  const region = useLocales()[0]?.regionCode ?? null;
  const [sitting, setSitting] = useState(false);
  const now = useNow(systemClock);
  const dispatch = useDispatch();

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
      onClose={() => void dispatch({ type: 'care_closed' }).catch(() => undefined)}
    />
  );
}
