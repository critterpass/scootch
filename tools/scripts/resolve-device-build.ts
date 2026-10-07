/**
 * Finds the e2e-test simulator build an iOS device run installs.
 *
 *   tsx tools/scripts/resolve-device-build.ts [--override <url>]
 *
 * An override (the workflow's `build_url` input) wins. Otherwise it computes this commit's native
 * fingerprint and takes the newest build made for exactly that fingerprint from this repository's
 * GitHub releases, where the native-build workflow publishes every e2e-test build
 * (GITHUB_REPOSITORY, and GITHUB_TOKEN for the API's rate limit). It never starts a build: with no
 * matching build it fails and says how to make one. Writes `url`, `build_id`, `fingerprint` and
 * `source` to the step outputs on GitHub Actions.
 */
import { appendFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import {
  DEVICE_PROFILE,
  nativeFingerprint,
  parseManifest,
  releaseTagPrefix,
} from './native-build-manifest';

/** How many of a fingerprint's newest releases are read before giving up. */
const RELEASES_TRIED = 3;

export interface ResolvedBuild {
  id: string;
  url: string;
  fingerprint: string;
  source: 'override' | 'github';
}

/** One page of GitHub's REST API for this repository; a missing page (404) reads as undefined. */
export type FetchJson = (apiPath: string) => Promise<unknown>;

interface ReleaseRecord {
  tag_name?: unknown;
  draft?: unknown;
  body?: unknown;
  assets?: { name?: unknown; browser_download_url?: unknown }[];
}

/**
 * The release tags under `prefix` from a `git/matching-refs/tags/<prefix>` response, newest build
 * first: a tag ends with the id of the workflow run that made the build, and run ids only grow.
 */
export function newestTags(refs: unknown, prefix: string): string[] {
  if (!Array.isArray(refs)) return [];
  const tags: { tag: string; run: number }[] = [];
  for (const entry of refs as { ref?: unknown }[]) {
    const tag = typeof entry.ref === 'string' ? entry.ref.replace(/^refs\/tags\//, '') : '';
    const run = tag.startsWith(prefix) ? tag.slice(prefix.length) : '';
    if (/^\d+$/.test(run)) tags.push({ tag, run: Number(run) });
  }
  return tags.sort((a, b) => b.run - a.run).map((entry) => entry.tag);
}

/**
 * The download URL of a release's binary, when its manifest (the release body) is an iOS e2e-test
 * build with exactly this fingerprint and the binary is attached. The tag carries only the
 * fingerprint's first characters, so the manifest decides.
 */
export function buildUrlFromRelease(
  release: ReleaseRecord | undefined,
  fingerprint: string,
): string | undefined {
  if (!release || release.draft === true) return undefined;
  const manifest = parseManifest(typeof release.body === 'string' ? release.body : undefined);
  if (
    manifest?.profile !== DEVICE_PROFILE ||
    manifest.platform !== 'ios' ||
    manifest.fingerprint !== fingerprint
  ) {
    return undefined;
  }
  const asset = release.assets?.find((entry) => entry.name === manifest.artifact);
  return typeof asset?.browser_download_url === 'string' ? asset.browser_download_url : undefined;
}

/** Why a run stops when no build matches the native fingerprint, and how to make one. */
export function noMatchMessage(fingerprint: string): string {
  return (
    `No "${DEVICE_PROFILE}" build matches this commit's native fingerprint ${fingerprint}, and a ` +
    'device run never starts a build. Make one for this branch: ' +
    `gh workflow run native-build.yml -f ref=<branch> -f profile=${DEVICE_PROFILE}, then run ` +
    'this again. To install a build made from other native code anyway, pass its URL as build_url.'
  );
}

export async function resolveBuild(options: {
  override: string;
  /** Computed only when there is no override. */
  fingerprint: () => string;
  fetchJson: FetchJson;
}): Promise<ResolvedBuild> {
  const override = options.override.trim();
  if (override) {
    return { id: 'override', url: override, fingerprint: 'override', source: 'override' };
  }
  const fingerprint = options.fingerprint();
  const prefix = releaseTagPrefix(fingerprint);
  const refs = await options.fetchJson(`git/matching-refs/tags/${prefix}`);
  for (const tag of newestTags(refs, prefix).slice(0, RELEASES_TRIED)) {
    const release = (await options.fetchJson(`releases/tags/${tag}`)) as ReleaseRecord | undefined;
    const url = buildUrlFromRelease(release, fingerprint);
    if (url) return { id: tag, url, fingerprint, source: 'github' };
  }
  throw new Error(noMatchMessage(fingerprint));
}

function githubApi(repository: string, token: string | undefined): FetchJson {
  const base = process.env['GITHUB_API_URL'] ?? 'https://api.github.com';
  return async (apiPath) => {
    const response = await fetch(`${base}/repos/${repository}/${apiPath}`, {
      headers: {
        accept: 'application/vnd.github+json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`GitHub ${apiPath} answered ${String(response.status)}`);
    return (await response.json()) as unknown;
  };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: { override: { type: 'string', default: '' } },
  });
  const repository = process.env['GITHUB_REPOSITORY'];
  if (!repository) throw new Error('GITHUB_REPOSITORY is not set');
  const build = await resolveBuild({
    override: values.override,
    fingerprint: nativeFingerprint,
    fetchJson: githubApi(repository, process.env['GITHUB_TOKEN']),
  });
  console.log(`build ${build.id} from ${build.source} (fingerprint ${build.fingerprint})`);
  const lines = `url=${build.url}\nbuild_id=${build.id}\nfingerprint=${build.fingerprint}\nsource=${build.source}\n`;
  if (process.env['GITHUB_OUTPUT']) appendFileSync(process.env['GITHUB_OUTPUT'], lines);
  else console.log(build.url);
  if (process.env['GITHUB_STEP_SUMMARY']) {
    appendFileSync(
      process.env['GITHUB_STEP_SUMMARY'],
      `- e2e-test build: \`${build.id}\` (${build.source}, fingerprint \`${build.fingerprint}\`)\n`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  main().catch((error: unknown) => {
    console.error(`::error::${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
