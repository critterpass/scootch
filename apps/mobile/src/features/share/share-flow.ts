import type { CardLanguage } from '@scootch/art';
import type { CardData, GuessMinutes, SignedWords, TaskRow } from '@scootch/domain';
import { encodeWav, type Stereo } from '@scootch/sound';

import type { CardShareRequest, ShareApi } from '../../api/share-api';
import { refusalOf } from '../../api/together-api';

import {
  cardShareKey,
  monsterPageKey,
  withShare,
  withoutShare,
  type KeptShare,
  type KeptShares,
} from './kept-shares';
import {
  CARD_TURN,
  composeCardTurn,
  composeShareImage,
  type ShareDress,
  type ShareFormat,
  type ShareImage,
} from './share-image';
import { sharedPageLink } from './share-links';
import { shareOffered } from './share-rules';

/** The phone's part in sharing. The real one is native; the tests use a recorder. */
export interface ShareDevice {
  /** Draws the picture off screen and writes it as a PNG file. Returns the file's address. */
  renderPng(image: ShareImage, name: string): Promise<string>;
  writeFile(name: string, bytes: Uint8Array): Promise<string>;
  /**
   * Draws the frames off screen and writes them as one looping video. Absent on a phone whose
   * build has no video writer: a card is then shared as a picture.
   */
  renderVideo?(
    frames: readonly ShareImage[],
    name: string,
    framesPerSecond: number,
  ): Promise<string>;
  /** Opens the system share sheet with a file and, when there is one, the link to its page. */
  openShareSheet(uri: string, mimeType: string, link?: string): Promise<void>;
  /** Asks for permission to add to Photos if it has not been given, then saves. */
  saveToPhotos(uri: string): Promise<'saved' | 'refused'>;
  /** Puts a line of text on the clipboard: the link to a page. Absent where there is none. */
  copyText?(text: string): Promise<void>;
}

export interface CatchShare {
  /** The task the card came from, as stored. Its flags decide whether sharing exists at all. */
  readonly task: Pick<TaskRow, 'id' | 'screen' | 'sharePrivate'> | null;
  readonly card: CardData;
  /** The server's signature for the monster's words, as stored with it; `null` when it has none. */
  readonly signed: SignedWords | null;
  /**
   * The picture that is sent. A story and a card go with the catch's page of the same kind on the
   * website; a sticker sheet, a receipt and a poster are the person's own and have no page.
   */
  readonly format: ShareFormat;
  /** What the pictures wear and carry besides the catch. */
  readonly dress: ShareDress;
  readonly hideTask: boolean;
  readonly language: CardLanguage;
  /**
   * The guess frozen onto the monster at the catch, for the story's line; unset or `null` when
   * there is none or the composer's switch took it out. It is drawn, never posted.
   */
  readonly guessMinutes?: GuessMinutes | null;
}

/** The page a format goes with; `null` for a picture that stands by itself. */
export function pageKindOf(format: ShareFormat): 'story' | 'card' | null {
  return format === 'story' || format === 'card' ? format : null;
}

/** The kind of page a share is filed under. A picture with no page is never filed. */
const kindOf = (share: Pick<CatchShare, 'format'>): 'story' | 'card' =>
  pageKindOf(share.format) ?? 'story';

/** The website's side of sharing: its routes, the pages this phone keeps, and its address. */
export interface SharePages {
  readonly api: ShareApi;
  readonly kept: KeptShares;
  readonly site: string;
}

const keyOf = (share: Pick<CatchShare, 'card' | 'format'>) =>
  cardShareKey(kindOf(share), share.card.monster.seed, share.card.number);

/** Whether the page will show the task's words: only a card's page can, and only when not hidden. */
const taskShown = (share: CatchShare) =>
  kindOf(share) === 'card' && !share.hideTask && share.card.taskLine !== null;

/**
 * The signature a page can be made with: the one stored with the monster, when it is for the
 * monster as the card draws it. A monster hatched before words were signed, or one the phone
 * named itself, has none.
 */
function signatureOf(share: Pick<CatchShare, 'card' | 'signed' | 'format'>): SignedWords | null {
  // A sticker sheet, a receipt and a poster have no page, whatever the catch's words carry.
  if (pageKindOf(share.format) === null) return null;
  return share.signed !== null && share.signed.seed === share.card.monster.seed
    ? share.signed
    : null;
}

/** Whether this catch can have a page on the website. Without one, only its picture is shared. */
export function pageOffered(share: Pick<CatchShare, 'card' | 'signed' | 'format'>): boolean {
  return signatureOf(share) !== null;
}

/**
 * What is posted for a page: the card as the page draws it, the signature for its words with the
 * language they were written in, and the task's stored care verdict. The task line is taken off
 * unless the page shows it.
 */
export function cardShareRequest(share: CatchShare, signed: SignedWords): CardShareRequest {
  const stored = share.task?.screen;
  return {
    kind: kindOf(share),
    language: signed.language,
    card: { ...share.card, taskLine: taskShown(share) ? share.card.taskLine : null },
    // An unscreened or forgotten task is never offered; if one came this far the server refuses it.
    screen: stored === 'pass' || stored === 'serious' ? stored : 'reject',
    signature: signed.signature,
  };
}

async function takeDown(pages: SharePages, kept: KeptShare): Promise<void> {
  try {
    await pages.api.unshareCard(kept.id, kept.unshareToken);
  } catch (error) {
    // Already gone from the website: there is nothing left to take down.
    if (refusalOf(error) !== 'not_found') throw error;
  }
  await pages.kept.write(withoutShare(await pages.kept.read(), kept.key));
}

/**
 * The page for this catch: the one already up when it shows the same thing, otherwise a new one
 * (after the old one is taken down). Throws when the server cannot be reached or refuses; nothing
 * is then kept, and nothing was shared.
 */
async function pageFor(
  pages: SharePages,
  share: CatchShare,
  signed: SignedWords,
): Promise<KeptShare> {
  const key = keyOf(share);
  // The page is in the language its words were written and signed in.
  const { language } = signed;
  const up = (await pages.kept.read()).find((one) => one.key === key);
  if (up && up.language === language && up.taskShown === taskShown(share)) return up;
  if (up) await takeDown(pages, up);
  const page = await pages.api.shareCard(cardShareRequest(share, signed));
  const kept: KeptShare = { key, ...page, language, taskShown: taskShown(share) };
  try {
    await pages.kept.write(withShare(await pages.kept.read(), kept));
  } catch (error) {
    // A page whose token was not kept could never be taken down, so it does not stay up.
    await pages.api.unshareCard(page.id, page.unshareToken).catch(() => undefined);
    throw error;
  }
  return kept;
}

/** The page that is up for this catch, whatever it shows; `null` when there is none. */
export async function sharedPageOf(
  pages: SharePages,
  share: Pick<CatchShare, 'card' | 'format'>,
): Promise<string | null> {
  const up = (await pages.kept.read()).find((one) => one.key === keyOf(share));
  return up
    ? sharedPageLink(pages.site, up.language, kindOf(share) === 'card' ? 'c' : 's', up.id)
    : null;
}

/** What is handed to the share sheet or to Photos: a file, and what kind of file it is. */
interface Shared {
  readonly uri: string;
  readonly mimeType: 'image/png' | 'video/mp4';
}

/**
 * The file for a share: a picture, or for a trading card on a phone that can write video, the
 * card turning once. A video that fails to write falls back to the picture, never to nothing.
 */
async function pictureOf(device: ShareDevice, share: CatchShare): Promise<Shared | null> {
  if (!shareOffered(share.task)) return null;
  const name = `scootch-${share.format}-${share.card.number}`;
  if (share.format === 'card' && device.renderVideo) {
    try {
      const frames = composeCardTurn(share.card, share, share.dress);
      const uri = await device.renderVideo(frames, name, CARD_TURN.framesPerSecond);
      return { uri, mimeType: 'video/mp4' };
    } catch {
      // The picture below is shared instead.
    }
  }
  const image = composeShareImage(share.format, share.card, share, share.dress);
  return { uri: await device.renderPng(image, name), mimeType: 'image/png' };
}

/**
 * Sends a catch to the system share sheet: its page is put on the website first, then the picture
 * and the page's link are handed over. A private or serious task is never sent. When the page
 * cannot be put up this rejects, and the sheet never opens.
 *
 * A catch whose words carry no signature gets no page: its picture alone goes to the sheet, with
 * no link and no call to the server, and the answer says so.
 */
export async function shareCatch(
  device: ShareDevice,
  pages: SharePages,
  share: CatchShare,
): Promise<'shared' | 'shared_picture' | 'not_offered'> {
  if (!shareOffered(share.task)) return 'not_offered';
  const signed = signatureOf(share);
  if (signed === null) {
    const picture = await pictureOf(device, share);
    if (picture === null) return 'not_offered';
    await device.openShareSheet(picture.uri, picture.mimeType);
    return 'shared_picture';
  }
  const page = await pageFor(pages, share, signed);
  const picture = await pictureOf(device, share);
  if (picture === null) return 'not_offered';
  const link = sharedPageLink(
    pages.site,
    page.language,
    kindOf(share) === 'card' ? 'c' : 's',
    page.id,
  );
  await device.openShareSheet(picture.uri, picture.mimeType, link);
  return 'shared';
}

/** Takes a catch's page down with the token kept for it. Rejects, changing nothing, on a failure. */
export async function unshareCatch(
  pages: SharePages,
  share: CatchShare,
): Promise<'unshared' | 'nothing_up'> {
  const up = (await pages.kept.read()).find((one) => one.key === keyOf(share));
  if (!up) return 'nothing_up';
  await takeDown(pages, up);
  return 'unshared';
}

/**
 * Tells a shared monster's own page that its monster is caught, once. A monster with no page, or
 * one already told, sends nothing. A failure leaves it untold, to be told at the next reveal.
 */
export async function tellPageOfCatch(
  pages: Pick<SharePages, 'api' | 'kept'>,
  monster: { readonly seed: string; readonly catchMinutes: number },
): Promise<'told' | 'nothing_to_tell'> {
  const key = monsterPageKey(monster.seed);
  const page = (await pages.kept.read()).find((one) => one.key === key);
  if (!page || page.caughtTold === true) return 'nothing_to_tell';
  await pages.api.monsterCaught(page.id, page.unshareToken, Math.max(1, monster.catchMinutes));
  await pages.kept.write(withShare(await pages.kept.read(), { ...page, caughtTold: true }));
  return 'told';
}

/** Saves a catch to Photos, after the phone's own permission prompt. */
export async function saveCatch(
  device: ShareDevice,
  share: CatchShare,
): Promise<'saved' | 'refused' | 'not_offered'> {
  const picture = await pictureOf(device, share);
  if (picture === null) return 'not_offered';
  return device.saveToPhotos(picture.uri);
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

/** Sends a picture that stands by itself (a wanted poster, a month's poster) to the share sheet. */
export async function sharePicture(
  device: ShareDevice,
  image: ShareImage,
  name: string,
): Promise<'shared_picture'> {
  await device.openShareSheet(await device.renderPng(image, name), 'image/png');
  return 'shared_picture';
}

/** Saves a picture that stands by itself to Photos, after the phone's own permission prompt. */
export async function savePicture(
  device: ShareDevice,
  image: ShareImage,
  name: string,
): Promise<'saved' | 'refused'> {
  return device.saveToPhotos(await device.renderPng(image, name));
}

/**
 * The link to a catch's page, putting the page up first if it is not there yet. `null` for a
 * catch that can have no page, or a task that may not be shared: nothing is sent for those.
 */
export async function linkOfCatch(pages: SharePages, share: CatchShare): Promise<string | null> {
  if (!shareOffered(share.task)) return null;
  const signed = signatureOf(share);
  if (signed === null) return null;
  const page = await pageFor(pages, share, signed);
  return sharedPageLink(pages.site, page.language, kindOf(share) === 'card' ? 'c' : 's', page.id);
}
