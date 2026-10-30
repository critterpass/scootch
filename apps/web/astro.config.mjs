import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';

// Static first: pages are rendered when the site is bundled. The one route that runs per request
// is Apple's association file (`src/pages/.well-known/apple-app-site-association.ts`).
//
// The Cloudflare environment (`dev` or `prd` in `wrangler.jsonc`) is chosen when the site is
// bundled, from the CLOUDFLARE_ENV variable, and written into the output. `wrangler deploy` then
// deploys that output as it is: it takes no `--env` flag.
export default defineConfig({
  site: 'https://todo.phusclass.com',
  output: 'static',
  adapter: cloudflare({ imageService: 'compile' }),
  // English at the root and Vietnamese under /vi/, chosen by the path alone.
  build: { inlineStylesheets: 'always' },
});
