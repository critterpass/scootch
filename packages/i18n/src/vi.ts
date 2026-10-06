import type { Catalogue } from './catalogue-types';

/**
 * Vietnamese interface strings, written as a Vietnamese app would say them rather than word for
 * word. Vietnamese has one plural form, so a plural carries only `other`.
 */
export const vi = {
  'brand.name': 'Scootch',
  'brand.plus': 'Plus',

  'talk.hold': 'Giữ để nói',
  'talk.parkThought': 'Gác lại một ý',

  'session.start': 'Bắt đầu',
  'session.notNow': 'Để sau',
  'session.stuck': 'Mình bí rồi',
  'session.doneForToday': 'Hôm nay xong rồi',

  'monster.smaller': 'Nhỏ hơn',
  'monster.tooBig': 'To quá',
  'monster.catch': 'Bắt lấy nó',

  'world.thingsLiveHere': {
    other: '{count} thứ đang sống ở đây',
  },

  'settings.title': 'Cài đặt',
  'settings.attitude': 'Thái độ',
  'settings.attitude.soft': 'Nhẹ nhàng',
  'settings.attitude.cheeky': 'Láu cá',
  'settings.attitude.unhinged': 'Quậy tới bến',
  'settings.quietHours': 'Giờ yên tĩnh',
  'settings.privacyAndData': 'Quyền riêng tư và dữ liệu',
  'settings.deleteEverything': 'Xoá tất cả',
  'settings.keepEverything': 'Giữ lại tất cả',
  'settings.restorePurchases': 'Khôi phục giao dịch mua',

  'language.en': 'tiếng Anh',
  'language.vi': 'tiếng Việt',

  'scootch.squeakHint': 'Chạm hai lần để nghe một tiếng chít.',

  'launch.step': 'Bước {step} trên {total}',
  'launch.hello.action': 'Chào Scootch',
  'launch.hello.hint': 'Sang lựa chọn cài đặt duy nhất.',
  'launch.attitude.soft.about': 'Mỗi ngày một lời nhắc khẽ.',
  'launch.attitude.cheeky.about': 'Tối đa ba lần. Nói đúng việc. Hơi hỗn với cái việc.',
  'launch.attitude.unhinged.about': 'Diễn càng lúc càng lố. Không bao giờ nói về bạn.',
  'launch.attitude.confirm': 'Chốt {attitude}',
  'launch.attitude.confirm.hint': 'Bạn đổi lại lúc nào cũng được trong Cài đặt.',
  'launch.permissions.notifications': 'Thông báo',
  'launch.permissions.microphone': 'Micro',
  'launch.permissions.accept': 'Được',
  'launch.permissions.accept.hint': 'Sau đó điện thoại sẽ hỏi bạn xác nhận.',
  'launch.permissions.skip.hint': 'Bỏ qua mục này. Điện thoại không hỏi gì cả.',
  'launch.chip.reply': 'trả lời một tin nhắn',
  'launch.chip.water': 'uống chút nước',
  'launch.chip.email': 'mở cái email đáng sợ',
  'launch.chip.hint': 'Chọn việc này làm một việc của bạn.',
  'launch.notificationsOff': 'Thông báo đang tắt nên Scootch sẽ im cho tới khi bạn mở ứng dụng.',

  'composer.hold.hint': 'Giữ trong lúc nói, thả ra để gửi. Trượt sang trái để huỷ.',
  'composer.toggle.hint': 'Chạm hai lần để bắt đầu nói. Chạm hai lần nữa để gửi.',
  'composer.stopAndSend': 'Dừng và gửi',
  'composer.cancelRecording': 'Huỷ ghi âm',
  'composer.recording': 'Đang ghi, {time}',
  'composer.slideToCancel': 'Trượt sang trái để huỷ',
  'composer.releaseToCancel': 'Thả ra để huỷ',
  'composer.cancelled': 'Đã huỷ. Không sao cả.',
  'composer.tooShort': 'Giữ nút trong lúc bạn nói',
  'composer.thinking': 'Scootch đang chọn ra một việc…',
  'composer.placeholder': 'Gõ một việc thôi…',
  'composer.typeIt': 'Gõ chữ',
  'composer.typeIt.hint': 'Đổi thanh này thành ô nhập chữ.',
  'composer.talkInstead': 'Chuyển sang nói',
  'composer.talkInstead.hint': 'Quay lại giữ để nói.',
  'composer.send': 'Gửi',
  'composer.send.hint': 'Đưa việc này cho Scootch.',
  'composer.empty': 'Chưa nghe được gì. Giữ nút rồi nói, hoặc gõ ra nha.',
  'composer.micRefused': 'Micro đang tắt với Scootch nên giờ chỉ gõ được thôi.',
  'composer.openSettings': 'Mở Cài đặt',
  'composer.openSettings.hint': 'Mở ứng dụng này trong Cài đặt của điện thoại.',
  'composer.voiceUnavailable':
    'Điện thoại này chưa tự chuyển lời nói {language} thành chữ được. Bạn gõ nha.',
  'composer.sayItAnotherWay': 'Scootch chưa hiểu ý đó. Bạn thử nói cách khác nha.',

  'oneScreen.offline': 'Ngoại tuyến · sẽ đồng bộ sau',
  'oneScreen.world': 'Thế giới của bạn',
  'oneScreen.more': 'Thêm',
  'oneScreen.notOpenYet': 'Chưa mở',
  'oneScreen.yourTask': 'Một việc của bạn',

  'taskSet.treat': 'Phần thưởng sau việc này',
  'taskSet.treat.placeholder': 'Gọi tên nó',
  'taskSet.treat.hint': 'Gọi tên một thứ dễ chịu cho lúc xong. Để trống cũng được.',
  'taskSet.minutes': '{minutes} phút',
  'taskSet.minutes.hint': 'Chọn thời lượng của phiên.',
  'taskSet.start.hint': 'Bắt đầu một phiên {minutes} phút.',
} as const satisfies Catalogue;
