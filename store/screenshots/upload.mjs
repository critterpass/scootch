// Puts the rendered frames on the prd app's editable App Store version, both localizations.
//
//   node store/screenshots/upload.mjs <out folder of render.ts>
//
// For each localization and display size it finds or creates the screenshot set, deletes what the
// set holds, then reserves, uploads and commits each frame in order. Running it twice leaves the
// same result. It never submits anything for review.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { all, asc, editableVersion } from '../asc.mjs';

// The same sizes as render.ts: its folder name and the App Store Connect display type.
const sizes = [
  { name: 'iphone-69', displayType: 'APP_IPHONE_67' },
  { name: 'iphone-63', displayType: 'APP_IPHONE_61' },
];
const locales = { 'en-US': 'en', vi: 'vi' };

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

async function setFor(localizationId, displayType) {
  const sets = await all(`/v1/appStoreVersionLocalizations/${localizationId}/appScreenshotSets`);
  const found = sets.find((set) => set.attributes.screenshotDisplayType === displayType);
  if (found) return found.id;
  const created = await asc('POST', '/v1/appScreenshotSets', {
    data: {
      type: 'appScreenshotSets',
      attributes: { screenshotDisplayType: displayType },
      relationships: {
        appStoreVersionLocalization: {
          data: { type: 'appStoreVersionLocalizations', id: localizationId },
        },
      },
    },
  });
  return created.data.id;
}

async function uploadOne(setId, file) {
  const bytes = readFileSync(file);
  const reserved = await asc('POST', '/v1/appScreenshots', {
    data: {
      type: 'appScreenshots',
      attributes: { fileName: basename(file), fileSize: statSync(file).size },
      relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
    },
  });
  const shot = reserved.data;
  for (const part of shot.attributes.uploadOperations) {
    const headers = Object.fromEntries(part.requestHeaders.map((h) => [h.name, h.value]));
    const res = await fetch(part.url, {
      method: part.method,
      headers,
      body: bytes.subarray(part.offset, part.offset + part.length),
    });
    if (!res.ok) throw new Error(`Uploading ${basename(file)} -> ${res.status}`);
  }
  await asc('PATCH', `/v1/appScreenshots/${shot.id}`, {
    data: {
      type: 'appScreenshots',
      id: shot.id,
      attributes: {
        uploaded: true,
        sourceFileChecksum: createHash('md5').update(bytes).digest('hex'),
      },
    },
  });
  return shot.id;
}

/** Waits for App Store Connect to finish processing, up to two minutes per frame. */
async function processed(id, name) {
  for (let i = 0; i < 40; i++) {
    const { data } = await asc('GET', `/v1/appScreenshots/${id}`);
    const state = data.attributes.assetDeliveryState?.state;
    if (state === 'COMPLETE') return;
    if (state === 'FAILED') {
      throw new Error(
        `${name} failed processing: ${JSON.stringify(data.attributes.assetDeliveryState.errors)}`,
      );
    }
    await wait(3000);
  }
  throw new Error(`${name} is still processing`);
}

async function main() {
  const outArg = process.argv[2];
  if (!outArg) throw new Error('Usage: upload.mjs <out folder of render.ts>');
  const out = resolve(outArg);
  const version = await editableVersion();
  console.log(`Version ${version.attributes.versionString} (${version.id})`);
  const localizations = await all(
    `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`,
  );

  for (const [locale, lang] of Object.entries(locales)) {
    const localization = localizations.find((l) => l.attributes.locale === locale);
    if (!localization) throw new Error(`The version has no ${locale} localization`);
    for (const size of sizes) {
      const folder = join(out, size.name, lang);
      const files = readdirSync(folder)
        .filter((name) => name.endsWith('.jpg'))
        .sort()
        .map((name) => join(folder, name));
      if (files.length === 0) throw new Error(`No frames in ${folder}`);

      const setId = await setFor(localization.id, size.displayType);
      for (const old of await all(`/v1/appScreenshotSets/${setId}/appScreenshots`)) {
        await asc('DELETE', `/v1/appScreenshots/${old.id}`);
      }
      const ids = [];
      for (const file of files) {
        const id = await uploadOne(setId, file);
        await processed(id, basename(file));
        ids.push(id);
      }
      await asc('PATCH', `/v1/appScreenshotSets/${setId}/relationships/appScreenshots`, {
        data: ids.map((id) => ({ type: 'appScreenshots', id })),
      });
      console.log(`${locale} ${size.displayType}: set ${setId}, ${ids.length} frames`);
    }
  }
}

await main();
