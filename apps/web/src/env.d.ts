/// <reference types="astro/client" />

// The bindings `wrangler.jsonc` gives the site's Worker.
declare module 'cloudflare:workers' {
  export const env: {
    /** The API Worker of the same environment. */
    readonly API: { fetch(request: Request): Promise<Response> };
  };
}
