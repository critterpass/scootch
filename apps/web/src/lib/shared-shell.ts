import { env } from 'cloudflare:workers';
import type { Language } from '@scootch/i18n';

/** The pages of shared things: a monster's own page, a caught card and a share story. */
const kinds = {
  m: { route: 'monster-page' },
  c: { route: 'shared-card' },
  s: { route: 'shared-story' },
} as const;
export type SharedKind = keyof typeof kinds;

const idShape = /^[a-z0-9-]{1,40}$/;
const api = 'https://api.scootch.internal/v1';

const escape = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

type Preview = { title: string; description: string; image: string | null };

/** What a link to this shared thing should say, from only what was shared. */
function previewOf(kind: SharedKind, shared: Record<string, unknown>, page: URL): Preview | null {
  if (kind === 'm') {
    const { name, flavourText } = shared;
    if (typeof name !== 'string' || typeof flavourText !== 'string') return null;
    return {
      title: name,
      description: flavourText,
      image: new URL(`/m/${String(shared['id'])}/preview.png`, page).href,
    };
  }
  const card = shared['card'] as { name?: unknown; flavourText?: unknown } | undefined;
  if (typeof card?.name !== 'string' || typeof card.flavourText !== 'string') return null;
  const headline = shared['headline'];
  return {
    title: kind === 's' && typeof headline === 'string' ? headline : card.name,
    description: card.flavourText,
    image: null,
  };
}

function tags(preview: Preview, page: URL): string {
  const image = preview.image ?? new URL('/og/home-en.png', page).href;
  const pairs: [string, string, string][] = [
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'Scootch'],
    ['property', 'og:title', preview.title],
    ['property', 'og:description', preview.description],
    ['property', 'og:url', page.href],
    ['property', 'og:image', image],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', preview.title],
    ['name', 'twitter:description', preview.description],
    ['name', 'twitter:image', image],
  ];
  return pairs
    .map(([key, name, content]) => `<meta ${key}="${name}" content="${escape(content)}">`)
    .join('');
}

/**
 * Serves the page of one shared thing: the prebuilt page for its kind, with the link preview
 * tags of this one written into its head, so a link pasted anywhere shows the right card. An
 * unknown or unshared id gets the same page with a 404 status; the page then shows the not-found
 * monster.
 */
export async function serveSharedPage(
  request: Request,
  kind: SharedKind,
  language: Language,
  id: string,
): Promise<Response> {
  const page = new URL(request.url);
  const shell = await env.ASSETS.fetch(
    new URL(`${language === 'vi' ? '/vi' : ''}/${kind}/shell/`, page),
  );
  let html = await shell.text();
  let status = 200;

  const answer = idShape.test(id)
    ? await env.API.fetch(new Request(`${api}/${kinds[kind].route}/${id}`))
    : new Response(null, { status: 404 });
  const preview = answer.ok
    ? previewOf(kind, (await answer.json()) as Record<string, unknown>, page)
    : null;
  if (answer.status === 404) status = 404;
  if (preview) {
    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${escape(preview.title)} · Scootch</title>`)
      .replace('</head>', `${tags(preview, page)}</head>`);
  } else {
    html = html.replace('</head>', '<meta name="robots" content="noindex"></head>');
  }
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // A catch or an unshare shows up within a minute.
      'Cache-Control': 'public, max-age=60',
    },
  });
}
