import { monsterBodyTypeSchema, type MonsterBodyType, type PurchaseState } from '@scootch/domain';

import { ApiClientError } from './api-error';
import type { HttpClient } from './http-client';

/** A name is screened by a model before it is kept, so the call may take a while. */
export const NAME_TIMEOUT_MS = 15_000;

// Answers are read by hand: a wrong shape throws, and the HTTP client reports `bad_response`.
type Json = Record<string, unknown>;
function object(json: unknown): Json {
  if (typeof json !== 'object' || json === null) throw new Error('not an object');
  return json as Json;
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('not a string');
  return value;
}
const textOrNull = (value: unknown) => (value === null ? null : text(value));
function list<T>(value: unknown, read: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error('not a list');
  return value.map(read);
}

export interface AccountView {
  readonly accountId: string;
  readonly displayName: string | null;
  readonly canBeHaunted: boolean;
}
function account(json: unknown): AccountView {
  const row = object(json);
  return {
    accountId: text(row['accountId']),
    displayName: textOrNull(row['displayName']),
    canBeHaunted: row['canBeHaunted'] === true,
  };
}

export type Friend = AccountView;

const tableId = (json: unknown) => text(object(json)['tableId']);
function invite(json: unknown): { code: string; expiresAt: string } {
  const row = object(json);
  return { code: text(row['code']), expiresAt: text(row['expiresAt']) };
}

/** The server's preset dares. The words for each live in the string catalogue, keyed by id. */
export const HAUNT_DARES = [
  'two_minutes',
  'first_step',
  'before_lunch',
  'just_open_it',
  'race_you',
  'tiny_bit',
] as const;
export type HauntDare = (typeof HAUNT_DARES)[number];

export interface WaitingHaunt {
  readonly id: string;
  readonly bodyType: MonsterBodyType;
  readonly seed: string;
  readonly dare: HauntDare;
  /** `null` for an anonymous haunt: the phone is not told who sent it either. */
  readonly from: { readonly accountId: string; readonly displayName: string | null } | null;
}
function haunt(json: unknown): WaitingHaunt {
  const row = object(json);
  const dare = HAUNT_DARES.find((one) => one === row['dare']);
  if (dare === undefined) throw new Error('not a dare');
  const from = row['from'] === null ? null : object(row['from']);
  return {
    id: text(row['id']),
    bodyType: monsterBodyTypeSchema.parse(row['bodyType']),
    seed: text(row['seed']),
    dare,
    from:
      from === null
        ? null
        : { accountId: text(from['accountId']), displayName: textOrNull(from['displayName']) },
  };
}

export const REPORT_REASONS = [
  'offensive_name',
  'nudge_spam',
  'feels_unsafe',
  'something_else',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * What a haunt is sent with: ids, a seed, a switch and the stored care verdict. There is no field
 * that could hold the task's words.
 */
export interface HauntToSend {
  readonly to: string;
  readonly bodyType: MonsterBodyType;
  readonly seed: string;
  readonly dare: HauntDare;
  readonly anonymous: boolean;
  readonly screen: 'pass';
}

export interface SeatReport {
  readonly tableId: string;
  readonly accountId: string;
  readonly reason: ReportReason;
  readonly alsoLeave: boolean;
}

/** Accounts, tables, seat controls, friends and haunts over HTTP. Nothing here sends task text. */
export interface TogetherApi {
  appleNonce(): Promise<string>;
  signInWithApple(identityToken: string, nonce: string): Promise<AccountView>;
  /** The caller's account, or `null` when this phone has never signed in. */
  me(): Promise<AccountView | null>;
  setDisplayName(displayName: string): Promise<AccountView>;
  setCanBeHaunted(canBeHaunted: boolean): Promise<AccountView>;
  openTable(purchase: PurchaseState): Promise<string>;
  tableInvite(tableId: string): Promise<{ code: string; expiresAt: string }>;
  joinTable(code: string, purchase: PurchaseState): Promise<string>;
  mute(accountId: string, muted: boolean): Promise<void>;
  block(accountId: string, blocked: boolean): Promise<void>;
  report(report: SeatReport): Promise<void>;
  friends(): Promise<Friend[]>;
  friendInvite(): Promise<{ code: string; expiresAt: string }>;
  acceptFriend(code: string): Promise<void>;
  removeFriend(accountId: string): Promise<void>;
  waitingHaunts(): Promise<WaitingHaunt[]>;
  sendHaunt(haunt: HauntToSend): Promise<void>;
  catchHaunt(id: string): Promise<void>;
  shooHaunt(id: string): Promise<void>;
}

/** The fixed word of a rule's refusal, or the transport's own code when there is none. */
export function refusalOf(error: unknown): string {
  if (error instanceof ApiClientError) return error.reason ?? error.code;
  return 'network';
}

const done = () => undefined;

export function createTogetherApi(http: HttpClient): TogetherApi {
  return {
    appleNonce: () =>
      http.post('/v1/accounts/apple/nonce', {}, (json) => text(object(json)['nonce'])),
    signInWithApple: (identityToken, nonce) =>
      http.post('/v1/accounts/apple', { identityToken, nonce }, account),
    me: () =>
      http.request('GET', '/v1/accounts/me', null, account).catch((error: unknown) => {
        if (refusalOf(error) === 'account_required') return null;
        throw error;
      }),
    setDisplayName: (displayName) =>
      http.request('PUT', '/v1/accounts/me', { displayName }, account, {
        timeoutMs: NAME_TIMEOUT_MS,
      }),
    setCanBeHaunted: (canBeHaunted) =>
      http.request('PUT', '/v1/accounts/me', { canBeHaunted }, account),
    openTable: (purchase) => http.post('/v1/tables', { purchase }, tableId),
    tableInvite: (id) => http.post(`/v1/tables/${id}/invites`, {}, invite),
    joinTable: (code, purchase) => http.post('/v1/tables/join', { code, purchase }, tableId),
    mute: (accountId, muted) => http.post('/v1/seats/mute', { accountId, muted }, done),
    block: (accountId, blocked) => http.post('/v1/seats/block', { accountId, blocked }, done),
    report: (report) => http.post('/v1/seats/report', report, done),
    friends: () =>
      http.request('GET', '/v1/friends', null, (json) => list(object(json)['friends'], account)),
    friendInvite: () => http.post('/v1/friends/invites', {}, invite),
    acceptFriend: (code) => http.post('/v1/friends/accept', { code }, done),
    removeFriend: (accountId) => http.request('DELETE', `/v1/friends/${accountId}`, null, done),
    waitingHaunts: () =>
      http.request('GET', '/v1/haunts', null, (json) => list(object(json)['haunts'], haunt)),
    sendHaunt: (sent) => http.post('/v1/haunts', sent, done),
    catchHaunt: (id) => http.post(`/v1/haunts/${id}/catch`, {}, done),
    shooHaunt: (id) => http.post(`/v1/haunts/${id}/shoo`, {}, done),
  };
}
