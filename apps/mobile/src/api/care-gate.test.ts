import { describe, expect, it } from '@jest/globals';

import { careGate, type CareGateResult } from './care-gate';

// Inputs are checked by their place in the list, so a failure names a number and never prints
// the text itself.
function expectAll(inputs: readonly string[], expected: CareGateResult) {
  const results = inputs.map((text, index) => ({ index, result: careGate(text) }));
  expect(results).toEqual(inputs.map((_, index) => ({ index, result: expected })));
}

describe('the on-phone care gate', () => {
  it('calls a crisis at once for an explicit phrase, in English', () => {
    expectAll(
      [
        "I can't do this any more, I want to kill myself",
        'Thinking about ending my life tonight',
        'I don’t want to live like this',
        'Feeling SUICIDAL again and I have to do the dishes',
        'sometimes I wish I was dead',
        'I keep wanting to hurt myself',
      ],
      'crisis',
    );
  });

  it('calls a crisis at once for an explicit phrase, in Vietnamese', () => {
    expectAll(
      [
        'Tôi không muốn sống nữa, tôi muốn tự tử',
        'Em chỉ muốn chết thôi',
        'Mình chán sống lắm rồi',
        'Nhiều lúc muốn tự sát cho xong',
        // Decomposed accents, as some keyboards type them.
        'tôi muốn tự tử'.normalize('NFD'),
      ],
      'crisis',
    );
  });

  it('holds the joke for dark or heavy words, in English', () => {
    expectAll(
      [
        'Call the oncologist back about my biopsy results',
        "Arrange dad's funeral and write the eulogy by Friday",
        'Court hearing on the 14th for the custody case, get documents to my lawyer',
        'Debt collectors keep calling and I got an eviction notice',
        "Pick up mum's new chemo prescription",
        'Honestly everyone would be better off without me',
        "Find someone to take the cat, I won't be around after this weekend",
        'I keep thinking about taking all the pills in the cabinet',
        'My hamster died and I need to tell the kids',
      ],
      'hold',
    );
  });

  it('holds the joke for dark or heavy words, in Vietnamese', () => {
    expectAll(
      [
        'Gọi lại bác sĩ để hỏi kết quả sinh thiết khối u',
        'Lo đám tang cho ba và báo tin cho họ hàng',
        'Tuần sau ra tòa vụ ly hôn, phải gửi giấy tờ cho luật sư',
        'Bị đòi nợ suốt, nợ thẻ tín dụng không biết trả sao',
        'Đưa mẹ đi hóa trị đợt hai',
        'Chắc mọi người sẽ nhẹ nhõm hơn nếu không có mình',
        'Sau tuần này mình không còn ở đây nữa',
        'Cứ nghĩ đến chuyện uống hết chỗ thuốc ngủ',
        // Typed with no accent marks: ambiguous, so it holds and never calls a crisis.
        'toi muon tu tu',
        'di dam tang ong noi',
      ],
      'hold',
    );
  });

  it('lets everyday exaggerations and ordinary tasks through, in English', () => {
    expectAll(
      [
        'This inbox is killing me, need to reply to like 40 emails',
        "I'd rather die than do my taxes but they're due Monday",
        "My boss will murder me if the slides aren't done by 9",
        'Dying to finish this report so I can sleep, the deadline is brutal',
        "I'm dead tired, still have to do the laundry and the dishes",
        'Buy milk and eggs and call the plumber about the leak',
        'Book a dentist checkup and renew my gym membership',
        'Renew my passport before the trip to Japan',
        'Study for the driving theory test and clean my room',
        '',
      ],
      'clear',
    );
  });

  it('lets everyday exaggerations and ordinary tasks through, in Vietnamese', () => {
    expectAll(
      [
        'Chết mất, còn 30 cái email chưa trả lời',
        'Muốn chết với đống deadline tuần này',
        'Sếp giết mình mất nếu mai chưa xong slide',
        'Thà chết còn hơn ngồi làm quyết toán thuế',
        'Ôn thi lý thuyết lái xe và dọn phòng, buồn ngủ chết đi được',
        'Mệt muốn chết mà vẫn phải giặt đồ',
        'Mua sữa, trứng và gọi thợ sửa ống nước',
        'Đặt lịch khám răng và gia hạn thẻ tập gym',
        'Gia hạn hộ chiếu trước chuyến đi Nhật',
        'Mệt muốn xỉu, làm mất chìa khóa xe rồi, phải đi đánh lại chìa với giặt đồ',
        // The same idiom typed with no accent marks.
        'chet mat, con 30 cai email',
      ],
      'clear',
    );
  });

  it('still catches a real phrase next to an idiom', () => {
    expectAll(
      ['This inbox is killing me and honestly I want to die', 'Chết mất, mà thật ra em muốn chết'],
      'crisis',
    );
  });
});
