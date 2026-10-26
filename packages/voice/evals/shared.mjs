// What the eval sets share: the API under test, a device to call it as, and the cases.
import { readFileSync } from 'node:fs';

export const baseUrl = (process.env.PHUSCLASS_API_URL || 'https://api-dev.phusclass.com').replace(
  /\/+$/,
  '',
);

export function casesFor(folder, language) {
  return JSON.parse(readFileSync(new URL(`./cases.${language}.json`, folder), 'utf8'));
}

export const waits = { rateLimited: 0 };

export async function post(path, body, token) {
  for (;;) {
    const started = performance.now();
    const response = await fetch(baseUrl + path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });
    // The eval's own request rate, not the route: wait and ask once more, timing only the answer.
    if (response.status === 429) {
      waits.rateLimited += 1;
      await response.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve, 15_000));
      continue;
    }
    const json = await response.json().catch(() => undefined);
    return {
      status: response.status,
      json,
      ms: Math.round(performance.now() - started),
    };
  }
}

export async function registerDevice(language) {
  const { status, json } = await post('/v1/devices', { language });
  if (status !== 200 || typeof json?.token !== 'string') {
    throw new Error(`could not register a device at ${baseUrl} (HTTP ${status})`);
  }
  return json.token;
}
