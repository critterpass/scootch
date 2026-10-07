import { describe, expect, it } from 'vitest';

import { asksToChoose } from './choose';

describe('asking Scootch to choose, as the phone hears it by itself', () => {
  it.each([
    'pick for me',
    'Pick for me.',
    'Scootch, pick for me please',
    'you choose',
    'just pick one',
    'anything',
    'surprise me!',
    'chọn giúp mình',
    'Chọn giúp mình đi',
    'chon giup minh',
    'gì cũng được',
    'tùy bạn',
  ])('takes "%s" as a request to choose', (text) => {
    expect(asksToChoose(text)).toBe(true);
  });

  it.each([
    'pick up the parcel',
    'choose a dentist',
    'pick for me a present for mum',
    'decide on the holiday dates',
    'anything but the tax return',
    'email the dentist',
    'chọn quà sinh nhật cho mẹ',
    'gì cũng được miễn là xong báo cáo',
    '',
    '   ',
  ])('leaves "%s" alone: it names something to do, or nothing at all', (text) => {
    expect(asksToChoose(text)).toBe(false);
  });
});
