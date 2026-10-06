import { refusalOf, type AccountView, type TogetherApi } from '../../api/together-api';

/** Apple's sign-in sheet. The app passes the native one; tests pass a fake. */
export interface ApplePort {
  /** Apple's identity token for this nonce, or `null` when the person closed the sheet. */
  signIn(nonce: string): Promise<string | null>;
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
export async function signIn(api: TogetherApi, apple: ApplePort): Promise<AccountView | null> {
  const nonce = await api.appleNonce();
  const identityToken = await apple.signIn(nonce);
  return identityToken === null ? null : api.signInWithApple(identityToken, nonce);
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
