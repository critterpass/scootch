import { describe, expect, it } from 'vitest';

import { releaseTagPrefix } from './native-build-manifest';
import { resolveBuild } from './resolve-device-build';

const FINGERPRINT = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const PREFIX = 'native-e2e-test-ios-a1b2c3d4e5f6-';
const ARCHIVE = 'scootch-e2e-test-ios.tar.gz';

function manifest(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    profile: 'e2e-test',
    platform: 'ios',
    fingerprint: FINGERPRINT,
    commit: 'c0ffee',
    artifact: ARCHIVE,
    runId: '200',
    createdAt: '2026-10-07T08:00:00.000Z',
    ...overrides,
  });
}

function release(tag: string, body: string, assetName = ARCHIVE) {
  return {
    tag_name: tag,
    draft: false,
    body,
    assets: [
      { name: 'manifest.json', browser_download_url: `https://gh/${tag}/manifest.json` },
      { name: assetName, browser_download_url: `https://gh/${tag}/${assetName}` },
    ],
  };
}

/** GitHub answered from a table of pages, recording what was asked. */
function github(releases: Record<string, unknown>) {
  const asked: string[] = [];
  const pages: Record<string, unknown> = {
    [`git/matching-refs/tags/${PREFIX}`]: Object.keys(releases).map((tag) => ({
      ref: `refs/tags/${tag}`,
    })),
  };
  for (const [tag, record] of Object.entries(releases)) pages[`releases/tags/${tag}`] = record;
  const fetchJson = (apiPath: string) => {
    asked.push(apiPath);
    return Promise.resolve(pages[apiPath]);
  };
  return { asked, fetchJson };
}

const resolve = (fetchJson: (apiPath: string) => Promise<unknown>, override = '') =>
  resolveBuild({ override, fingerprint: () => FINGERPRINT, fetchJson });

describe('the e2e-test build a device run installs', () => {
  it('names releases by the start of the fingerprint', () => {
    expect(releaseTagPrefix(FINGERPRINT)).toBe(PREFIX);
  });

  it('takes the newest build made for this fingerprint', async () => {
    const { fetchJson, asked } = github({
      [`${PREFIX}99`]: release(`${PREFIX}99`, manifest()),
      [`${PREFIX}1200`]: release(`${PREFIX}1200`, manifest()),
      [`${PREFIX}300`]: release(`${PREFIX}300`, manifest()),
    });
    expect(await resolve(fetchJson)).toEqual({
      id: `${PREFIX}1200`,
      url: `https://gh/${PREFIX}1200/${ARCHIVE}`,
      fingerprint: FINGERPRINT,
      source: 'github',
    });
    expect(asked).not.toContain(`releases/tags/${PREFIX}300`);
  });

  it('passes over a newer release that is another profile, another fingerprint or has no binary', async () => {
    const sameStart = `${FINGERPRINT.slice(0, 12)}ffffffffffffffffffffffffffff`;
    for (const newer of [
      release(`${PREFIX}300`, manifest({ profile: 'dev' })),
      release(`${PREFIX}300`, manifest({ fingerprint: sameStart })),
      release(`${PREFIX}300`, manifest({ platform: 'android' })),
      release(`${PREFIX}300`, manifest(), 'manifest-only'),
      release(`${PREFIX}300`, 'hand-written notes'),
      { ...release(`${PREFIX}300`, manifest()), draft: true },
    ]) {
      const { fetchJson } = github({
        [`${PREFIX}300`]: newer,
        [`${PREFIX}200`]: release(`${PREFIX}200`, manifest()),
      });
      expect((await resolve(fetchJson)).id).toBe(`${PREFIX}200`);
    }
  });

  it('installs an explicit URL without computing a fingerprint or asking GitHub', async () => {
    const { fetchJson, asked } = github({});
    const build = await resolveBuild({
      override: ' https://example.com/other.tar.gz ',
      fingerprint: () => {
        throw new Error('the fingerprint must not be computed for an override');
      },
      fetchJson,
    });
    expect(build).toMatchObject({ url: 'https://example.com/other.tar.gz', source: 'override' });
    expect(asked).toEqual([]);
  });

  it('fails when no build matches, naming the fingerprint and how to make a build', async () => {
    const onlyOtherFingerprint = github({
      [`${PREFIX}300`]: release(`${PREFIX}300`, manifest({ fingerprint: 'another' })),
    });
    const nothing = { fetchJson: () => Promise.resolve(undefined) };
    for (const { fetchJson } of [onlyOtherFingerprint, nothing]) {
      const failure = resolve(fetchJson);
      await expect(failure).rejects.toThrow(FINGERPRINT);
      await expect(failure).rejects.toThrow('never starts a build');
      await expect(failure).rejects.toThrow(
        'gh workflow run native-build.yml -f ref=<branch> -f profile=e2e-test',
      );
    }
  });
});
