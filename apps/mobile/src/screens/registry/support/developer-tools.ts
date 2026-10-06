import Constants from 'expo-constants';

/**
 * True in the developer app and the app device runs install; false in the store app, which
 * neither shows the developer tools entry nor opens a developer screen.
 */
export function developerToolsAllowed(): boolean {
  if (__DEV__) return true;
  const variant: unknown = Constants.expoConfig?.extra?.['appVariant'];
  return variant === 'dev' || variant === 'e2e-test';
}
