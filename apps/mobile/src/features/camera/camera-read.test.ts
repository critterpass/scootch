import { describe, expect, it } from '@jest/globals';
import { noTaskLine } from '@scootch/voice';

import type { OcrResult, ReadingApi, ThingsResult } from '../../../modules/scootch-reading';
import type { CameraApi } from '../../api/camera-api';

import {
  gaveStep,
  nextRoomZone,
  readPhoto,
  type CameraPorts,
  type CameraRead,
} from './camera-read';
import { boxOnScreen, ringAround } from './photo-frame';

const speaker = { language: 'en', attitude: 'cheeky' } as const;
const words = { line: 'Start with the mug.', action: 'Mug first', task: 'Take the mug away' };

const desk: ThingsResult = {
  things: [
    { id: 't0', box: [0.1, 0.3, 0.4, 0.4], labels: ['paper'] },
    { id: 't1', box: [0.6, 0.5, 0.12, 0.12], labels: ['mug', 'cup'] },
    { id: 't2', box: [0.3, 0.3, 0.2, 0.2], labels: ['laptop'] },
  ],
  tooDark: false,
  width: 1536,
  height: 1152,
};

const page: OcrResult = {
  status: 'ok',
  lines: [
    { id: 'l0', text: 'Council tax form', bbox: [0.1, 0.05, 0.6, 0.05], conf: 0.9 },
    { id: 'l1', text: 'Property reference', bbox: [0.1, 0.2, 0.4, 0.04], conf: 0.9 },
    { id: 'l2', text: 'Full name', bbox: [0.1, 0.3, 0.3, 0.04], conf: 0.9 },
  ],
  signals: { blur: 300, glare: 0, curvature: 0.4, clipped: 0 },
  quality: null,
  width: 1200,
  height: 1600,
};

/** Stand-ins at the camera's two boundaries: the phone's reader and the network. */
function ports(over: {
  things?: ThingsResult;
  text?: OcrResult;
  api?: Partial<CameraApi>;
  online?: boolean;
}) {
  const sent: unknown[] = [];
  const refuse = () => Promise.reject(new Error('not expected'));
  const record =
    <Request, Response>(answer: ((request: Request) => Promise<Response>) | undefined) =>
    (request: Request): Promise<Response> => {
      sent.push(request);
      return answer === undefined ? refuse() : answer(request);
    };
  const reading: ReadingApi = {
    findThings: () => Promise.resolve(over.things ?? desk),
    recognizeText: () => Promise.resolve(over.text ?? page),
  };
  const built: CameraPorts = {
    reading,
    api: {
      desk: record(over.api?.desk),
      room: record(over.api?.room),
      paper: record(over.api?.paper),
      screen: record(over.api?.screen),
    },
    online: () => over.online ?? true,
  };
  return { ports: built, sent };
}

describe('reading a desk and a room', () => {
  it('rings the mug and sends only what the things are called', async () => {
    const { ports: p, sent } = ports({ api: { desk: () => Promise.resolve(words) } });
    const read = await readPhoto(p, speaker, 'desk', 'file:///desk.jpg');
    expect(read).toMatchObject({ kind: 'desk', thing: { id: 't1' }, words });
    expect(sent).toEqual([{ ...speaker, picked: ['mug', 'cup'], others: ['paper'] }]);
    expect(JSON.stringify(sent)).not.toContain('desk.jpg');
  });

  it.each([
    ['with no connection', { online: false }],
    ['when the route fails', { api: { desk: () => Promise.reject(new Error('down')) } }],
  ])('still rings it %s, in his own words, and asks nobody', async (_name, over) => {
    const { ports: p, sent } = ports(over);
    const read = await readPhoto(p, speaker, 'desk', 'file:///desk.jpg');
    expect(read).toMatchObject({
      kind: 'desk',
      thing: { id: 't1' },
      words: { line: noTaskLine('en', 'cheeky', 'cameraDesk'), action: null, task: null },
    });
    expect(sent).toHaveLength('online' in over ? 0 : 1);
  });

  it('says a photo is too dark before reading anything into it', async () => {
    const { ports: p } = ports({ things: { ...desk, tooDark: true } });
    expect(await readPhoto(p, speaker, 'desk', 'a')).toEqual({ kind: 'dark' });
  });

  it('finds nothing on a desk holding only what belongs there', async () => {
    const { ports: p } = ports({ things: { ...desk, things: desk.things.slice(2) } });
    expect(await readPhoto(p, speaker, 'desk', 'a')).toEqual({ kind: 'nothing', mode: 'desk' });
  });

  it('hands over the smallest corner of a room, then the next one up, then no more', async () => {
    const { ports: p, sent } = ports({ api: { room: () => Promise.resolve(words) } });
    const read = await readPhoto(p, speaker, 'room', 'a');
    // Three corners hold one thing each; the mug covers least, then the laptop, then the papers.
    expect(read).toMatchObject({ kind: 'room', letter: 'D', order: ['D', 'A', 'C'] });
    expect(sent[0]).toEqual({ ...speaker, position: 'bottom_right', things: ['mug'] });
    if (read.kind !== 'room') throw new Error('expected a room');
    const bigger = await nextRoomZone(p, speaker, read);
    expect(bigger).toMatchObject({ letter: 'A' });
    const biggest = bigger && (await nextRoomZone(p, speaker, bigger));
    expect(biggest).toMatchObject({ letter: 'C' });
    expect(biggest && (await nextRoomZone(p, speaker, biggest))).toBeNull();
  });
});

describe('reading paper and a screen', () => {
  const step = {
    verdict: 'pass',
    result: 'step',
    boxes: ['l1', 'l2'] as string[],
    pick: 'l2',
    document: 'Council tax form',
    jargon: null,
    ...words,
  } as const;

  it('numbers the boxes itself and sends the words without their positions or the photo', async () => {
    const { ports: p, sent } = ports({ api: { paper: () => Promise.resolve(step) } });
    const read = await readPhoto(p, speaker, 'paper', 'file:///form.jpg');
    expect(read).toMatchObject({
      kind: 'paper',
      boxes: [
        { id: 'l1', number: 1 },
        { id: 'l2', number: 2, box: [0.1, 0.3, 0.3, 0.04] },
      ],
      pick: { id: 'l2', number: 2 },
      words,
    });
    expect(sent).toEqual([
      {
        ...speaker,
        lines: [
          { id: 'l0', text: 'Council tax form' },
          { id: 'l1', text: 'Property reference' },
          { id: 'l2', text: 'Full name' },
        ],
      },
    ]);
  });

  it('needs a connection, and reads nothing without one', async () => {
    const { ports: p, sent } = ports({ online: false });
    expect(await readPhoto(p, speaker, 'paper', 'a')).toEqual({ kind: 'needs_connection' });
    expect(sent).toEqual([]);
  });

  it('asks for a retake of a blurred page and sends nothing', async () => {
    const { ports: p, sent } = ports({ text: { ...page, quality: 'blurry' } });
    expect(await readPhoto(p, speaker, 'paper', 'a')).toEqual({ kind: 'poor', issue: 'blurry' });
    expect(sent).toEqual([]);
  });

  it('reads a screen through its glare', async () => {
    const answer = { verdict: 'pass', result: 'step', pick: 'l1', draft: null, ...words } as const;
    const { ports: p } = ports({
      text: { ...page, quality: 'glare' },
      api: { screen: () => Promise.resolve(answer) },
    });
    expect(await readPhoto(p, speaker, 'screen', 'a')).toMatchObject({
      kind: 'screen',
      pick: [0.1, 0.2, 0.4, 0.04],
      linesRead: 3,
    });
  });

  it('finds no words on a blank page', async () => {
    const { ports: p, sent } = ports({ text: { ...page, status: 'no_text', lines: [] } });
    expect(await readPhoto(p, speaker, 'paper', 'a')).toEqual({ kind: 'nothing', mode: 'paper' });
    expect(sent).toEqual([]);
  });

  it.each([
    { verdict: 'serious', crisis: false },
    { verdict: 'crisis', crisis: true },
  ] as const)(
    'answers $verdict words with plain company and no step',
    async ({ verdict, crisis }) => {
      const { ports: p } = ports({ api: { paper: () => Promise.resolve({ verdict }) } });
      const read = await readPhoto(p, speaker, 'paper', 'a');
      expect(read).toEqual({ kind: 'heavy', crisis });
      expect(gaveStep(read)).toBe(false);
    },
  );

  it('fails without throwing when the route does, and that is not a step', async () => {
    const { ports: p } = ports({ api: { paper: () => Promise.reject(new Error('down')) } });
    const read: CameraRead = await readPhoto(p, speaker, 'paper', 'a');
    expect(read).toEqual({ kind: 'failed' });
    expect(gaveStep(read)).toBe(false);
  });
});

describe('where a box lands on the screen', () => {
  it('scales with a photo cropped at the sides', () => {
    // A 4:3 photo on a tall phone is drawn 1040 wide and cropped to the middle 390.
    const rect = boxOnScreen(
      [0.5, 0.5, 0.1, 0.1],
      { width: 400, height: 300 },
      { width: 390, height: 780 },
    );
    expect(rect.top).toBeCloseTo(390);
    expect(rect.height).toBeCloseTo(78);
    expect(rect.left).toBeCloseTo(195);
    expect(rect.width).toBeCloseTo(104);
  });

  it('rings a box with a circle around its middle', () => {
    expect(ringAround({ left: 100, top: 100, width: 40, height: 20 }, 10)).toEqual({
      left: 90,
      top: 80,
      width: 60,
      height: 60,
    });
  });

  it('draws nothing for a photo with no size', () => {
    expect(
      boxOnScreen([0, 0, 1, 1], { width: 0, height: 0 }, { width: 390, height: 780 }).width,
    ).toBe(0);
  });
});
