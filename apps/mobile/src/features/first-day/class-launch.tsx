import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
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
 * the first scene once the system's launch screen is down, and the app-wide care screening and
 * notes home.
 */
export function ClassLaunch() {
  const firstDay = useFirstDay();
  const router = useRouter();
  const segments = useSegments();
  const navigation = useRootNavigationState();
  const [quick, setQuick] = useState<boolean | null>(null);
  const [splashGone, setSplashGone] = useState(false);
  // The system's launch screen is taken down here, so the card starts as it comes into view
  // rather than playing unseen behind it.
  const [launchGone, setLaunchGone] = useState(false);
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

  useEffect(() => {
    if (quick === null) return;
    let current = true;
    void SplashScreen.hideAsync()
      .catch(() => undefined)
      .finally(() => {
        if (current) setLaunchGone(true);
      });
    return () => {
      current = false;
    };
  }, [quick]);

  useCareScreening();
  useNotesHome();
  useDeleteEverythingLeftover();

  const done = useCallback(() => setSplashGone(true), []);

  if (splashGone) return null;
  if (quick === null) {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.cover]} />;
  }
  return <Splash quick={quick} onDone={done} start={launchGone} />;
}

const styles = StyleSheet.create({
  cover: { backgroundColor: '#F7F1E8', zIndex: 10 },
});
