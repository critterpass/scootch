import { describe, expect, it } from 'vitest';

import { resolveHeardDate } from './deadlines';
import { findDueDate } from './find-date';

// 6 October 2026 is a Tuesday.
const localDate = '2026-10-06';

function heard(heardAs: string, candidate = '', text = `I need to sort it ${heardAs} ok`) {
  return resolveHeardDate({ heardAs, candidate, text, localDate });
}

describe('resolveHeardDate', () => {
  it.each([
    ['due on Friday', '2026-10-09'],
    ['by tomorrow morning', '2026-10-07'],
    ['tonight', '2026-10-06'],
    ['in 3 days', '2026-10-09'],
    ['in two weeks', '2026-10-20'],
    ['by the 15th', '2026-10-15'],
    ['on the 2nd', '2026-11-02'],
    ['October 20', '2026-10-20'],
    ['by 3 January', '2027-01-03'],
    ['before the end of the month', '2026-10-31'],
    ['trước thứ sáu', '2026-10-09'],
    ['truoc thu sau', '2026-10-09'],
    ['thứ hai tuần sau', '2026-10-12'],
    ['chủ nhật tuần sau', '2026-10-18'],
    ['sáng mai', '2026-10-07'],
    ['hôm nay', '2026-10-06'],
    ['ba ngày nữa', '2026-10-09'],
    ['trước ngày 20', '2026-10-20'],
    ['ngày 5 tháng 11', '2026-11-05'],
    ['hạn 15/10', '2026-10-15'],
    ['cuối tháng', '2026-10-31'],
  ])('works out "%s" in code, whatever reading came with it', (heardAs, expected) => {
    expect(heard(heardAs, '2031-01-01')).toBe(expected);
    expect(heard(heardAs)).toBe(expected);
  });

  it('keeps a second reading only where the phrase allows two days', () => {
    expect(heard('next Friday', '2026-10-16')).toBe('2026-10-16');
    expect(heard('next Friday', '2026-10-09')).toBe('2026-10-09');
    expect(heard('next Friday', '2026-10-23')).toBeNull();
    expect(heard('by 3/4', '2027-04-03')).toBe('2027-04-03');
    expect(heard('by 3/4', '2027-03-04')).toBe('2027-03-04');
    expect(heard('by 3/4', '2026-12-25')).toBeNull();
  });

  it('chooses on its own on the phone, where there is no second reading', () => {
    // "Next Friday" is the Friday of next week; 3/4 is day first unless told otherwise.
    expect(heard('next Friday')).toBe('2026-10-16');
    expect(heard('by 3/4')).toBe('2027-04-03');
    expect(
      resolveHeardDate({
        heardAs: 'by 3/4',
        candidate: '',
        text: 'by 3/4',
        localDate,
        dayFirst: false,
      }),
    ).toBe('2027-03-04');
    expect(heard('sometime next week')).toBe('2026-10-12');
  });

  it.each([
    ['a phrase that is not in the text', 'due on Friday', '2026-10-09', 'call the plumber'],
    ['a phrase with no date in it', 'soon', '2026-10-09', undefined],
    ['a time of day alone', 'at 5pm', '2026-10-06', undefined],
    ['a month with no day', 'in October', '2026-10-31', undefined],
    ['a day that does not exist', 'ngày 31 tháng 11', '2026-11-31', undefined],
    ['an empty phrase', '', '2026-10-09', undefined],
    ['a date more than a year away', '5/10/2028', '2028-10-05', undefined],
    ['a date already gone', '1/10/2026', '2026-10-01', undefined],
  ])('gives no date for %s', (_, heardAs, candidate, text) => {
    expect(heard(heardAs, candidate, text)).toBeNull();
  });

  it('gives no date when today itself is not a real day', () => {
    expect(
      resolveHeardDate({
        heardAs: 'friday',
        candidate: '',
        text: 'friday',
        localDate: '2026-13-40',
      }),
    ).toBeNull();
  });
});

// 27 October 2026 is a Tuesday.
const today = '2026-10-27';

function due(text: string, dayFirst = true) {
  return findDueDate(text, { today, dayFirst });
}

describe('finding a due date in English', () => {
  it.each([
    ['email the landlord by Friday', '2026-10-30', 'by Friday'],
    ['call mum tomorrow', '2026-10-28', 'tomorrow'],
    ['pay the electricity bill today', '2026-10-27', 'today'],
    ['renew my passport next week', '2026-11-02', 'next week'],
    ['finish the report by next Friday', '2026-11-06', 'by next Friday'],
    ['submit the tax form by the 15th', '2026-11-15', 'by the 15th'],
    ['book the dentist for November 3', '2026-11-03', 'November 3'],
    ['send the invoice on 3 December', '2026-12-03', 'on 3 December'],
    ['return the library books in 3 days', '2026-10-30', 'in 3 days'],
    ["buy a gift for Sam's birthday on 12/11", '2026-11-12', 'on 12/11'],
    ['clean the garage this weekend', '2026-10-31', 'this weekend'],
    ['file the expenses before the end of the month', '2026-10-31', 'before the end of the month'],
    ['do the laundry tonight', '2026-10-27', 'tonight'],
    ['water the plants the day after tomorrow', '2026-10-29', 'the day after tomorrow'],
    ['pick up the parcel on Thursday', '2026-10-29', 'on Thursday'],
    ['fix the bike within two weeks', '2026-11-10', 'within two weeks'],
    ['start the essay next month', '2026-11-01', 'next month'],
    ['cancel the gym membership on Monday', '2026-11-02', 'on Monday'],
    ['call the bank on Tuesday', '2026-10-27', 'on Tuesday'],
    ['write the speech by Friday next week', '2026-11-06', 'by Friday next week'],
    ['order the cake by the 2nd of November', '2026-11-02', 'by the 2nd of November'],
    ['renew the car insurance by 30/11/2026', '2026-11-30', 'by 30/11/2026'],
    ['send the forms in a week', '2026-11-03', 'in a week'],
    ['pay the rent by the end of next month', '2026-11-30', 'by the end of next month'],
    ['clear the inbox by Wed', '2026-10-28', 'by Wed'],
    ['Book the MOT for 4.11.2026', '2026-11-04', '4.11.2026'],
    ['Visit Grandma on Sunday', '2026-11-01', 'on Sunday'],
  ])('"%s" is due %s', (text, date, heardAs) => {
    expect(due(text)).toMatchObject({ date, heardAs });
  });

  it('reads 12/11 month first when the region writes it that way', () => {
    expect(due("buy a gift for Sam's birthday on 12/11", false)?.date).toBe('2026-12-11');
  });

  it.each([
    'book the 3rd floor meeting room',
    'I sat down in the sun with a book',
    'read chapter 3.5 of the manual',
    'meeting at 10.30',
    'sort out my life',
    'may I call mum',
    'buy 2 sat nav cables',
  ])('finds no date in "%s"', (text) => {
    expect(due(text)).toBeNull();
  });
});

describe('finding a due date in Vietnamese', () => {
  it.each([
    ['nộp báo cáo trước thứ sáu', '2026-10-30', 'trước thứ sáu'],
    ['mai gọi cho mẹ', '2026-10-28', 'mai'],
    ['thứ hai tuần sau đi khám răng', '2026-11-02', 'thứ hai tuần sau'],
    ['chủ nhật dọn nhà', '2026-11-01', 'chủ nhật'],
    ['trả tiền điện hôm nay', '2026-10-27', 'hôm nay'],
    ['ngày mốt nộp hồ sơ', '2026-10-29', 'ngày mốt'],
    ['mốt đi lấy hàng', '2026-10-29', 'mốt'],
    ['ba ngày nữa trả sách thư viện', '2026-10-30', 'ba ngày nữa'],
    ['đóng học phí trước ngày 15', '2026-11-15', 'trước ngày 15'],
    ['ngày 5 tháng 11 họp phụ huynh', '2026-11-05', 'ngày 5 tháng 11'],
    ['hạn 20/11 nộp bài', '2026-11-20', 'hạn 20/11'],
    ['cuối tháng nộp thuế', '2026-10-31', 'cuối tháng'],
    ['cuối tuần dọn tủ quần áo', '2026-10-31', 'cuối tuần'],
    ['cuối tuần sau về quê', '2026-11-07', 'cuối tuần sau'],
    ['tuần sau gia hạn hộ chiếu', '2026-11-02', 'tuần sau'],
    ['tháng sau đăng ký học bơi', '2026-11-01', 'tháng sau'],
    ['t6 gửi hợp đồng', '2026-10-30', 't6'],
    ['tối nay giặt đồ', '2026-10-27', 'tối nay'],
    ['sáng mai đi chợ', '2026-10-28', 'sáng mai'],
    ['2 tuần nữa đi khám lại', '2026-11-10', '2 tuần nữa'],
    ['mùng 3 tháng 12 đi đám cưới', '2026-12-03', 'mùng 3 tháng 12'],
    ['thứ 7 này đi siêu thị', '2026-10-31', 'thứ 7'],
    ['vào thứ tư nộp đơn', '2026-10-28', 'vào thứ tư'],
    ['ngày kia đi ngân hàng', '2026-10-29', 'ngày kia'],
    ['trước 30/11 nộp thuế', '2026-11-30', 'trước 30/11'],
    ['nộp báo cáo cho sếp mai', '2026-10-28', 'mai'],
    ['Chủ Nhật tuần sau đi đám giỗ', '2026-11-08', 'Chủ Nhật tuần sau'],
  ])('"%s" is due %s', (text, date, heardAs) => {
    expect(due(text)).toMatchObject({ date, heardAs });
  });

  it.each([
    ['nop bao cao truoc thu sau', '2026-10-30'],
    ['mai goi cho me', '2026-10-28'],
    ['thu hai tuan sau di kham rang', '2026-11-02'],
    ['ngay 5 thang 11 hop phu huynh', '2026-11-05'],
    ['cuoi thang nop thue', '2026-10-31'],
    ['3 ngay nua tra sach', '2026-10-30'],
  ])('reads "%s", typed without marks, as due %s', (text, date) => {
    expect(due(text)?.date).toBe(date);
  });

  it.each([
    'gọi cho Mai',
    'gọi cho mai',
    'đi ăn với Mai',
    'lần thứ hai gọi cho ngân hàng',
    'mãi chưa xong bài luận',
    'việc thứ ba là dọn bếp',
    'mua một cái quạt',
    'ngày 31 tháng 11 nộp bài',
  ])('finds no date in "%s"', (text) => {
    expect(due(text)).toBeNull();
  });
});
