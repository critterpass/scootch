import { describe, expect, it } from '@jest/globals';

import { BACKUP_TOKEN_PATTERN, createBackupTokens, tokenFromBytes } from './backup-token';
import { memoryStore, TOKEN } from './test/sample-world';

function phone(keychainHolds: string | null = null, cloudHolds: string | null = null) {
  const keychain = memoryStore(keychainHolds);
  const cloud = memoryStore(cloudHolds);
  let made = 0;
  const tokens = createBackupTokens({
    keychain,
    cloud,
    newToken: () => {
      made += 1;
      return TOKEN;
    },
  });
  return { keychain, cloud, tokens, made: () => made };
}

describe('the backup token', () => {
  it('is 43 URL-safe characters from 32 random bytes', () => {
    const bytes = Uint8Array.from({ length: 32 }, (_, index) => (index * 37 + 251) % 256);
    const token = tokenFromBytes(bytes);
    expect(token).toHaveLength(43);
    expect(token).toMatch(BACKUP_TOKEN_PATTERN);
    expect(tokenFromBytes(Uint8Array.from([255, 255, 254]))).toBe('___-');
  });

  it('is made once and written to both stores', async () => {
    const { keychain, cloud, tokens, made } = phone();
    expect(await tokens.ensure()).toBe(TOKEN);
    expect(await tokens.ensure()).toBe(TOKEN);
    expect(made()).toBe(1);
    expect(keychain.value).toBe(TOKEN);
    expect(cloud.value).toBe(TOKEN);
  });

  it('is read when only the Keychain answers', async () => {
    const { cloud, tokens } = phone(TOKEN, TOKEN);
    cloud.off = true;
    expect(await tokens.read()).toEqual({
      token: TOKEN,
      answered: { keychain: true, cloud: false },
    });
  });

  it('is read when only iCloud answers', async () => {
    const { keychain, tokens } = phone(TOKEN, TOKEN);
    keychain.off = true;
    expect(await tokens.read()).toEqual({
      token: TOKEN,
      answered: { keychain: false, cloud: true },
    });
    expect(await tokens.bothOff()).toBe(false);
  });

  it('heals the store that lost it, in either direction', async () => {
    const onlyCloud = phone(null, TOKEN);
    expect((await onlyCloud.tokens.read()).token).toBe(TOKEN);
    expect(onlyCloud.keychain.value).toBe(TOKEN);

    const onlyKeychain = phone(TOKEN, null);
    expect(await onlyKeychain.tokens.ensure()).toBe(TOKEN);
    expect(onlyKeychain.cloud.value).toBe(TOKEN);
    expect(onlyKeychain.made()).toBe(0);
  });

  it('reports both stores off, and then makes no token', async () => {
    const { keychain, cloud, tokens } = phone();
    keychain.off = true;
    cloud.off = true;
    expect(await tokens.bothOff()).toBe(true);
    expect(await tokens.read()).toEqual({
      token: null,
      answered: { keychain: false, cloud: false },
    });
    expect(await tokens.ensure()).toBeNull();
  });

  it('is cleared from both stores', async () => {
    const { keychain, cloud, tokens } = phone(TOKEN, TOKEN);
    await tokens.clear();
    expect(keychain.value).toBeNull();
    expect(cloud.value).toBeNull();
  });
});
