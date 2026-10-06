import { Redirect, Stack } from 'expo-router';

import { developerToolsAllowed } from '../../screens/registry/support/developer-tools';

/**
 * Every developer screen sits under this layout. The store app sends anyone who lands here back
 * to the one screen, so no developer screen can open there whatever link or route is tried.
 * Developer screens are written in English only and are not part of the product's interface.
 */
export default function DeveloperLayout() {
  if (!developerToolsAllowed()) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
