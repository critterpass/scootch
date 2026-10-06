import { describe, expect, it } from '@jest/globals';

import { fixtureMonster, fixtureTask } from '../reveal/registry/keep-fixtures';
import { cardDataFor } from '../zoo/zoo-cards';

import { saveCatch, shareCatch, shareWeekClip, type ShareDevice } from './share-flow';
import { composeShareImage, type ShareImage } from './share-image';
import { shareOffered } from './share-rules';

const task = fixtureTask(0);
const card = cardDataFor(fixtureMonster(0), task);

/** A recorder standing in for the phone: what was drawn, written, shared and saved. */
function recorder(photos: 'saved' | 'refused' = 'saved') {
  const calls = {
    drawn: [] as ShareImage[],
    written: [] as string[],
    sheets: [] as string[],
    saved: [] as string[],
  };
  const device: ShareDevice = {
    renderPng: (image, name) => {
      calls.drawn.push(image);
      return Promise.resolve(`file:///${name}.png`);
    },
    writeFile: (name, bytes) => {
      calls.written.push(`${name}:${bytes.length}`);
      return Promise.resolve(`file:///${name}`);
    },
    openShareSheet: (uri, mimeType) => {
      calls.sheets.push(`${mimeType} ${uri}`);
      return Promise.resolve();
    },
    saveToPhotos: (uri) => {
      if (photos === 'saved') calls.saved.push(uri);
      return Promise.resolve(photos);
    },
  };
  return { calls, device };
}

const texts = (image: ShareImage) =>
  image.commands.flatMap((command) => (command.op === 'text' ? [command.text] : [])).join('\n');

describe('a shared picture', () => {
  it('carries the task line until it is hidden, and then none of it', () => {
    for (const kind of ['story', 'card'] as const) {
      const shown = composeShareImage(kind, card, { hideTask: false, language: 'en' });
      expect(texts(shown)).toContain('Email the dentist');
      const hidden = composeShareImage(kind, card, { hideTask: true, language: 'en' });
      expect(texts(hidden)).not.toContain('dentist');
      for (const word of task.text.split(' ').filter((one) => one.length > 3)) {
        expect(texts(hidden)).not.toContain(word);
      }
      // Everything else about the card is still there.
      expect(texts(hidden)).toContain(card.name);
    }
  });
});

describe('sharing a catch', () => {
  const share = { task, card, kind: 'story', hideTask: true, language: 'en' } as const;

  it('draws the picture and opens the share sheet', async () => {
    const { calls, device } = recorder();
    expect(await shareCatch(device, share)).toBe('shared');
    expect(calls.sheets).toEqual(['image/png file:///scootch-story-1.png']);
    expect(texts(calls.drawn[0]!)).not.toContain('dentist');
  });

  it('saves to Photos, or says the permission was refused', async () => {
    const allowed = recorder('saved');
    expect(await saveCatch(allowed.device, { ...share, kind: 'card' })).toBe('saved');
    expect(allowed.calls.saved).toEqual(['file:///scootch-card-1.png']);
    expect(await saveCatch(recorder('refused').device, share)).toBe('refused');
  });

  it('has no path for a private, serious, unscreened or forgotten task', async () => {
    const closed = [
      { ...task, sharePrivate: true },
      { ...task, screen: 'serious' as const },
      { ...task, screen: 'serious' as const, seriousOverridden: true },
      { ...task, screen: 'unscreened' as const },
      null,
    ];
    for (const one of closed) {
      expect(shareOffered(one)).toBe(false);
      const { calls, device } = recorder();
      expect(await shareCatch(device, { ...share, task: one })).toBe('not_offered');
      expect(await saveCatch(device, { ...share, task: one })).toBe('not_offered');
      expect(calls).toEqual({ drawn: [], written: [], sheets: [], saved: [] });
    }
    expect(shareOffered(task)).toBe(true);
    expect(shareOffered({ ...task, sharePrivate: null })).toBe(true);
  });

  it("sends the week's clip as an audio file of its own", async () => {
    const { calls, device } = recorder();
    const silence = {
      sampleRate: 44100,
      left: new Float32Array(100),
      right: new Float32Array(100),
    };
    expect(await shareWeekClip(device, silence, '2026-W41')).toBe('shared');
    expect(calls.written).toEqual(['scootch-2026-W41.wav:444']);
    expect(calls.sheets).toEqual(['audio/wav file:///scootch-2026-W41.wav']);
  });
});
