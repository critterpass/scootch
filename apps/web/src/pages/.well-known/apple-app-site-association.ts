import type { APIRoute } from 'astro';

import { appleAppSiteAssociation } from '../../lib/app-links';

export const prerender = false;

/** Apple reads this as JSON at exactly this address, with no redirect and no file extension. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(appleAppSiteAssociation()), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
