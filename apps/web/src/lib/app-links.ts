/**
 * How a link on the site reaches the app. Universal links carry a person from anywhere else
 * straight into the app; from a page of this site Safari keeps a same-site link in the browser,
 * so a page's own "open" button uses the app's scheme and falls back to the App Store.
 */

/** Apple's team id, as in the app's own config (`apps/mobile/app.config.ts`). */
export const appleTeamId = 'YFND2EEW8S';

/** Both apps: the one from the App Store, and the dev app that shares links on the dev site. */
export const appBundleIds = ['app.scootch', 'app.scootch.dev'] as const;

/** The first path segment of every link the app opens. */
export const appLinkKinds = ['t', 'f', 'h', 'm', 'c', 's', 'r'] as const;
export type AppLinkKind = (typeof appLinkKinds)[number];

/**
 * The association file Apple fetches from `/.well-known/apple-app-site-association`: the paths
 * that open the app (each also under `/vi/`), the App Clips and shared web credentials.
 */
export function appleAppSiteAssociation() {
  const appIDs = appBundleIds.map((bundleId) => `${appleTeamId}.${bundleId}`);
  return {
    applinks: {
      details: [
        {
          appIDs,
          components: appLinkKinds.flatMap((kind) => [
            { '/': `/${kind}/*` },
            { '/': `/vi/${kind}/*` },
          ]),
        },
      ],
    },
    appclips: { apps: appIDs.map((id) => `${id}.Clip`) },
    webcredentials: { apps: appIDs },
  };
}

type BuildEnv = { process?: { env?: Record<string, string | undefined> } };

/**
 * The scheme of the app this build of the site belongs to: the dev site opens the dev app. Read
 * when the site is bundled, from the same variable that picks the Cloudflare environment.
 */
export const appScheme =
  (globalThis as BuildEnv).process?.env?.['CLOUDFLARE_ENV'] === 'prd' ? 'scootch' : 'scootch-dev';
