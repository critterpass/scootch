/** Apple's team id, as in the app's own config (`apps/mobile/app.config.ts`). */
export const appleTeamId = 'YFND2EEW8S';

/** Both apps: the one from the App Store, and the dev app. */
export const appBundleIds = ['com.phusclass', 'com.phusclass.dev'] as const;

/**
 * The association file Apple fetches from `/.well-known/apple-app-site-association`: the paths
 * that open the app and shared web credentials. The home page opens it, in either language; the
 * pages people come to read (helplines above all, then privacy, terms, support and tuition) always
 * stay in the browser. Apple takes the first rule that matches.
 */
const stayOnTheWeb = ['/helplines', '/privacy', '/terms', '/support', '/tuition'];
const components = [
  ...stayOnTheWeb.map((page) => ({ '/': `/vi${page}*`, exclude: true })),
  { '/': '/' },
  { '/': '/vi/*' },
];

export function appleAppSiteAssociation() {
  const appIDs = appBundleIds.map((bundleId) => `${appleTeamId}.${bundleId}`);
  return {
    applinks: { details: [{ appIDs, components }] },
    webcredentials: { apps: appIDs },
  };
}
