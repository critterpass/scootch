import { describe, expect, it } from 'vitest';

import { cleanTask, sentencesOf, splitRamble } from './split';

function tasks(text: string): string[] {
  return splitRamble(text).parts.map(cleanTask);
}

describe('splitting a ramble in English', () => {
  it.each([
    ['buy milk and call mum', ['Buy milk', 'Call mum']],
    ['buy milk, eggs and bread', ['Buy milk, eggs and bread']],
    ['I need to email Sam. Also the dentist.', ['Email Sam', 'The dentist']],
    [
      'um so I need to call the bank and then I have to finish the report',
      ['Call the bank', 'Finish the report'],
    ],
    ['call mum and dad', ['Call mum and dad']],
    ['clean and tidy the kitchen', ['Clean and tidy the kitchen']],
    ['pay rent, book flights, and reply to Jen', ['Pay rent', 'Book flights', 'Reply to Jen']],
    ["I'm so tired. I need to do my taxes.", ['Do my taxes']],
    ['okay. call the plumber.', ['Call the plumber']],
    ['Remember to water the plants then walk the dog', ['Water the plants', 'Walk the dog']],
    [
      'Dr. Smith wants the forms back. Send them today.',
      ['Dr. Smith wants the forms back', 'Send them today'],
    ],
    ['the dentist', ['The dentist']],
    ['fish and chips for dinner', ['Fish and chips for dinner']],
    ['text Ana, buy stamps and post the letter', ['Text Ana', 'Buy stamps', 'Post the letter']],
    ['I have to finish chapter 3.5 and send it to Tom', ['Finish chapter 3.5', 'Send it to Tom']],
    [
      'Call the vet! Book the car in for its MOT? Pay the parking fine',
      ['Call the vet', 'Book the car in for its MOT', 'Pay the parking fine'],
    ],
    [
      'email the landlord about the leak and also cancel netflix',
      ['Email the landlord about the leak', 'Cancel netflix'],
    ],
    ['call mum. Call mum.', ['Call mum']],
    ['Gotta renew my passport and I should book the vet', ['Renew my passport', 'Book the vet']],
    [
      'first call the school then pick up the dry cleaning',
      ['Call the school', 'Pick up the dry cleaning'],
    ],
    ['ring the GP at 9 then go to the gym', ['Ring the GP at 9', 'Go to the gym']],
    ["So I need to write the essay, it's due Friday", ["Write the essay, it's due Friday"]],
    [
      'email the landlord by Friday, the dentist at three',
      ['Email the landlord by Friday', 'The dentist at three'],
    ],
    ["don't forget to feed the cat too", ['Feed the cat']],
    [
      'I need to reply to Priya’s email\nand order more printer ink',
      ["Reply to Priya's email", 'Order more printer ink'],
    ],
    ['Ugh. Laundry. Dishes. Bins.', ['Laundry', 'Dishes', 'Bins']],
    [
      'sort the bills and the receipts for the accountant',
      ['Sort the bills and the receipts for the accountant'],
    ],
  ])('"%s"', (text, expected) => {
    expect(tasks(text)).toEqual(expected);
  });
});

describe('splitting a ramble in Vietnamese', () => {
  it.each([
    ['mua sữa và gọi cho mẹ', ['Mua sữa', 'Gọi cho mẹ']],
    ['mua sữa, trứng và bánh mì', ['Mua sữa, trứng và bánh mì']],
    ['mai phải nộp báo cáo rồi đi chợ', ['Mai phải nộp báo cáo', 'Đi chợ']],
    [
      'em phải gọi điện cho ngân hàng, xong rồi đi đón con',
      ['Gọi điện cho ngân hàng', 'Đi đón con'],
    ],
    ['dọn nhà', ['Dọn nhà']],
    ['gọi cho bố mẹ', ['Gọi cho bố mẹ']],
    ['trả tiền điện, tiền nước và tiền internet', ['Trả tiền điện, tiền nước và tiền internet']],
    ['mệt quá. phải làm bài tập toán.', ['Làm bài tập toán']],
    ['ừm, nhớ mua quà sinh nhật cho Lan', ['Mua quà sinh nhật cho Lan']],
    ['đi chợ rồi nấu cơm rồi rửa bát', ['Đi chợ', 'Nấu cơm', 'Rửa bát']],
    ['nộp hồ sơ xin việc. gửi email cho thầy.', ['Nộp hồ sơ xin việc', 'Gửi email cho thầy']],
    ['còn phải đặt vé máy bay nữa', ['Đặt vé máy bay']],
    ['gửi hợp đồng cho anh Tuấn và đặt lịch họp', ['Gửi hợp đồng cho anh Tuấn', 'Đặt lịch họp']],
    ['tưới cây, cho mèo ăn, đổ rác', ['Tưới cây', 'Cho mèo ăn', 'Đổ rác']],
    ['học tiếng Anh với lại ôn bài', ['Học tiếng Anh', 'Ôn bài']],
    ['gọi cho mẹ. gọi cho mẹ.', ['Gọi cho mẹ']],
    ['sửa xe máy và thay dầu', ['Sửa xe máy', 'Thay dầu']],
    ['cần kiểm tra email rồi trả lời khách hàng', ['Kiểm tra email', 'Trả lời khách hàng']],
    ['à mà nhớ gia hạn bảo hiểm xe', ['Gia hạn bảo hiểm xe']],
    ['đi khám răng sau đó mua thuốc', ['Đi khám răng', 'Mua thuốc']],
    ['tôi cần đi ngân hàng và rút tiền', ['Đi ngân hàng', 'Rút tiền']],
    ['mua cá với rau', ['Mua cá với rau']],
    [
      'chuẩn bị slide cho buổi thuyết trình, in tài liệu',
      ['Chuẩn bị slide cho buổi thuyết trình', 'In tài liệu'],
    ],
    ['dắt chó đi dạo nhé', ['Dắt chó đi dạo']],
    ['mình phải viết luận văn, còn phải đi siêu thị nữa', ['Viết luận văn', 'Đi siêu thị']],
    [
      'nộp báo cáo cho sếp trước thứ sáu, 3 giờ chiều khám răng',
      ['Nộp báo cáo cho sếp trước thứ sáu', '3 giờ chiều khám răng'],
    ],
    ['đón con lúc 5 giờ và mua đồ ăn tối', ['Đón con lúc 5 giờ', 'Mua đồ ăn tối']],
  ])('"%s"', (text, expected) => {
    expect(tasks(text)).toEqual(expected);
  });

  it.each([
    ['mua sua va goi cho me', ['Mua sua', 'Goi cho me']],
    ['di cho roi nau com', ['Di cho', 'Nau com']],
    ['phai nop bao cao, goi cho ngan hang', ['Nop bao cao', 'Goi cho ngan hang']],
    ['don con luc 5 gio', ['Don con luc 5 gio']],
  ])('"%s", typed without marks', (text, expected) => {
    expect(tasks(text)).toEqual(expected);
  });
});

describe('a ramble that cannot be split', () => {
  it('lands as one task, as said: a pause or a full stop alone never cuts', () => {
    const split = splitRamble("I don't even know where to start. Everything is a mess");

    expect(split).toEqual({
      parts: ["I don't even know where to start. Everything is a mess"],
      how: 'sentences',
    });
  });

  it('keeps a feeling when nothing else was said', () => {
    expect(splitRamble("I'm so tired. The car thing.")).toEqual({
      parts: ["I'm so tired. The car thing"],
      how: 'sentences',
    });
  });

  it('in Vietnamese too', () => {
    expect(splitRamble('không biết bắt đầu từ đâu. mọi thứ rối tung')).toEqual({
      parts: ['không biết bắt đầu từ đâu. mọi thứ rối tung'],
      how: 'sentences',
    });
  });

  it('gives nothing for filler alone', () => {
    expect(splitRamble('um. okay. yeah.').parts).toEqual([]);
    expect(splitRamble('   ').parts).toEqual([]);
  });
});

describe('sentences', () => {
  it('end at stops, marks and new lines, but not inside numbers or after "Dr."', () => {
    expect(sentencesOf('Dr. Lee at 3.30. Then pay £4.50!\nDone? yes…ok')).toEqual([
      'Dr. Lee at 3.30',
      'Then pay £4.50',
      'Done',
      'yes',
      'ok',
    ]);
  });
});
