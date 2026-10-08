import {
  attitudeSchema,
  inTheWaySchema,
  languageSchema,
  monsterBodyTypeSchema,
  taskTextSchema,
  type TaskContinuation,
} from '@scootch/domain';
import { z } from 'zod';

import type { Bindings } from '../../env';

/** How long stage two may be asked for after stage one answered. */
export const continuationLifetimeMs = 10 * 60 * 1000;

/**
 * What stage two needs, and all a continuation holds: the one thing, how to speak, the monster's
 * body and the prompt seed. Never the text the one thing came from.
 */
export const continuationPayloadSchema = z.object({
  oneThing: taskTextSchema,
  language: languageSchema,
  attitude: attitudeSchema,
  bodyType: monsterBodyTypeSchema.nullable(),
  seed: z.number().int().min(0),
  /** The monster's name once it has been written: what the pack is asked with. */
  monsterName: z.string().min(1).max(60).optional(),
  /** What the user said is in the way, for the writer. Never set for a heavy task. */
  inTheWay: inTheWaySchema.optional(),
  /**
   * A monster made on the website that this thing keeps: its own name, card line and seed, in the
   * language they were written in. Read from the server's own record, never from the phone.
   */
  adopted: z
    .object({
      /** The id of the monster's page. */
      page: z.string().min(1).max(64),
      name: z.string().min(1).max(60),
      /** The kind line an earlier arrival was given, when there was one. */
      title: z.string().min(1).max(40).optional(),
      flavourText: z.string().min(1).max(160),
      seed: z.string().min(1).max(64),
      language: languageSchema,
    })
    .optional(),
});
export type ContinuationPayload = z.infer<typeof continuationPayloadSchema>;

const sealedSchema = z.object({
  payload: continuationPayloadSchema,
  device: z.string(),
  expiresAt: z.number().int(),
});

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
 * The secret continuations are signed with. `TASK_CONTINUATION_SECRET` is a secret of its own,
 * which the controller sets on Cloudflare for each environment (`wrangler secret put`). Until it
 * is set, the key is derived from the model key the Worker already holds, as it was before; a
 * token signed with one stops opening when the other takes over, which costs one asked-again
 * stage one.
 */
export function continuationSecret(
  env: Pick<Bindings, 'TASK_CONTINUATION_SECRET' | 'DEEPSEEK_API_KEY'>,
): string | undefined {
  const own = env.TASK_CONTINUATION_SECRET;
  return own !== undefined && own !== '' ? own : env.DEEPSEEK_API_KEY;
}

/** The signing key, derived from the secret so the secret itself is never the key. */
async function signingKey(secret: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`scootch task continuation\n${secret}`),
  );
  return crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

/**
 * Seals what stage two needs into a signed token, so nothing is held on the server and a phone on
 * a poor network can ask for stage two more than once. It is readable by its holder, who was just
 * sent the same one thing, and worthless to any other device or after it expires.
 */
export async function sealContinuation(
  secret: string,
  deviceHash: string | null,
  payload: ContinuationPayload,
  now = Date.now(),
): Promise<TaskContinuation> {
  const expiresAt = now + continuationLifetimeMs;
  const body = encoder.encode(JSON.stringify({ payload, device: deviceHash ?? '', expiresAt }));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), body);
  return {
    token: `${toBase64Url(body)}.${toBase64Url(new Uint8Array(signature))}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

/** The payload of a token this server sealed for this device and that has not expired. */
export async function openContinuation(
  secret: string,
  deviceHash: string | null,
  token: string,
  now = Date.now(),
): Promise<ContinuationPayload | 'invalid' | 'expired'> {
  const [bodyPart = '', signaturePart = '', ...rest] = token.split('.');
  const body = fromBase64Url(bodyPart);
  const signature = fromBase64Url(signaturePart);
  if (body === null || signature === null || rest.length > 0) return 'invalid';
  if (!(await crypto.subtle.verify('HMAC', await signingKey(secret), signature, body))) {
    return 'invalid';
  }
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return 'invalid';
  }
  const sealed = sealedSchema.safeParse(json);
  if (!sealed.success || sealed.data.device !== (deviceHash ?? '')) return 'invalid';
  return sealed.data.expiresAt <= now ? 'expired' : sealed.data.payload;
}
