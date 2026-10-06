import * as Sentry from '@sentry/react-native';
import { setAudioModeAsync } from 'expo-audio';
import { Slot } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DATABASE_NAME, prepareDatabase } from '../db/database';
import { I18nProvider } from '../i18n/i18n-provider';
import { JsCommitMarker } from '../js-commit-marker';
import { DayStoreProvider } from '../state/day-store-provider';

// Crash reporting starts only when a DSN is set; with none, nothing is initialised or sent.
const sentryDsn = process.env['EXPO_PUBLIC_SENTRY_DSN'];
if (sentryDsn) Sentry.init({ dsn: sentryDsn });

// Sound cues play alongside the user's own music and stay silent with the ringer switch off.
void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(
  () => undefined,
);

// The phone's database is the source of truth, so it is open and migrated before any screen
// renders. One screen: no tabs, no stack header. Gestures need their root view above everything.
// The day store sits under the language, which it registers the device with.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={prepareDatabase}>
        <I18nProvider>
          <DayStoreProvider>
            <Slot />
          </DayStoreProvider>
        </I18nProvider>
        <JsCommitMarker />
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
