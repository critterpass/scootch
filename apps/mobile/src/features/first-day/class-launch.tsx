import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCareScreening } from '../care/use-care-screening';
import { useNotesHome } from '../notes/use-notes-home';
import { useDeleteEverythingLeftover } from '../settings/delete-everything';

import { firstDayRedirect } from './first-day-redirect';
import { Splash } from './splash';
import { useFirstDay } from './student';

/**
 * What runs from launch: the redirect to the first day until it is done, the animated splash over
 * the first scene, and the app-wide care screening and notes home.
 */
export function ClassLaunch() {
  const firstDay = useFirstDay();
  const router = useRouter();
  const segments = useSegments();
  const navigation = useRootNavigationState();
  const [quick, setQuick] = useState<boolean | null>(null);
  const [splashGone, setSplashGone] = useState(false);
  const top: string | undefined = segments[0];

  useEffect(() => {
    const to = firstDayRedirect({
      loaded: firstDay.loaded,
      done: firstDay.done,
      top,
      navigationReady: navigation?.key !== undefined,
    });
    if (to !== null) router.replace(to);
  }, [firstDay.loaded, firstDay.done, navigation?.key, top, router]);

  useEffect(() => {
    if (firstDay.loaded && quick === null) setQuick(firstDay.done);
  }, [firstDay.loaded, firstDay.done, quick]);

  useCareScreening();
  useNotesHome();
  useDeleteEverythingLeftover();

  const done = useCallback(() => setSplashGone(true), []);

  if (splashGone) return null;
  if (quick === null) {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.cover]} />;
  }
  return <Splash quick={quick} onDone={done} />;
}

const styles = StyleSheet.create({
  cover: { backgroundColor: '#F7F1E8', zIndex: 10 },
});
