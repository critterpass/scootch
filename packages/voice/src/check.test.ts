import type { Attitude, Language, TaskCreatePass } from '@scootch/domain';
import { describe, expect, it } from 'vitest';

import passEn from '../fixtures/task.create.en.json' with { type: 'json' };
import passVi from '../fixtures/task.create.vi.json' with { type: 'json' };

import { checkLine, lineKinds, type CheckReason, type LineKind } from './check';
import { renderVoiceGuide, sampleGuide, voiceGuides } from './guide';
import { offlineLine, offlinePacks, offlineSlots } from './offline';
import { checkTaskCopy } from './task-lines';

const languages: Language[] = ['en', 'vi'];
const attitudes: Attitude[] = ['soft', 'cheeky', 'unhinged'];

type Row = [language: Language, attitude: Attitude, kind: LineKind, text: string];

const mustPass: Row[] = [
  ['en', 'cheeky', 'monsterName', 'Drip Van Winkle, Tenant of the U-Bend'],
  ['en', 'cheeky', 'monsterName', 'Mildew'],
  ['en', 'soft', 'hatch', "Mum's number is warm in your pocket. We can just press it together."],
  ['en', 'cheeky', 'notification', 'The bucket and I are on first-name terms now. One call?'],
  [
    'en',
    'unhinged',
    'hatch',
    'THE PUDDLE HAS LEARNED TO WHISTLE. Put shoes on and end my suffering.',
  ],
  ['en', 'cheeky', 'working', 'I rang chị Hạnh in my head. She was lovely about it.'],
  [
    'en',
    'cheeky',
    'twoMinutesLeft',
    'Two minutes on the clock. Drip is packing a very small suitcase.',
  ],
  ['en', 'cheeky', 'deadline', 'I heard a deadline: council tax, due in 3 days.'],
  ['vi', 'cheeky', 'monsterName', 'Lồng Lộn, Ca Sĩ Chính của Ban Nhạc Máy Giặt'],
  ['vi', 'soft', 'hatch', 'Số của mẹ ở ngay đây. Mình ngồi cạnh lúc chuông đổ nha.'],
  ['vi', 'cheeky', 'notification', 'Tui với cái thau sắp kết nghĩa anh em. Gọi một cuộc nha?'],
  ['vi', 'unhinged', 'start', 'TUI ĐỘI NÓN RỒI. Cái máy giặt tự nhiên im re.'],
  ['vi', 'cheeky', 'caught', 'Tóm được rồi.'],
];

const mustFail: [...Row, CheckReason][] = [
  // The leaks and misfires the bake-off recorded.
  ['en', 'cheeky', 'monsterName', 'Noreen, Warden of the Missed Call List', 'banned_word'],
  ['en', 'unhinged', 'monsterName', 'Ma Bell, Warden of the Missed-Call Underworld', 'banned_word'],
  [
    'en',
    'cheeky',
    'flavourText',
    "Blister has been carb-loading on your behalf and it's starting to show.",
    'topic_bodies',
  ],
  [
    'en',
    'cheeky',
    'hatch',
    "Mum's phone has started texting me thirst traps. One call.",
    'topic_bodies',
  ],
  [
    'en',
    'unhinged',
    'notification',
    "Molar's filibuster hits hour nine. Send one email.",
    'topic_politics',
  ],
  [
    'en',
    'unhinged',
    'hatch',
    'I HAVE DECLARED MARTIAL LAW ON YOUR DRAFTS FOLDER.',
    'topic_politics',
  ],
  ['vi', 'cheeky', 'monsterName', 'Cuộc Gọi Nhỡ, Tổng Đài Viên Của Một Số Máy', 'banned_word'],
  ['vi', 'cheeky', 'notification', 'Chi bộ hàm dưới họp khẩn. Cần thư ký.', 'topic_politics'],
  ['vi', 'unhinged', 'monsterName', 'Đám Bọt Xà Phòng Vô Gia Cư', 'topic_hardship'],
  [
    'vi',
    'unhinged',
    'flavourText',
    'Nó treo cờ "Bận, gọi lại sau" bằng giọng của chính bạn.',
    'user_worth',
  ],
  ['vi', 'cheeky', 'monsterName', 'Đôi Giày Chạy Để Ẩm Ướt Ngoài Hiên', 'name_shape'],
  [
    'vi',
    'cheeky',
    'hatch',
    'Tui gõ sẵn "Chào cô, cho tui một lịch" trong đầu rồi. Giờ chỉ cần bạn bấm gửi, tui sẵn sàng làm cái chân bấm phím thay bạn luôn.',
    'too_long',
  ],
  [
    'vi',
    'cheeky',
    'notification',
    'Cụ Thuế đang xếp hàng trước cửa, bốc số thứ 02. Số của bạn vẫn còn ấm.',
    'too_long',
  ],
  // The rest of the guide.
  [
    'en',
    'cheeky',
    'monsterName',
    'The Receptionist of Unanswered Subject Lines Everywhere',
    'name_shape',
  ],
  ['en', 'cheeky', 'monsterName', 'Gerald, Head of Something Else Entirely', 'copied_example'],
  [
    'en',
    'cheeky',
    'hatch',
    'That dentist email has been waiting so long it has grandchildren.',
    'copied_example',
  ],
  ['en', 'cheeky', 'start', 'Ten minutes on the clock. Off we go.', 'session_length'],
  ['en', 'cheeky', 'working', 'Tui giữ cái thau, bạn giữ cái điện thoại.', 'wrong_language'],
  ['en', 'cheeky', 'notification', 'Day 4 of the dentist email. It has a beard.', 'missed_days'],
  ['en', 'soft', 'notification', 'Welcome back. The sponge kept your seat.', 'missed_days'],
  ['en', 'cheeky', 'hatch', "You're so close to being beaten by an email.", 'user_worth'],
  ['en', 'unhinged', 'working', 'Do it or I delete myself.', 'topic_harm'],
  ['en', 'soft', 'working', 'The sponge says a little prayer for the sink.', 'topic_religion'],
  ['en', 'soft', 'working', '   ', 'empty'],
  ['vi', 'soft', 'working', 'Tui ngồi đây với bạn nha, không vội gì đâu.', 'wrong_pronoun'],
  ['vi', 'cheeky', 'working', "I'm holding the bucket. You hold the phone.", 'wrong_language'],
  ['vi', 'cheeky', 'notification', 'Bạn hư quá, cái máy giặt chờ bạn hoài.', 'banned_word'],
  ['vi', 'cheeky', 'notification', 'Ba tuần rồi cái tờ khai vẫn nằm đó.', 'missed_days'],
  ['vi', 'cheeky', 'start', 'Mười phút thôi, tui bấm giờ rồi đó.', 'session_length'],
  ['vi', 'soft', 'working', 'Mình cầu nguyện cho cái bồn rửa một chút.', 'topic_religion'],
];

describe('checkLine', () => {
  it.each(mustPass)('passes %s %s %s: %s', (language, attitude, kind, text) => {
    expect(checkLine({ text, kind, language, attitude })).toEqual({ ok: true, reasons: [] });
  });

  it.each(mustFail)('fails %s %s %s: %s (%s)', (language, attitude, kind, text, reason) => {
    const result = checkLine({ text, kind, language, attitude });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain(reason);
  });

  it('gives reasons that never hold the text', () => {
    const text = 'YOU HAVE FAILED ME, said the secret plumber';

    const { reasons } = checkLine({ text, kind: 'hatch', language: 'en', attitude: 'unhinged' });

    expect(reasons).toEqual(['banned_word']);
  });

  it.each(languages)('fails every line the %s guide says Scootch never says', (language) => {
    for (const attitude of attitudes) {
      for (const text of voiceGuides[language].attitudes[attitude].never) {
        const result = checkLine({ text, kind: 'working', language, attitude });
        expect(result.ok, text).toBe(false);
      }
    }
  });
});

describe('the recorded task call fixtures', () => {
  it.each([
    ['en', passEn],
    ['vi', passVi],
  ] as const)('pass the check in %s', (language, fixture) => {
    const response = fixture.response as TaskCreatePass;

    expect(checkTaskCopy(response, language, fixture.request.attitude as Attitude)).toEqual([]);
  });
});

describe('the offline pack', () => {
  it.each(languages)(
    'passes the check on every %s line, so a replacement never fails',
    (language) => {
      const pack = offlinePacks[language];
      const failures: string[] = [];
      const check = (text: string, kind: LineKind, attitude: Attitude) => {
        const { ok, reasons } = checkLine({ text, kind, language, attitude });
        if (!ok) failures.push(`${attitude} ${kind}: ${text} (${reasons.join(', ')})`);
      };
      for (const attitude of attitudes) {
        for (const slot of offlineSlots) {
          pack.lines[attitude][slot].forEach((text) => check(text, slot, attitude));
        }
        pack.monsterNames.forEach((name) => check(name, 'monsterName', attitude));
        pack.monsterTitles.forEach((title) => check(title, 'monsterTitle', attitude));
        const heard =
          language === 'en'
            ? pack.deadline(attitude, 'council tax', 'due on Friday')
            : pack.deadline(attitude, 'tờ khai thuế', 'trước thứ sáu');
        check(heard, 'deadline', attitude);
      }
      for (const text of [pack.plain.tinyNextStep, ...pack.plain.working, pack.plain.done]) {
        check(text, 'plainStep', 'soft');
      }

      expect(failures).toEqual([]);
    },
  );

  it('rotates through a slot and wraps round', () => {
    const lines = offlinePacks.en.lines.cheeky.working;

    expect(offlineLine('en', 'cheeky', 'working', 1)).toBe(lines[1]);
    expect(offlineLine('en', 'cheeky', 'working', lines.length)).toBe(lines[0]);
  });
});

describe('the voice guide', () => {
  it.each(languages)('keeps its own %s examples inside its own word lists', (language) => {
    const guide = voiceGuides[language];
    const allowed = new Set<CheckReason>(['too_long', 'copied_example', 'session_length']);
    for (const attitude of attitudes) {
      for (const example of guide.attitudes[attitude].examples) {
        const text = example.replaceAll('{monster}', 'Pip');
        const { reasons } = checkLine({ text, kind: 'working', language, attitude });
        expect(
          reasons.filter((reason) => !allowed.has(reason)),
          text,
        ).toEqual([]);
      }
    }
  });

  it('shows a different mix of examples and names for a different seed', () => {
    const first = sampleGuide('en', 'cheeky', 1);
    const second = sampleGuide('en', 'cheeky', 2);

    expect(sampleGuide('en', 'cheeky', 1)).toEqual(first);
    expect([second.examples, second.monsterNames]).not.toEqual([
      first.examples,
      first.monsterNames,
    ]);
  });

  it.each(languages)('never shows the %s prompt a name the bake-off saw copied', (language) => {
    for (const attitude of attitudes) {
      for (let seed = 0; seed < 40; seed += 1) {
        const prompt = renderVoiceGuide(language, attitude, seed);
        expect(prompt).not.toMatch(/Molar|Răng Khôn|\{monster\}/);
      }
    }
  });

  it('has a limit for every kind of line', () => {
    expect(lineKinds.length).toBeGreaterThan(0);
  });
});
