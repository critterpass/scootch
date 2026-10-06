import { Slot } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';

import { DATABASE_NAME, prepareDatabase } from '../db/database';
import { JsCommitMarker } from '../js-commit-marker';

// The phone's database is the source of truth, so it is open and migrated before any screen
// renders. One screen: no tabs, no stack header.
export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={prepareDatabase}>
      <Slot />
      <JsCommitMarker />
    </SQLiteProvider>
  );
}
