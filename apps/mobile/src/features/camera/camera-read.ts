import {
  biggerZone,
  isSentMode,
  readDesk,
  readRoom,
  type Attitude,
  type Box,
  type CameraMode,
  type CameraStepWords,
  type FoundThing,
  type Language,
  type RoomZone,
  type ZoneLetter,
} from '@scootch/domain';
import { noTaskLine } from '@scootch/voice';

import type { OcrLine, OcrQualityIssue, ReadingApi } from '../../../modules/scootch-reading';
import type { CameraApi } from '../../api/camera-api';

import type { Size } from './photo-frame';

export interface Speaker {
  readonly language: Language;
  readonly attitude: Attitude;
}

/** What the camera needs from outside itself. Each is replaced by a stand-in in tests. */
export interface CameraPorts {
  readonly reading: ReadingApi;
  readonly api: CameraApi;
  readonly online: () => boolean;
}

export interface NumberedBox {
  readonly id: string;
  readonly box: Box;
  /** From one, in reading order: the number drawn on the photo. */
  readonly number: number;
}

/**
 * What came of reading one photo. Every count in it (the box numbers, the lines read, the zones)
 * is the phone's own. `words.action` and `words.task` are `null` where the screen uses its own
 * plain words.
 */
export type CameraRead =
  | {
      readonly kind: 'desk';
      readonly photo: Size;
      readonly thing: FoundThing;
      readonly others: readonly FoundThing[];
      readonly words: CameraStepWords;
    }
  | {
      readonly kind: 'room';
      readonly photo: Size;
      readonly zones: readonly RoomZone[];
      readonly order: readonly ZoneLetter[];
      readonly letter: ZoneLetter;
      readonly words: CameraStepWords;
    }
  | {
      readonly kind: 'paper';
      readonly photo: Size;
      readonly boxes: readonly NumberedBox[];
      readonly pick: NumberedBox;
      readonly document: string | null;
      readonly jargon: {
        readonly term: string;
        readonly meaning: string;
        readonly more: string | null;
      } | null;
      readonly words: CameraStepWords;
    }
  | {
      readonly kind: 'screen';
      readonly photo: Size;
      readonly pick: Box;
      readonly linesRead: number;
      readonly draft: string | null;
      readonly words: CameraStepWords;
    }
  /** Nothing to pick out of the photo: no things, or no words. */
  | { readonly kind: 'nothing'; readonly mode: CameraMode }
  /** Read, and nothing on it asks anything of the person. */
  | { readonly kind: 'no_step' }
  | { readonly kind: 'dark' }
  | { readonly kind: 'poor'; readonly issue: OcrQualityIssue }
  /** Heavy words: plain company, no joke, no step made from them. */
  | { readonly kind: 'heavy'; readonly crisis: boolean }
  | { readonly kind: 'needs_connection' }
  | { readonly kind: 'failed' };

/** Whether a read gave the person a step. Only that spends a free try. */
export function gaveStep(read: CameraRead): boolean {
  return (
    read.kind === 'desk' || read.kind === 'room' || read.kind === 'paper' || read.kind === 'screen'
  );
}

/** The best name of each thing that has one. */
function names(things: readonly FoundThing[]): string[] {
  return things.flatMap((thing) => thing.labels.slice(0, 1));
}

const POSITIONS = {
  A: 'top_left',
  B: 'top_right',
  C: 'bottom_left',
  D: 'bottom_right',
} as const satisfies Record<ZoneLetter, string>;

function ownWords(speaker: Speaker, slot: 'cameraDesk' | 'cameraRoom'): CameraStepWords {
  return { line: noTaskLine(speaker.language, speaker.attitude, slot), action: null, task: null };
}

/** Scootch's words for a ringed thing: the route's when it answers, his offline line otherwise. */
async function deskWords(
  ports: CameraPorts,
  speaker: Speaker,
  thing: FoundThing,
  others: readonly FoundThing[],
): Promise<CameraStepWords> {
  if (!ports.online()) return ownWords(speaker, 'cameraDesk');
  try {
    return await ports.api.desk({
      ...speaker,
      picked: thing.labels.slice(0, 3),
      others: names(others).slice(0, 11),
    });
  } catch {
    return ownWords(speaker, 'cameraDesk');
  }
}

/** Scootch's words for one corner of a room. Asked again when "Bigger zone" moves the light. */
export async function roomWords(
  ports: CameraPorts,
  speaker: Speaker,
  zone: RoomZone,
): Promise<CameraStepWords> {
  if (!ports.online()) return ownWords(speaker, 'cameraRoom');
  try {
    return await ports.api.room({
      ...speaker,
      position: POSITIONS[zone.letter],
      things: names(zone.things).slice(0, 12),
    });
  } catch {
    return ownWords(speaker, 'cameraRoom');
  }
}

/** The corner after `letter`, with its words, or `null` when it is already the biggest. */
export async function nextRoomZone(
  ports: CameraPorts,
  speaker: Speaker,
  read: Extract<CameraRead, { kind: 'room' }>,
): Promise<Extract<CameraRead, { kind: 'room' }> | null> {
  const letter = biggerZone(read.order, read.letter);
  const zone = read.zones.find((each) => each.letter === letter);
  if (letter === null || zone === undefined) return null;
  return { ...read, letter, words: await roomWords(ports, speaker, zone) };
}

async function readThings(
  ports: CameraPorts,
  speaker: Speaker,
  mode: 'desk' | 'room',
  uri: string,
): Promise<CameraRead> {
  const seen = await ports.reading.findThings(uri);
  if (seen.tooDark) return { kind: 'dark' };
  const photo = { width: seen.width, height: seen.height };
  const things: FoundThing[] = seen.things.map(({ id, box, labels }) => ({ id, box, labels }));
  if (mode === 'desk') {
    const desk = readDesk(things);
    if (desk.kind === 'nothing') return { kind: 'nothing', mode };
    return {
      kind: 'desk',
      photo,
      thing: desk.thing,
      others: desk.others,
      words: await deskWords(ports, speaker, desk.thing, desk.others),
    };
  }
  const room = readRoom(things);
  const letter = room.kind === 'step' ? room.order[0] : undefined;
  const zone = room.kind === 'step' ? room.zones.find((each) => each.letter === letter) : undefined;
  if (room.kind === 'nothing' || letter === undefined || zone === undefined) {
    return { kind: 'nothing', mode };
  }
  return {
    kind: 'room',
    photo,
    zones: room.zones,
    order: room.order,
    letter,
    words: await roomWords(ports, speaker, zone),
  };
}

/** A photographed screen always has glare and never a crease: only a blurred one is retaken. */
function worthRetaking(mode: 'paper' | 'screen', issue: OcrQualityIssue | null): boolean {
  return issue !== null && (mode === 'paper' || issue === 'blurry');
}

async function readWords(
  ports: CameraPorts,
  speaker: Speaker,
  mode: 'paper' | 'screen',
  uri: string,
): Promise<CameraRead> {
  // Asked before the photo is read at all: without a connection nothing can come of it.
  if (!ports.online()) return { kind: 'needs_connection' };
  const page = await ports.reading.recognizeText(uri, { languages: [speaker.language, 'en'] });
  if (page.status === 'no_text') return { kind: 'nothing', mode };
  if (worthRetaking(mode, page.quality) && page.quality !== null) {
    return { kind: 'poor', issue: page.quality };
  }
  const photo = { width: page.width, height: page.height };
  const lines = page.lines.slice(0, 150).map(({ id, text }) => ({ id, text: text.slice(0, 200) }));
  const boxOf = new Map(page.lines.map((line: OcrLine) => [line.id, line.bbox] as const));

  if (mode === 'paper') {
    const answer = await ports.api.paper({ ...speaker, lines });
    if (answer.verdict !== 'pass') return { kind: 'heavy', crisis: answer.verdict === 'crisis' };
    if (answer.result === 'unreadable') return { kind: 'no_step' };
    const boxes = answer.boxes.flatMap((id): { id: string; box: Box }[] => {
      const box = boxOf.get(id);
      return box === undefined ? [] : [{ id, box }];
    });
    const numbered = boxes.map((box, index): NumberedBox => ({ ...box, number: index + 1 }));
    const pick = numbered.find((box) => box.id === answer.pick);
    // The server answers only with ids it was sent; a pick with no box here cannot be drawn.
    if (pick === undefined) return { kind: 'failed' };
    const { line, action, task, document, jargon } = answer;
    return {
      kind: 'paper',
      photo,
      boxes: numbered,
      pick,
      document,
      jargon,
      words: { line, action, task },
    };
  }

  const answer = await ports.api.screen({ ...speaker, lines });
  if (answer.verdict !== 'pass') return { kind: 'heavy', crisis: answer.verdict === 'crisis' };
  if (answer.result === 'unreadable') return { kind: 'no_step' };
  const pick = boxOf.get(answer.pick);
  if (pick === undefined) return { kind: 'failed' };
  const { line, action, task, draft } = answer;
  return {
    kind: 'screen',
    photo,
    pick,
    linesRead: page.lines.length,
    draft,
    words: { line, action, task },
  };
}

/**
 * Reads one photo in one mode. Desk and Room never leave the phone as pictures and always answer,
 * with or without a connection. Paper and Screen send the words read, and the caller must have
 * the person's yes before calling this for them. Anything that goes wrong is `failed`: a read
 * never throws.
 */
export async function readPhoto(
  ports: CameraPorts,
  speaker: Speaker,
  mode: CameraMode,
  uri: string,
): Promise<CameraRead> {
  try {
    return isSentMode(mode)
      ? await readWords(ports, speaker, mode, uri)
      : await readThings(ports, speaker, mode, uri);
  } catch {
    return { kind: 'failed' };
  }
}
