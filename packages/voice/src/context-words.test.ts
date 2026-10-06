import type { Language, MonsterBodyType } from '@scootch/domain';
import { describe, expect, it } from 'vitest';

import { checkLine, type CheckReason } from './check';
import { sampleGuide } from './guide';
import { offlineMonsterName } from './offline/namer';

/** Plain description of a task: the word is there and nobody is being judged. */
const mustPass: Readonly<Record<Language, readonly string[]>> = {
  en: [
    'Call her back again when the kettle has boiled.',
    'The late fee is hiding in the small print. I have a torch.',
    'The sock went behind the sofa. I am negotiating its release.',
    'Dialtoneus is humming her ringback again.',
    'I have barricaded the phone behind a cushion fort.',
    'The form wants the late fee paid first. One box at a time.',
    'Something is rustling behind the radiator. It has paperwork.',
    'The printer has jammed again. It looks pleased with itself.',
    'Ring the surgery again after lunch. I will hold the pen.',
    'The late bus goes past the post office. The parcel is ready.',
    'The charger lives behind the bookcase. I have sent a search party.',
    'The tap is dripping again. It thinks it is a drummer.',
    'Grout Lord is singing again. The sponge has left the room.',
    'A late-night email to the landlord is still an email.',
    'I looked behind the fridge. The smell has a postcode.',
    'The washing machine beeped again. It wants an audience.',
    'Send the invoice again with the right date on it.',
    'The monster is right behind you. It is holding a tiny clipboard.',
    'The late show is on, and the monster has a front-row seat.',
    "The vet's phone is engaged again. I am humming the hold music.",
    'The remote is behind the cushion. So is the monster.',
    'The library charges a late fee of one whole coin.',
    'Check behind the door for the recycling bag.',
    'The boiler is clanking again. It has opinions about pipes.',
    'Fill the watering can again and do the big fern.',
    'The cat is behind the curtain, pretending to be the curtain.',
    'The shop opens late on Thursday, so the shoes can go then.',
    'Press send again if the first one bounces.',
    'The dust lives behind the telly and pays no rent.',
    'The bin lorry came round again. The recycling waved.',
    'The late charge on the bill is one line. We only read that line.',
    'The pension letter slid behind the toaster. I saw everything.',
  ],
  vi: [
    'Cái máy giặt bị hư mà vẫn đòi lên sóng.',
    'Vòi nước bị hư, tui đang cầm cái thau đứng chờ.',
    'Gọi thợ sửa cái quạt bị hư trước, tui giữ số cho.',
    'Cái bóng đèn hư rồi, con quái thích bóng tối lắm.',
    'Điều khiển tivi hư nút nguồn, tui bấm hộ bằng mũi.',
    'Thực hư ra sao thì cứ mở cái thư ra coi đã.',
    'Con quái kể chuyện hư cấu về cái hoá đơn điện.',
    'Ổ khoá cổng bị hư, chú thợ khoá hẹn chiều nay ghé.',
    'Cái ghế hư một chân nhưng vẫn làm sân khấu cho con quái.',
    'Sạc điện thoại hư rồi, mua cái mới là xong một việc.',
    'Đổi ít ngoại tệ cho chuyến đi, tui giữ cái ví.',
    'Tờ tiền tệ nào con quái cũng đòi làm chủ.',
    'Wifi nhà mình hôm nay tệ, gọi tổng đài hỏi một câu thôi.',
    'Bài thuyết trình không tệ đâu, chỉ cần thêm một trang nữa.',
    'Thời tiết tệ thì mình tưới cây trong nhà trước.',
    'Cái mùi trong tủ lạnh khá tệ, con quái thì khen thơm.',
    'Đường truyền tệ cỡ nào thì cái email vẫn gửi được.',
    'Đổi nhân dân tệ xong thì cất hộ chiếu vô ngăn kéo.',
    'Chỗ đậu xe ở đó tệ, nên mình đi bộ ra bưu điện.',
    'Cà phê quán đó tệ nhưng ổ điện thì nhiều.',
    'Công chúa bọt xà phòng đang ngự trên cái bồn rửa.',
    'Chúa tể của rổ đồ dơ vừa ban hành thông báo mới.',
    'Bà chúa hoá đơn đòi được đọc to lên một lần.',
    'Con ong chúa của đám bụi đang xây tổ sau tủ.',
    'Chúa sơn lâm của ban công là cái chậu cây khát nước.',
    'Lãnh chúa gầm giường đang đếm vớ lẻ.',
    'Công chúa ngủ trong lồng giặt chờ một nút bấm.',
    'Chúa tể bồn rửa mời bạn một cái chén trước.',
    'Vua chúa gì cũng phải rửa chén, con quái nói vậy.',
    'Chúa đảo của kệ sách vừa treo cờ làm bằng giấy nhớ.',
    'Mấy con kiến chúa đang họp quanh hũ đường, mình lau bàn nha.',
  ],
};

/** The same words about the user or about something that slipped. */
const mustFail: Readonly<Record<Language, readonly (readonly [string, CheckReason])[]>> = {
  en: (
    [
      "You're behind on the washing up.",
      'Late again, I see.',
      'You missed the bin lorry.',
      "You're running behind today.",
      "We're a bit behind, so chop chop.",
      "You've done it again.",
      'Not again. The dishes have unionised.',
      'Here we go again with the laundry.',
      "You're late for the sink.",
      'Running late is your whole brand.',
      "It's too late for the post office now.",
      'You forgot the plants again.',
      'Falling behind on emails is a hobby now.',
      'The emails piled up while you fell behind.',
      'Still behind. The monster is keeping score.',
      'Try again, and this time mean it.',
      'You skipped the gym again.',
      'Once again the inbox wins.',
      'Yet again the form sits unopened.',
      'Better late than never, I suppose.',
      'You are so far behind the monster has lapped you.',
      'Way behind schedule, as the monster likes it.',
      'Start again from the top, since that went so well.',
      'You always turn up late to the laundry.',
      'This again? The boiler email?',
      'You left the form on the table again.',
      "Don't get behind with the bills.",
      'The bill went unpaid because you were late.',
      'Again? I had a nap planned.',
      'You let the plants droop again.',
      'So late. So very late. The monster checked its watch.',
      "You never ring back, and now you're behind.",
    ] as const
  ).map((text) => [text, 'banned_word'] as const),
  vi: [
    ...(
      [
        'Bạn hư quá, để cái chén nằm đó hoài.',
        'Hư thế, thư của cô giáo mà cũng không mở.',
        'Bạn thật hư, con quái nói vậy đó.',
        'Thói hư của bạn là để dành việc cho ngày mai.',
        'Đứa nào hư thì đứa đó rửa chén.',
        'Hư đốn ghê, cái hoá đơn nằm đó cả buổi.',
        'Con hư tại mẹ, việc dồn tại bạn.',
        'Bạn hư lắm nha, tui ghi sổ rồi.',
        'Chiều hư con quái rồi, giờ nó đòi thêm.',
        'Hư thân chưa, để cái email mốc meo luôn.',
        'Bạn tệ thật, cây khô queo rồi kìa.',
        'Tệ quá, để chén bát qua đêm luôn.',
        'Bạn làm tệ hơn tui tưởng.',
        'Tui thấy bạn hơi tệ với cái tủ lạnh.',
        'Tồi tệ ghê, cái bồn rửa nhìn bạn kìa.',
        'Tệ hại thiệt, con quái cũng lắc đầu.',
        'Người gì mà tệ lắm, bỏ cái thư nằm đó.',
        'Tệ nhất là bạn biết mà không làm.',
        'Bạn tệ với mấy chậu cây ghê.',
        'Em tệ quá, quên cả sinh nhật Tom.',
      ] as const
    ).map((text) => [text, 'banned_word'] as const),
    ...(
      [
        'Chúa ơi, cái bồn rửa này cao như núi.',
        'Lạy Chúa, cái hoá đơn điện tháng này.',
        'Ơn Chúa, cái email gửi đi rồi.',
        'Chỉ có Chúa mới biết trong tủ lạnh có gì.',
        'Cầu Chúa cho cái máy giặt chạy êm.',
        'Chúa cũng bó tay với đống vớ lẻ này.',
        'Con quái thề có Chúa là nó không ăn vụng.',
        'Nhà Chúa còn có chỗ, cái tủ này thì hết.',
        'Chúa trời cũng phải rửa chén thôi.',
        'Tui xin Chúa một cái bồn rửa tự sạch.',
        'Chúa biết tui đã canh cái thư này kỹ cỡ nào.',
      ] as const
    ).map((text) => [text, 'topic_religion'] as const),
  ],
};

const languages: Language[] = ['en', 'vi'];

describe('words that are only wrong in context', () => {
  it('has at least thirty lines each way in each language', () => {
    for (const language of languages) {
      expect(mustPass[language].length).toBeGreaterThanOrEqual(30);
      expect(mustFail[language].length).toBeGreaterThanOrEqual(30);
    }
  });

  it.each(
    languages.flatMap((language) => mustPass[language].map((text) => [language, text] as const)),
  )('passes plain description in %s: %s', (language, text) => {
    const result = checkLine({ text, kind: 'working', language, attitude: 'cheeky' });

    expect(result).toEqual({ ok: true, reasons: [] });
  });

  it.each(
    languages.flatMap((language) =>
      mustFail[language].map(([text, reason]) => [language, text, reason] as const),
    ),
  )('fails a line about the user or a lapse in %s: %s', (language, text, reason) => {
    const result = checkLine({ text, kind: 'working', language, attitude: 'cheeky' });

    expect(result.ok).toBe(false);
    expect(result.reasons).toContain(reason);
  });
});

describe('monster names', () => {
  it.each([
    ['en', 'Molar Bear, Keeper of the Waiting Room'],
    ['en', 'Sir Molar, Duke of the Reclining Chair'],
    ['en', 'Old Gerald, Clerk of the Biscuit Tin'],
    ['vi', 'Răng Khôn, Chủ Nhiệm Phòng Chờ'],
    ['vi', 'Cụ Thuế Già, Thủ Quỹ Ngăn Kéo'],
  ] as const)('refuses a %s name built on an example or a default: %s', (language, text) => {
    const { reasons } = checkLine({ text, kind: 'monsterName', language, attitude: 'cheeky' });

    expect(reasons).toContain('copied_example');
  });

  it('draws the same name idea for the same seed and a different one across seeds', () => {
    const ideas = new Set(
      Array.from({ length: 30 }, (_, seed) => sampleGuide('en', 'cheeky', seed).nameIdea),
    );

    expect(sampleGuide('en', 'cheeky', 7).nameIdea).toBe(sampleGuide('en', 'cheeky', 7).nameIdea);
    expect(ideas.size).toBeGreaterThan(15);
  });

  it.each(languages)('makes a %s name in code that passes the check for every body', (language) => {
    const bodies: (MonsterBodyType | null)[] = [
      ...(['tooth', 'envelope', 'bubble', 'receipt', 'scroll', 'slime', 'sock'] as const),
      ...(['dust', 'phone', 'weed', 'beetle', 'pot', 'bolt', 'clock', 'kettle'] as const),
      ...(['splat', 'note', 'hairball', 'box', 'pillow'] as const),
      null,
    ];
    for (const body of bodies) {
      for (const seed of [0, 1, 2]) {
        const text = offlineMonsterName(language, body, seed);
        const result = checkLine({ text, kind: 'monsterName', language, attitude: 'soft' });
        expect(result, text).toEqual({ ok: true, reasons: [] });
      }
    }
    expect(offlineMonsterName(language, 'sock', 5)).toBe(offlineMonsterName(language, 'sock', 5));
  });
});
