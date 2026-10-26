/** Apple's team id, as in the app's own config (`apps/mobile/app.config.ts`). */
export const appleTeamId = 'YFND2EEW8S';

/** Both apps: the one from the App Store, and the dev app. */
export const appBundleIds = ['com.phusclass', 'com.phusclass.dev'] as const;

/**
 * The association file Apple fetches from `/.well-known/apple-app-site-association`: the paths
 * that open the app (the site has none) and shared web credentials.
 */
export function appleAppSiteAssociation() {
  const appIDs = appBundleIds.map((bundleId) => `${appleTeamId}.${bundleId}`);
  return {
    applinks: { details: [{ appIDs, components: [] as { '/': string }[] }] },
    webcredentials: { apps: appIDs },
  };
}
