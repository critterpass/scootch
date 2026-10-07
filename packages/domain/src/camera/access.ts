import { hasPlus, type PurchaseState } from '../entitlements';

import { isSentMode, type CameraMode, type SentMode } from './modes';

/** A free user may try Paper once and Screen once. */
export const FREE_CAMERA_TRIES = 1;

/** How many free reads of each Plus mode this user has had. */
export type CameraTries = Readonly<Record<SentMode, number>>;
export const NO_CAMERA_TRIES: CameraTries = { paper: 0, screen: 0 };

/** `free_try` is open, and the read it gives is the last one before the quiet lock. */
export type CameraAccess = 'open' | 'free_try' | 'locked';

/** The one place that decides whether a mode's chip is open. Desk and Room are free forever. */
export function cameraAccess(
  mode: CameraMode,
  purchase: PurchaseState,
  tries: CameraTries,
): CameraAccess {
  if (!isSentMode(mode) || hasPlus(purchase)) return 'open';
  return tries[mode] < FREE_CAMERA_TRIES ? 'free_try' : 'locked';
}

/**
 * How a read ended. Only `step` gave the user what the try is for; a photo that could not be
 * read, a model that did not answer and a "Not now" on the consent sheet cost nothing.
 */
export type CameraReadOutcome = 'step' | 'unreadable' | 'failed' | 'not_allowed';

/** The tries after a read. Counted for free users only, so a lapsed trial still has its tries. */
export function triesAfter(
  tries: CameraTries,
  mode: CameraMode,
  purchase: PurchaseState,
  outcome: CameraReadOutcome,
): CameraTries {
  if (outcome !== 'step' || !isSentMode(mode) || hasPlus(purchase)) return tries;
  return { ...tries, [mode]: tries[mode] + 1 };
}

/** Whether the user has said the words read from a photo may be sent out to be understood. */
export type CameraConsent = 'not_given' | 'given';

/** Paper and Screen ask first, every time, until the answer is yes. Desk and Room never ask. */
export function asksBeforeReading(mode: CameraMode, consent: CameraConsent): boolean {
  return isSentMode(mode) && consent !== 'given';
}

/** Nothing read from a photo may leave the phone unless this is true. */
export function maySendWords(mode: CameraMode, consent: CameraConsent): boolean {
  return isSentMode(mode) && consent === 'given';
}

/**
 * "Read it" gives consent; "Not now" changes nothing, so the sheet comes back at the next Paper or
 * Screen read; the switch in Privacy and data takes it away again.
 */
export type CameraConsentEvent = 'read_it' | 'not_now' | 'switched_on' | 'switched_off';

export function consentAfter(consent: CameraConsent, event: CameraConsentEvent): CameraConsent {
  if (event === 'read_it' || event === 'switched_on') return 'given';
  if (event === 'switched_off') return 'not_given';
  return consent;
}
