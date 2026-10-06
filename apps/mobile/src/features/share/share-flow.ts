import type { CardLanguage } from '@scootch/art';
import type { CardData, TaskRow } from '@scootch/domain';
import { encodeWav, type Stereo } from '@scootch/sound';

import { composeShareImage, type ShareImage } from './share-image';
import { shareOffered } from './share-rules';

/** The phone's part in sharing. The real one is native; the tests use a recorder. */
export interface ShareDevice {
  /** Draws the picture off screen and writes it as a PNG file. Returns the file's address. */
  renderPng(image: ShareImage, name: string): Promise<string>;
  writeFile(name: string, bytes: Uint8Array): Promise<string>;
  openShareSheet(uri: string, mimeType: string): Promise<void>;
  /** Asks for permission to add to Photos if it has not been given, then saves. */
  saveToPhotos(uri: string): Promise<'saved' | 'refused'>;
}

export interface CatchShare {
  /** The task the card came from, as stored. Its flags decide whether sharing exists at all. */
  readonly task: Pick<TaskRow, 'id' | 'screen' | 'sharePrivate'> | null;
  readonly card: CardData;
  readonly kind: 'story' | 'card';
  readonly hideTask: boolean;
  readonly language: CardLanguage;
}

async function pictureOf(device: ShareDevice, share: CatchShare): Promise<string | null> {
  if (!shareOffered(share.task)) return null;
  const image = composeShareImage(share.kind, share.card, share);
  return device.renderPng(image, `scootch-${share.kind}-${share.card.number}`);
}

/** Sends a catch to the system share sheet. A private or serious task is never sent. */
export async function shareCatch(
  device: ShareDevice,
  share: CatchShare,
): Promise<'shared' | 'not_offered'> {
  const uri = await pictureOf(device, share);
  if (uri === null) return 'not_offered';
  await device.openShareSheet(uri, 'image/png');
  return 'shared';
}

/** Saves a catch to Photos, after the phone's own permission prompt. */
export async function saveCatch(
  device: ShareDevice,
  share: CatchShare,
): Promise<'saved' | 'refused' | 'not_offered'> {
  const uri = await pictureOf(device, share);
  if (uri === null) return 'not_offered';
  return device.saveToPhotos(uri);
}

/** Sends the week's clip as an audio file. Whether it becomes a video is not decided yet. */
export async function shareWeekClip(
  device: ShareDevice,
  clip: Stereo,
  week: string,
): Promise<'shared'> {
  const uri = await device.writeFile(`scootch-${week}.wav`, encodeWav(clip));
  await device.openShareSheet(uri, 'audio/wav');
  return 'shared';
}
