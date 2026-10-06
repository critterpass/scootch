import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * The monster maker's door to the API. The visitor's request is handed over as it arrived, so
 * the API counts hatches against the visitor's own address. Nothing is read, logged or kept here.
 */
export const POST: APIRoute = ({ request }) =>
  env.API.fetch(new Request('https://api.scootch.internal/v1/monster-make', request));
