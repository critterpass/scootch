import {
  NO_CAMERA_TRIES,
  type CameraConsent,
  type CameraTries,
  type SentMode,
} from '@scootch/domain';

import type { PlusMemory } from '../../data/plus-memory';

/** The stored tries, checked field by field. Anything unreadable counts as none used. */
export function triesFromStored(value: unknown): CameraTries {
  if (typeof value !== 'object' || value === null) return NO_CAMERA_TRIES;
  const stored = value as Record<string, unknown>;
  const count = (mode: SentMode) => {
    const used = stored[mode];
    return typeof used === 'number' && Number.isInteger(used) && used >= 0 ? used : 0;
  };
  return { paper: count('paper'), screen: count('screen') };
}

/** Consent is only ever read as given when exactly that was stored. */
export function consentFromStored(value: unknown): CameraConsent {
  return value === 'given' ? 'given' : 'not_given';
}

export async function loadCameraMemory(
  memory: PlusMemory,
): Promise<{ readonly tries: CameraTries; readonly consent: CameraConsent }> {
  const [tries, consent] = await Promise.all([
    memory.read('cameraTries').catch(() => null),
    memory.read('cameraConsent').catch(() => null),
  ]);
  return { tries: triesFromStored(tries), consent: consentFromStored(consent) };
}
