/**
 * How a link on the site reaches the app. Universal links carry a person from anywhere else
 * straight into the app; from a page of this site Safari keeps a same-site link in the browser,
 * so a page's own "open" button uses the app's scheme and falls back to the App Store.
 */

/** Apple's team id, as in the app's own config (`apps/mobile/app.config.ts`). */
export const appleTeamId = 'YFND2EEW8S';

/** Both apps: the one from the App Store, and the dev app that shares links on the dev site. */
export const appBundleIds = ['app.scootch', 'app.scootch.dev'] as const;

/** The App Store's own number for each app, which Apple's banner names an app by. */
export const appStoreIds = {
  'app.scootch': '6819896510',
  'app.scootch.dev': '6819895420',
} as const;

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
 * The app this build of the site belongs to: the dev site opens the dev app. Read when the site
 * is bundled, from the same variable that picks the Cloudflare environment.
 */
const siteApp =
  (globalThis as BuildEnv).process?.env?.['CLOUDFLARE_ENV'] === 'prd'
    ? ({ bundleId: 'app.scootch', scheme: 'scootch' } as const)
    : ({ bundleId: 'app.scootch.dev', scheme: 'scootch-dev' } as const);

/** The scheme of that app. */
export const appScheme = siteApp.scheme;

/** The name of the tag Safari reads Apple's app banner from. */
export const appBannerName = 'apple-itunes-app';

/**
 * What the banner says: the app, and its App Clip shown as a card to a phone without the app.
 * A page adds `app-argument`, the link the app is opened with.
 */
export const appBanner = `app-id=${appStoreIds[siteApp.bundleId]}, app-clip-bundle-id=${siteApp.bundleId}.Clip, app-clip-display=card`;

const bannerTag = new RegExp(`<meta name="${appBannerName}" content="([^"]*)"[^>]*>`);

/**
 * A prebuilt page with its banner opening the app at one address. A page built without a banner
 * (the site before launch) stays without one.
 */
export function bannerOpening(html: string, address: string): string {
  const link = address.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  return html.replace(
    bannerTag,
    (_, content: string) =>
      `<meta name="${appBannerName}" content="${content}, app-argument=${link}">`,
  );
}

/** A prebuilt page without its banner, for an address where there is nothing to open. */
export function withoutBanner(html: string): string {
  return html.replace(bannerTag, '');
}
