import { refusalOf, type AccountView, type TogetherApi } from '../../api/together-api';
import { startMinutesFrom } from '../table/table-rules';

const RETURNS =
  /^\/(?:table(?:\?minutes=\d{1,2})?|table-settings|friends|[tf]\/[a-z2-7]{10}(?:\?sit=1)?)$/;

/** The path to go on to once there is an account: only a place that asks for one, else `null`. */
export function returnPath(next: string | undefined): string | null {
  return next !== undefined && RETURNS.test(next) ? next : null;
}

/** The start a person was on the way to when an account was asked for, in minutes; else `null`. */
export function startCarriedBy(next: string | undefined): number | null {
  const carried = /^\/table\?minutes=(\d{1,2})$/.exec(returnPath(next) ?? '');
  return startMinutesFrom(carried?.[1]);
}

/** Apple's sign-in sheet. The app passes the native one; tests pass a fake. */
export interface ApplePort {
  /**
   * Apple's identity token for this nonce, with the given name when Apple hands one over (the
   * first time only), or `null` when the person closed the sheet.
   */
  signIn(nonce: string): Promise<AppleCredential | null>;
}

export interface AppleCredential {
  readonly identityToken: string;
  readonly givenName: string | null;
}

export interface SignedIn {
  readonly account: AccountView;
  /** A first name to offer for the seat. It is shown to the person and sent nowhere. */
  readonly suggestedName: string;
}

/** What is still missing before a seat can be taken. */
export type AccountStep = 'sign_in' | 'name' | 'ready';

export function accountStep(account: AccountView | null): AccountStep {
  if (account === null) return 'sign_in';
  return account.displayName === null ? 'name' : 'ready';
}

/**
 * Sign in with Apple: the server's one-time value first, then Apple's sheet with it, then the
 * token back to the server. The device keeps its own token throughout, so nothing on the phone
 * changes hands. `null` when the person closed Apple's sheet.
 */
export async function signIn(api: TogetherApi, apple: ApplePort): Promise<SignedIn | null> {
  const nonce = await api.appleNonce();
  const credential = await apple.signIn(nonce);
  if (credential === null) return null;
  const account = await api.signInWithApple(credential.identityToken, nonce);
  return { account, suggestedName: suggestedName(credential.givenName) };
}

/**
 * The name offered for a seat from Apple's given name: its first word, when that is a name a seat
 * can show. Anything else offers nothing, and the field starts empty.
 */
export function suggestedName(givenName: string | null): string {
  const first = tidyName(givenName ?? '').split(' ')[0] ?? '';
  return nameFits(first) ? first : '';
}

/** The name as the server will store it: trimmed, with single spaces. */
export function tidyName(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export type NameProblem = 'length' | 'refused' | 'unchecked';

/** Whether a name is 2 to 20 characters, counted as the server counts them. */
export function nameFits(raw: string): boolean {
  const length = [...tidyName(raw)].length;
  return length >= 2 && length <= 20;
}

/** Asks the server to keep a name. Its refusal is passed on plainly; nothing is kept on a refusal. */
export async function chooseName(
  api: TogetherApi,
  raw: string,
): Promise<{ ok: true; account: AccountView } | { ok: false; problem: NameProblem }> {
  if (!nameFits(raw)) return { ok: false, problem: 'length' };
  try {
    return { ok: true, account: await api.setDisplayName(tidyName(raw)) };
  } catch (error) {
    const reason = refusalOf(error);
    return { ok: false, problem: reason === 'name_not_acceptable' ? 'refused' : 'unchecked' };
  }
}
