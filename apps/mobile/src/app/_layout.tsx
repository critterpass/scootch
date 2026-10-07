import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { colors } from '@scootch/tokens';

import { DATABASE_NAME, prepareDatabase } from '../db/database';
import { SoundMode } from '../effects/sound-mode';
import { I18nProvider } from '../i18n/i18n-provider';
import { JsCommitMarker } from '../js-commit-marker';
import { useAppearance } from '../screens/registry/support/forced-variant';
import { DayStoreProvider, useToday } from '../state/day-store-provider';
import { toneFor } from '../state/lines';
import type { MotionCare } from '../ui/motion/may-move';
import { stackMotion } from '../ui/motion/stack-transitions';
import { FeelProvider, useMayMove } from '../ui/motion/use-feel';

// Crash reporting starts only when a DSN is set; with none, nothing is initialised or sent.
const sentryDsn = process.env['EXPO_PUBLIC_SENTRY_DSN'];
if (sentryDsn) Sentry.init({ dsn: sentryDsn });

/** The Motion and Haptics switches and the day's care, handed to everything that moves or taps. */
function Feel({ children }: { readonly children: ReactNode }) {
  const { today, settings } = useToday();
  const care: MotionCare =
    today.kind === 'crisis'
      ? 'crisis'
      : 'task' in today && toneFor(today.task) === 'quiet'
        ? 'serious'
        : 'none';
  return (
    <FeelProvider motion={settings.motion} care={care} haptics={settings.haptics}>
      {children}
    </FeelProvider>
  );
}

/**
 * Every route, in one native stack, each with the transition the design gives it. The page colour
 * is behind every screen, so no transition ever shows a blank white frame.
 */
function Screens() {
  const mayMove = useMayMove();
  const palette = colors[useAppearance()];
  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
        contentStyle: { backgroundColor: palette.page },
        ...stackMotion(route.name, mayMove),
      })}
    />
  );
}

// The phone's database is the source of truth, so it is open and migrated before any screen
// renders. No tabs and no stack header. Gestures need their root view above everything. The day
// store sits under the language, which it registers the device with.
export default function RootLayout() {
  const palette = colors[useAppearance()];
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.page }}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={prepareDatabase}>
        <I18nProvider>
          <DayStoreProvider>
            <SoundMode />
            <Feel>
              <Screens />
            </Feel>
          </DayStoreProvider>
        </I18nProvider>
        <JsCommitMarker />
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
