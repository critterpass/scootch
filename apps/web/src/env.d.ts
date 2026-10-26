/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** `1` bundles the site as it is before launch: no App Store badge. */
  readonly PUBLIC_PRE_LAUNCH?: string;
}

// The bindings `wrangler.jsonc` gives the site's Worker.
declare module 'cloudflare:workers' {
  export const env: {
    /** The site's own prebuilt files. */
    readonly ASSETS: { fetch(request: Request | URL | string): Promise<Response> };
  };
}
