import { describe, expect, it } from '@jest/globals';

import { fromNativeModule, getReading } from '../index';
import type {
  NativeRecognition,
  NativeScootchReadingModule,
  NativeThings,
} from '../src/ScootchReadingModule';

const flat = { blur: 310, glare: 0.002, curvature: 0.4, clipped: 0 };

/** The native module is the boundary: a recording stand-in answering like the phone would. */
function fakeNative(answers: { recognition?: NativeRecognition; things?: NativeThings }) {
  const calls: unknown[][] = [];
  const native = {
    recognizeText: (uri: string, languages: readonly string[]) => {
      calls.push(['recognizeText', uri, languages]);
      return Promise.resolve(answers.recognition);
    },
    findThings: (uri: string) => {
      calls.push(['findThings', uri]);
      return Promise.resolve(answers.things);
    },
  } as unknown as NativeScootchReadingModule;
  return { native, calls };
}

describe('scootch-reading', () => {
  it('is absent from a binary built without the module', () => {
    expect(getReading()).toBeNull();
  });

  it('orders the recognised lines and passes each language hint once', async () => {
    const { native, calls } = fakeNative({
      recognition: {
        observations: [
          { text: 'Nguyễn Văn A', bbox: [0.55, 0.4, 0.3, 0.03], conf: 0.97 },
          { text: 'Họ và tên', bbox: [0.1, 0.4, 0.3, 0.03], conf: 0.88 },
          { text: 'TỜ KHAI', bbox: [0.3, 0.1, 0.4, 0.05], conf: 0.99 },
        ],
        signals: flat,
        width: 1200,
        height: 1600,
      },
    });
    const result = await fromNativeModule(native).recognizeText('file:///form.jpg', {
      languages: ['vi', 'en', 'vi'],
    });
    expect(calls).toEqual([['recognizeText', 'file:///form.jpg', ['vi', 'en']]]);
    expect(result).toEqual({
      status: 'ok',
      lines: [
        { id: 'l0', text: 'TỜ KHAI', bbox: [0.3, 0.1, 0.4, 0.05], conf: 0.99 },
        { id: 'l1', text: 'Họ và tên', bbox: [0.1, 0.4, 0.3, 0.03], conf: 0.88 },
        { id: 'l2', text: 'Nguyễn Văn A', bbox: [0.55, 0.4, 0.3, 0.03], conf: 0.97 },
      ],
      signals: flat,
      quality: null,
      width: 1200,
      height: 1600,
    });
  });

  it('calls a page with nothing legible no_text and keeps unmeasured signals quiet', async () => {
    const { native } = fakeNative({
      recognition: {
        observations: [{ text: '  ', bbox: [0.1, 0.1, 0.1, 0.1], conf: 0.2 }],
        signals: { blur: 250, glare: 0, curvature: Number.NaN, clipped: Number.NaN },
        width: 800,
        height: 800,
      },
    });
    const result = await fromNativeModule(native).recognizeText('file:///blank.jpg');
    expect(result.status).toBe('no_text');
    expect(result.lines).toEqual([]);
    expect(result.quality).toBeNull();
  });

  it('names the quality problem from the raw signals', async () => {
    const { native } = fakeNative({
      recognition: {
        observations: [{ text: 'Box 3', bbox: [0.1, 0.8, 0.5, 0.03], conf: 0.6 }],
        signals: { ...flat, blur: 12 },
        width: 1200,
        height: 1600,
      },
    });
    await expect(fromNativeModule(native).recognizeText('file:///b.jpg')).resolves.toMatchObject({
      quality: 'blurry',
    });
  });

  it('numbers the things found, keeps their boxes in the photo and their names plain', async () => {
    const { native, calls } = fakeNative({
      things: {
        things: [
          { bbox: [0.6, 0.5, 0.12, 0.12], labels: ['coffee_cup', 'Mug', 'mug', ' '] },
          { bbox: [0.9, -0.1, 0.3, 0.4], labels: [] },
          { bbox: [0.2, 0.2, 0, 0.1], labels: ['paper'] },
        ],
        brightness: 0.55,
        width: 1536,
        height: 1152,
      },
    });
    const result = await fromNativeModule(native).findThings('file:///desk.jpg');
    expect(calls).toEqual([['findThings', 'file:///desk.jpg']]);
    expect(result.tooDark).toBe(false);
    expect(result.things).toHaveLength(2);
    expect(result.things[0]).toEqual({
      id: 't0',
      box: [0.6, 0.5, 0.12, 0.12],
      labels: ['coffee cup', 'mug'],
    });
    expect(result.things[1]?.id).toBe('t1');
    expect(result.things[1]?.box[0]).toBe(0.9);
    expect(result.things[1]?.box[1]).toBe(0);
    expect(result.things[1]?.box[2]).toBeCloseTo(0.1);
  });

  it('says a photo is too dark only when the light was measured and is low', async () => {
    const dark = fakeNative({ things: { things: [], brightness: 0.04, width: 8, height: 8 } });
    const unmeasured = fakeNative({
      things: { things: [], brightness: Number.NaN, width: 8, height: 8 },
    });
    await expect(fromNativeModule(dark.native).findThings('a')).resolves.toMatchObject({
      tooDark: true,
    });
    await expect(fromNativeModule(unmeasured.native).findThings('a')).resolves.toMatchObject({
      tooDark: false,
    });
  });
});
