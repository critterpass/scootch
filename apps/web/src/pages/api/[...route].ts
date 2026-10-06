import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

export const prerender = false;

/** The API routes the site's pages may reach, and how. Anything else is not found here. */
const doors: readonly (readonly [method: string, path: RegExp])[] = [
  ['POST', /^monster-share$/],
  ['DELETE', /^monster-share\/[a-z0-9-]{1,40}$/],
  ['GET', /^monster-page\/[a-z0-9-]{1,40}$/],
  ['GET', /^shared-card\/[a-z0-9-]{1,40}$/],
  ['GET', /^shared-story\/[a-z0-9-]{1,40}$/],
  ['GET', /^table-invite\/[a-z0-9-]{1,40}$/],
  ['GET', /^haunt-page\/[a-z0-9-]{1,40}$/],
  ['POST', /^haunt-page\/[a-z0-9-]{1,40}\/shoo$/],
  ['GET', /^shared-record\/[a-z0-9-]{1,40}(\/clip)?$/],
  ['POST', /^waitlist$/],
];

/**
 * The site's doors to the API, on the site's own origin. A request is handed over as it arrived,
 * so the API counts it against the visitor's own address. Nothing is read, logged or kept here.
 */
export const ALL: APIRoute = ({ request, params }) => {
  const route = params['route'] ?? '';
  const open = doors.some(([method, path]) => method === request.method && path.test(route));
  if (!open) {
    return Response.json(
      { error: { code: 'not_found', message: 'No such route', retryable: false } },
      { status: 404 },
    );
  }
  // The one thing a page may say beside the route: which language it is written in.
  const language = new URL(request.url).searchParams.get('lang');
  const query = language === 'vi' || language === 'en' ? `?lang=${language}` : '';
  return env.API.fetch(new Request(`https://api.scootch.internal/v1/${route}${query}`, request));
};
