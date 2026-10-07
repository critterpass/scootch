import type { Language } from '../contracts';
import type { Bindings } from '../env';

/**
 * A monster's words as the server wrote them, with the seed it is drawn from and the language
 * they are in. A monster with no title (the website's maker writes none) signs an empty one.
 */
export type WrittenWords = {
  readonly name: string;
  readonly title: string;
  readonly flavourText: string;
  readonly seed: string;
  readonly language: Language;
};

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

/**
 * The secret the server signs its own words with. `SHARE_SIGNING_SECRET` is a secret of its own,
 * which the controller sets on Cloudflare for each environment (`wrangler secret put`). Until it
 * is set, the key is derived from the model key the Worker already holds, the way a task
 * continuation's is; words signed with one stop being shareable as a page when the other takes
 * over, so it is set before anything is shared for real.
 */
export function shareSigningSecret(
  env: Pick<Bindings, 'SHARE_SIGNING_SECRET' | 'DEEPSEEK_API_KEY'>,
): string | undefined {
  const own = env.SHARE_SIGNING_SECRET;
  const secret = own !== undefined && own !== '' ? own : env.DEEPSEEK_API_KEY;
  return secret === '' ? undefined : secret;
}

/**
 * The signing key, derived from the secret under this module's own label, so it is never the key
 * a continuation is signed with, even while both fall back to the same model key.
 */
async function signingKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`scootch shared words\n${secret}`),
  );
  return crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

/** One spelling of the words to sign: a list, so no word can run into the next. */
function signedBytes({ name, title, flavourText, seed, language }: WrittenWords) {
  return encoder.encode(JSON.stringify([name, title, flavourText, seed, language]));
}

/**
 * The server's word that it wrote these words for this monster, in this language. It does not
 * expire: a card is shared whenever its owner likes, long after the catch.
 */
export async function signWords(secret: string, words: WrittenWords): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), signedBytes(words));
  return toBase64Url(new Uint8Array(signature));
}

/**
 * Whether the signature is this server's own for exactly these words, seed and language. Any
 * change to any of them, a missing signature or a missing secret is a no. The comparison is the
 * runtime's own and takes the same time whatever is wrong.
 */
export async function wordsAreSigned(
  secret: string | undefined,
  words: WrittenWords,
  signature: string | null | undefined,
): Promise<boolean> {
  if (secret === undefined || secret === '' || !signature) return false;
  const given = fromBase64Url(signature);
  if (given === null) return false;
  return crypto.subtle.verify('HMAC', await signingKey(secret), given, signedBytes(words));
}
