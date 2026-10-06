/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** `1` bundles the site as it is before launch: no App Store badge, one email field. */
  readonly PUBLIC_PRE_LAUNCH?: string;
}

// The bindings `wrangler.jsonc` gives the site's Worker.
declare module 'cloudflare:workers' {
  export const env: {
    /** The API Worker of the same environment. */
    readonly API: { fetch(request: Request): Promise<Response> };
    /** The site's own prebuilt files. */
    readonly ASSETS: { fetch(request: Request | URL | string): Promise<Response> };
  };
}
