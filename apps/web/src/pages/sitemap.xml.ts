import type { APIRoute } from 'astro';

import { languages, localPath, sitePages } from '../copy';

/** Every page in both languages, each with its other-language twin. Built with the site. */
export const GET: APIRoute = ({ site }) => {
  const at = (path: string) => new URL(path, site).href;
  const urls = sitePages.flatMap((page) =>
    languages.map((language) => {
      const twins = languages
        .map(
          (other) =>
            `<xhtml:link rel="alternate" hreflang="${other}" href="${at(localPath(other, page))}"/>`,
        )
        .join('');
      return `<url><loc>${at(localPath(language, page))}</loc>${twins}</url>`;
    }),
  );
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
