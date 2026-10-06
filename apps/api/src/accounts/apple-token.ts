import { z } from 'zod';

import type { AppleKeySource } from './apple-keys';

export const appleIssuer = 'https://appleid.apple.com';
/** The two apps that may sign in: the dev build and the App Store build. */
export const appleAudiences: readonly string[] = ['app.scootch.dev', 'app.scootch'];

/** Clocks differ a little; a token is accepted this long after its expiry. */
const clockSkewSeconds = 30;
const longestToken = 4096;

const headerSchema = z.object({ alg: z.literal('RS256'), kid: z.string().min(1) });
const claimsSchema = z.object({
  iss: z.string(),
  aud: z.string(),
  exp: z.number(),
  sub: z.string().min(1).max(255),
  nonce: z.string().min(1).optional(),
});

export type AppleTokenProblem =
  | 'malformed'
  | 'unknown_key'
  | 'bad_signature'
  | 'wrong_issuer'
  | 'wrong_audience'
  | 'expired'
  | 'wrong_nonce';

export type AppleTokenResult =
  | { readonly ok: true; readonly subject: string }
  | { readonly ok: false; readonly problem: AppleTokenProblem };

function fromBase64Url(part: string): Uint8Array<ArrayBuffer> | undefined {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) return undefined;
  try {
    const binary = atob(part.replaceAll('-', '+').replaceAll('_', '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return undefined;
  }
}

function jsonPart<S extends z.ZodType>(part: string, schema: S): z.infer<S> | undefined {
  const bytes = fromBase64Url(part);
  if (bytes === undefined) return undefined;
  try {
    const parsed = schema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Checks an identity token from Sign in with Apple: signed by one of Apple's published keys,
 * issued by Apple, for one of our two apps, not expired, and carrying the nonce this server gave
 * the phone. The signature is checked before any claim is believed. Only the stable subject
 * comes out; the email and every other claim are dropped here.
 */
export async function verifyAppleToken(
  token: string,
  expected: { readonly nonce: string; readonly now: number; readonly keys: AppleKeySource },
): Promise<AppleTokenResult> {
  const fail = (problem: AppleTokenProblem) => ({ ok: false, problem }) as const;
  if (token.length > longestToken) return fail('malformed');
  const [headerPart, claimsPart, signaturePart, ...extra] = token.split('.');
  if (!headerPart || !claimsPart || !signaturePart || extra.length > 0) return fail('malformed');
  const header = jsonPart(headerPart, headerSchema);
  const signature = fromBase64Url(signaturePart);
  if (header === undefined || signature === undefined) return fail('malformed');

  const jwk = await expected.keys.find(header.kid, expected.now);
  if (jwk === undefined) return fail('unknown_key');
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
  } catch {
    return fail('unknown_key');
  }
  const signed = new TextEncoder().encode(`${headerPart}.${claimsPart}`);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signed))) {
    return fail('bad_signature');
  }

  const claims = jsonPart(claimsPart, claimsSchema);
  if (claims === undefined) return fail('malformed');
  if (claims.iss !== appleIssuer) return fail('wrong_issuer');
  if (!appleAudiences.includes(claims.aud)) return fail('wrong_audience');
  if (claims.exp + clockSkewSeconds <= expected.now / 1000) return fail('expired');
  if (claims.nonce !== expected.nonce) return fail('wrong_nonce');
  return { ok: true, subject: claims.sub };
}
