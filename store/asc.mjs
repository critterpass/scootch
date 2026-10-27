// A small App Store Connect API client for the store scripts. It reads its settings from
// ~/.config/phusclass/asc.env (ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, ASC_APP_ID_PRD,
// ASC_APP_ID_DEV) and never prints a value from it.
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const env = Object.fromEntries(
  readFileSync(`${homedir()}/.config/phusclass/asc.env`, 'utf8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
);

export const APPS = { prd: env.ASC_APP_ID_PRD, dev: env.ASC_APP_ID_DEV };

const base64url = (value) => Buffer.from(value).toString('base64url');
let cached = null;

function token() {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const header = { alg: 'ES256', kid: env.ASC_KEY_ID, typ: 'JWT' };
  const payload = { iss: env.ASC_ISSUER_ID, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = createSign('SHA256');
  signer.update(data);
  const signature = signer.sign({ key: readFileSync(env.ASC_KEY_PATH), dsaEncoding: 'ieee-p1363' });
  cached = { token: `${data}.${base64url(signature)}`, exp: now + 1100 };
  return cached.token;
}

/** One request; a 429 is retried with a growing wait. Errors carry the API's details, never the token. */
export async function asc(method, path, body) {
  for (let attempt = 0; ; attempt++) {
    const url = path.startsWith('http') ? path : `https://api.appstoreconnect.apple.com${path}`;
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && attempt < 5) {
      await new Promise((done) => setTimeout(done, 5000 * (attempt + 1)));
      continue;
    }
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const details = json?.errors?.map((error) => error.detail || error.title);
      const error = new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(details)}`);
      error.status = res.status;
      error.json = json;
      throw error;
    }
    return json;
  }
}

/** Every page of a list. */
export async function all(path) {
  let items = [];
  let next = path;
  while (next) {
    const page = await asc('GET', next);
    items = items.concat(page.data);
    next = page.links?.next;
  }
  return items;
}

const editableStates = new Set([
  'PREPARE_FOR_SUBMISSION',
  'DEVELOPER_REJECTED',
  'REJECTED',
  'METADATA_REJECTED',
  'INVALID_BINARY',
]);

/** The prd app's iOS App Store version that can still be edited. */
export async function editableVersion() {
  const versions = await all(`/v1/apps/${APPS.prd}/appStoreVersions?filter[platform]=IOS`);
  const version = versions.find((v) => editableStates.has(v.attributes.appStoreState));
  if (!version) throw new Error('The prd app has no editable App Store version');
  return version;
}
