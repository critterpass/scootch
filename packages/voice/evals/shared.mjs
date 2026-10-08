// What the task and label evals share: the API under test, one device per runner, and the sums.
import { readFileSync } from 'node:fs';

export const baseUrl = (
  process.env.SCOOTCH_API_URL || 'https://scootch-dev.bkdev98.workers.dev'
).replace(/\/+$/, '');
export const languages = (process.env.EVAL_LANGUAGES ?? 'en,vi').split(',');
export const atOnce = Number(process.env.EVAL_CONCURRENCY ?? 4);
// A Tuesday, so every weekday in the cases resolves to one known date.
export const localDate = '2026-10-06';
export const timeZones = { en: 'Europe/London', vi: 'Asia/Ho_Chi_Minh' };

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
      voice: response.headers.get('x-voice-check') ?? '',
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

/** Stage one of the task call for one piece of text, as the phone asks it. */
export function startTask(
  language,
  token,
  text,
  { attitude = 'cheeky', source = 'typed', canChoose = false, monsterPage } = {},
) {
  return post(
    '/v1/task-create',
    {
      language,
      attitude,
      energy: 'medium',
      text,
      source,
      localDate,
      timeZone: timeZones[language],
      overrideSerious: false,
      ...(canChoose ? { canChoose } : {}),
      // The website monster this thing was hatched from, when it arrives from one.
      ...(monsterPage === undefined ? {} : { monsterPage }),
      staged: true,
    },
    token,
  );
}

/** Runs the jobs a few at a time, in order. Each runner has its own device and its own limit. */
export async function pooled(language, jobs) {
  const results = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(atOnce, jobs.length) }, async () => {
      const token = await registerDevice(language);
      while (next < jobs.length) {
        const index = next;
        next += 1;
        results[index] = await jobs[index](token);
      }
    }),
  );
  return results;
}

export function median(values) {
  const sorted = values.filter((value) => value !== undefined).sort((a, b) => a - b);
  return sorted.length === 0 ? undefined : sorted[Math.ceil(0.5 * sorted.length) - 1];
}

export function spread(values) {
  const sorted = values.filter((value) => value !== undefined).sort((a, b) => a - b);
  if (sorted.length === 0) return 'none';
  const at = (part) => sorted[Math.min(sorted.length - 1, Math.ceil(part * sorted.length) - 1)];
  return `median ${at(0.5)}, 95th percentile ${at(0.95)}, worst ${sorted.at(-1)} (${sorted.length} calls)`;
}

export const share = (part, whole) =>
  `${part} of ${whole} (${whole === 0 ? '0.0' : ((part / whole) * 100).toFixed(1)}%)`;
