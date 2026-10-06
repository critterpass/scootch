import { describe, expect, it } from 'vitest';

import fixtures from './fixtures/table-messages.json';
import {
  TABLE_CLOSE_CODES,
  tableClientMessageSchema,
  tableServerMessageSchema,
  tableWorkModeMessageSchema,
} from './table-messages';

describe('table messages', () => {
  it('parse every recorded client and server message', () => {
    for (const message of fixtures.client) {
      expect(tableClientMessageSchema.safeParse(message).success, JSON.stringify(message)).toBe(
        true,
      );
    }
    for (const message of fixtures.server) {
      expect(tableServerMessageSchema.safeParse(message).success, JSON.stringify(message)).toBe(
        true,
      );
    }
  });

  it('take a work mode by id only: no other word and no extra field', () => {
    const mode = { type: 'mode', workMode: 'writing', hidden: false };

    expect(tableWorkModeMessageSchema.safeParse(mode).success).toBe(true);
    expect(
      tableWorkModeMessageSchema.safeParse({ ...mode, workMode: 'my tax return' }).success,
    ).toBe(false);
    expect(tableWorkModeMessageSchema.safeParse({ ...mode, label: 'my tax return' }).success).toBe(
      false,
    );
  });

  it('keep every close code distinct', () => {
    const codes = Object.values(TABLE_CLOSE_CODES);

    expect(new Set(codes).size).toBe(codes.length);
  });
});
