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
} as const satisfies Catalogue;
