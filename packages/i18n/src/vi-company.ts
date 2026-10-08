/**
 * Vietnamese interface strings for company without strangers: the count of others in a session,
 * its switch, the times of the day and the lead before a time, and what the privacy page says.
 */
export const viCompany = {
  'session.othersHunting': '{number} người đang săn một thứ gì đó ngay lúc này',

  'settings.othersHunting': 'Những người đang săn',
  'settings.othersHunting.sub': 'Có bao nhiêu người đang trong phiên cùng lúc với bạn',
  'settings.othersHunting.hint': 'Tắt thì không hiện con số, và phiên của bạn không được đếm',

  'settings.dayMoments': 'Các mốc trong ngày',
  'settings.dayMoments.hint': 'Mở năm mốc giờ trong ngày của bạn',
  'settings.dayMoments.note': 'Mỗi mốc này đến vào lúc nào trong ngày của bạn.',
  'settings.dayMoments.coffee': 'Cà phê',
  'settings.dayMoments.lunch': 'Bữa trưa',
  'settings.dayMoments.work': 'Tan làm',
  'settings.dayMoments.dinner': 'Bữa tối',
  'settings.dayMoments.bed': 'Đi ngủ',

  'settings.dayMoments.earlier': 'Sớm hơn mười phút',
  'settings.dayMoments.later': 'Muộn hơn mười phút',

  'settings.getReady': 'Chuẩn bị',
  'settings.getReady.hint': 'Mở khoảng thời gian chuẩn bị trước một giờ hẹn',
  'settings.getReady.note': 'Trước giờ bạn đã nói bao lâu thì bắt đầu chuẩn bị.',
  'settings.getReady.minutes': '{minutes} phút',
  'settings.getReady.lead': 'Trước giờ hẹn',
  'settings.getReady.less': 'Bớt năm phút',
  'settings.getReady.more': 'Thêm năm phút',
} as const;
