import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

export const prerender = false;

/** A monster's link preview image, 1200 by 630, rendered and kept by the API. */
export const GET: APIRoute = ({ params }) => {
  const id = params['id'] ?? '';
  if (!/^[a-z0-9-]{1,40}$/.test(id)) return new Response('Not found', { status: 404 });
  return env.API.fetch(
    new Request(`https://api.scootch.internal/v1/monster-page/${id}/preview.png`),
  );
};
