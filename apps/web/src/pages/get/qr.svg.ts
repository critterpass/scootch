import type { APIRoute } from 'astro';

import { qrCapacity, qrSvg } from '../../lib/qr-code';

export const prerender = false;

const idShape = /^[a-z0-9-]{1,40}$/;

/**
 * The QR code a wide screen shows for a monster: this site's own link to the monster's page
 * (`/m/<id>`, a link the app opens), and nothing else. The id is the only thing a caller chooses.
 */
export const GET: APIRoute = ({ request }) => {
  const page = new URL(request.url);
  const id = page.searchParams.get('m') ?? '';
  const link = `${page.origin}${page.searchParams.get('lang') === 'vi' ? '/vi' : ''}/m/${id}`;
  if (!idShape.test(id) || new TextEncoder().encode(link).length > qrCapacity) {
    return new Response('No such monster', { status: 400 });
  }
  return new Response(qrSvg(link, link), {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
  });
};
