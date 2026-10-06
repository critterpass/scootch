import { describe, expect, it } from '@jest/globals';

import { createTogetherApi } from '../../api/together-api';

import { inviteCodeFrom, joinOutcomeOf } from './table-rules';
import { fakeHttp, refused } from './test/fake-table';

const TABLE = 'abcdefghijklmnop';

describe('asking for a seat', () => {
  const join = (answer: unknown) =>
    createTogetherApi(fakeHttp({ 'POST /v1/tables/join': answer }).http)
      .joinTable('abcdefghij', 'free')
      .then(
        (tableId) => ({ seated: tableId }),
        (error: unknown) => joinOutcomeOf(error),
      );

  it('is seated at the table the link points to', async () => {
    expect(await join({ tableId: TABLE })).toEqual({ seated: TABLE });
  });

  it.each([
    ['table_full', 'full'],
    ['pass_full', 'full'],
    // An expired link, a closed table and a block on either side get one answer from the server.
    ['invite_not_valid', 'link_ended'],
    ['not_allowed', 'banned'],
    ['name_required', 'name_required'],
    ['account_required', 'not_signed_in'],
  ])('reads the refusal %s as %s', async (reason, outcome) => {
    expect(await join(refused(reason))).toBe(outcome);
  });

  it('reads a server that cannot be reached as unreachable', async () => {
    expect(await join(new Error('offline'))).toBe('unreachable');
  });

  it('takes a code from a pasted link or on its own, and nothing else', () => {
    expect(inviteCodeFrom(' https://scootch.app/t/abcdefghij ')).toBe('abcdefghij');
    expect(inviteCodeFrom('ABCDEFGHIJ')).toBe('abcdefghij');
    expect(inviteCodeFrom('https://scootch.app/t/')).toBeNull();
    expect(inviteCodeFrom('hello there')).toBeNull();
  });
});
