import type { Language } from '@scootch/domain';
import { describe, expect, it } from 'vitest';

import { checkLine, lineKinds } from './check';
import { offlinePacks, offlineSlots } from './offline';

const attitudes = ['soft', 'cheeky', 'unhinged'] as const;

// The app's controls: press and hold the button on screen to finish, "Smaller", "Park a thought".
const untrue: Readonly<Record<Language, readonly string[]>> = {
  en: [
    'Hold your phone steady to catch Peaches.',
    'Shake the phone to scare it off the shelf.',
    'Tilt your phone and it slides into the net.',
    'Swipe up to catch the monster.',
    'Say the password and the monster gives up.',
    'Point your camera at the sink and I will judge it.',
  ],
  vi: [
    'Giữ điện thoại thật yên để tóm nó.',
    'Lắc điện thoại để doạ nó đi.',
    'Nghiêng điện thoại cho nó trượt vô lưới.',
    'Vuốt lên để tóm con quái.',
    'Đọc mật khẩu là con quái đầu hàng.',
    'Chĩa camera vô bồn rửa cho tui chấm điểm.',
  ],
};

const trueEnough: Readonly<Record<Language, readonly string[]>> = {
  en: [
    'Time. Press and hold the button to catch Peaches.',
    "I'm holding the bucket. You hold the phone.",
    'The monster is shaking like a jelly. Hold to catch it.',
    'Tap "Smaller" if this step looks too big.',
    'Park a thought if one wanders in. I will mind it.',
  ],
  vi: [
    'Hết giờ. Nhấn giữ cái nút để tóm nó.',
    'Con quái đang lắc lư trên kệ. Giữ nút là tóm.',
    'Cầm điện thoại lên, bấm gọi thợ một cuộc.',
    'Bấm "Nhỏ hơn" nếu bước này còn to quá.',
    'Con mèo vuốt râu ngồi coi bạn gõ email.',
  ],
};

describe('instructions must be true', () => {
  it.each(['en', 'vi'] as const)('rejects a control the app does not have (%s)', (language) => {
    for (const text of untrue[language]) {
      const { reasons } = checkLine({ text, kind: 'timeUp', language, attitude: 'cheeky' });
      expect(reasons, text).toContain('untrue_control');
    }
  });

  it.each(['en', 'vi'] as const)(
    'leaves the real controls and plain talk alone (%s)',
    (language) => {
      for (const text of trueEnough[language]) {
        const { reasons } = checkLine({ text, kind: 'timeUp', language, attitude: 'cheeky' });
        expect(reasons, text).toEqual([]);
      }
    },
  );
});

describe('the treat line', () => {
  it('must leave room for the treat, or name the treat it was given', () => {
    const line = (text: string, treat?: string) =>
      checkLine({
        text,
        kind: 'treatHandOver',
        language: 'en',
        attitude: 'cheeky',
        ...(treat === undefined ? {} : { treat }),
      }).reasons;

    expect(line('A deal is a deal: {treat}. I only sniffed it once.')).toEqual([]);
    expect(line('A deal is a deal. Enjoy your reward.')).toEqual(['treat_not_named']);
    expect(line('A deal is a deal: a flat white. Enjoy.', 'A flat white')).toEqual([]);
    expect(line('A deal is a deal: a biscuit. Enjoy.', 'a flat white')).toEqual([
      'treat_not_named',
    ]);
  });
});

describe('the offline pack', () => {
  it('has a line that passes the check for every slot, attitude and language', () => {
    for (const language of ['en', 'vi'] as const) {
      for (const attitude of attitudes) {
        for (const slot of offlineSlots) {
          expect(lineKinds).toContain(slot);
          for (const text of offlinePacks[language].lines[attitude][slot]) {
            const { reasons } = checkLine({ text, kind: slot, language, attitude });
            expect(reasons, `${language} ${attitude} ${slot}`).toEqual([]);
          }
        }
      }
    }
  });
});
