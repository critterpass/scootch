import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, prepareDatabase } from '../db/database';
import { SoundMode } from '../effects/sound-mode';
import { SurfacesHost } from '../features/surfaces/surfaces-host';
import { I18nProvider } from '../i18n/i18n-provider';
import { JsCommitMarker } from '../js-commit-marker';
import { BoardProvider } from '../state/board-provider';
import { stackMotion } from '../ui/motion/stack-transitions';
import { useMayMove } from '../ui/motion/use-feel';
import { usePalette } from '../ui/use-palette';

// Crash reporting starts only when a DSN is set; with none, nothing is initialised or sent.
const sentryDsn = process.env['EXPO_PUBLIC_SENTRY_DSN'];
if (sentryDsn) {
  const variant: unknown = Constants.expoConfig?.extra?.['appVariant'];
  Sentry.init({
    dsn: sentryDsn,
    // Tells the dev app's reports from the App Store app's.
    environment: typeof variant === 'string' ? variant : 'dev',
    sendDefaultPii: false,
    // A report carries what broke and where, never what the console printed on the way there.
    beforeBreadcrumb: (breadcrumb) => (breadcrumb.category === 'console' ? null : breadcrumb),
  });
}

/**
 * Every route, in one native stack, each with the system transition the design gives it and none
 * with the system's bar: a screen draws its own heading. The page colour is behind every screen,
 * so no transition ever shows a blank white frame.
 */
function Screens() {
  const mayMove = useMayMove();
  const palette = usePalette();
  return (
    <Stack
      screenOptions={({ route }) => {
        const { sheetAllowedDetents, ...motion } = stackMotion(route.name, mayMove);
        return {
          contentStyle: { backgroundColor: palette.page },
          ...motion,
          ...(sheetAllowedDetents ? { sheetAllowedDetents } : {}),
          headerShown: false,
        };
      }}
    />
  );
}

// The phone's database is open and migrated before any screen renders, and the board is read from
// it. Gestures need their root view above everything.
export default function RootLayout() {
  const palette = usePalette();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.page }}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={prepareDatabase}>
          <I18nProvider>
            <BoardProvider>
              <SoundMode />
              <SurfacesHost />
              <Screens />
            </BoardProvider>
          </I18nProvider>
          <JsCommitMarker />
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
