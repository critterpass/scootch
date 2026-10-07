import type { CameraReadLine } from '@scootch/domain';

import { ApiError } from '../../errors';
import type { RouteContext } from '../../route';
import { screenText } from '../screen-input';

/** The care screen reads at most this much of a page. */
const screenedCharacters = 4000;

/** The page as the model reads it: one line per row, each under the phone's own id. */
export function numberedLines(lines: readonly CameraReadLine[]): string {
  return lines.map(({ id, text }) => `${id}: ${text}`).join('\n');
}

/**
 * The care screen's answer for the words read from a photo, before anything is written about
 * them. `heavy` words get no joke; words nobody could screen count as serious; words that are
 * not a page at all (abuse, or text addressed to the app) are `refused`.
 */
export async function screenReadWords(
  c: RouteContext,
  route: string,
  lines: readonly CameraReadLine[],
): Promise<'pass' | 'serious' | 'crisis' | 'refused'> {
  const text = lines
    .map((line) => line.text)
    .join('\n')
    .slice(0, screenedCharacters);
  try {
    const screened = await screenText({ env: c.env, route, deviceHash: c.var.device.hash }, text);
    return screened.verdict === 'reject' ? 'refused' : screened.verdict;
  } catch (error) {
    // The reason only: an error here can never carry the words into the log.
    console.error('camera words not screened', {
      requestId: c.var.requestId,
      route,
      reason: error instanceof ApiError ? error.code : 'internal',
    });
    return 'serious';
  }
}
