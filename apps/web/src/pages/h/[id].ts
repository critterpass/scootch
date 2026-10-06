import type { APIRoute } from 'astro';

import { serveSharedPage } from '../../lib/shared-shell';

export const prerender = false;

export const GET: APIRoute = ({ request, params }) =>
  serveSharedPage(request, 'h', 'en', params['id'] ?? '');
