import type { Language } from '@scootch/domain';

/**
 * The controls a line may tell the person to use, said exactly. The writer is shown this, and
 * the checker rejects a line that asks for anything else.
 */
export const controlsNotes: Readonly<Record<Language, string>> = {
  en: 'The app\'s controls, exactly. A line that tells the person what to do may name only these, and only as they are: to finish, the person presses and holds the button on the screen (the button, never the phone itself); "Smaller" gives a smaller step; "Park a thought" sets a stray thought aside for afterwards; the timer is a disc that shrinks. The app has no other gesture, no camera and nothing to say out loud except "done".',
  vi: 'Các nút của app, đúng như sau. Câu nào bảo người dùng làm gì thì chỉ được nhắc mấy thứ này, đúng như chúng có: muốn kết thúc thì nhấn và giữ cái nút trên màn hình (giữ cái nút, không phải giữ điện thoại); nút "Nhỏ hơn" cho một bước nhỏ hơn; nút cất tạm một ý nghĩ để dành sau buổi làm; đồng hồ là một cái đĩa tròn nhỏ dần. App không có cử chỉ nào khác, không có camera, và không cần nói gì thành tiếng ngoài chữ "xong".',
};

const phoneEn = '(?:your|the|this|that) (?:phone|device|iphone|screen|handset|mobile)';
const phoneVi = '(?:cái |chiếc )?(?:điện thoại|iphone|màn hình)';

/**
 * Instructions the app has no control for: shaking, tilting, holding the phone steady, swiping,
 * a camera, a password. They are matched as things asked of the person, with the phone or the
 * gesture named, so a monster that shakes or a task that is a phone call is left alone.
 */
export const untrueControls: Readonly<Record<Language, RegExp>> = {
  en: new RegExp(
    [
      `\\b(?:shake|shaking|tilt|tilting|wave|waving|flip|flipping|rotate|rotating|turn over|squeeze|squeezing|wiggle|wiggling|jiggle|jiggling|tap on|blow on|point|aim) ${phoneEn}\\b`,
      `\\bgive ${phoneEn} a (?:shake|tilt|wiggle|jiggle|tap|squeeze|flip)\\b`,
      '\\b(?:shake|tilt) to\\b',
      `\\b(?:hold|keep|holding|keeping) ${phoneEn} (?:very |really |perfectly |nice and )?(?:steady|still|level|upright)\\b`,
      `\\bsteady ${phoneEn}\\b`,
      '\\bswip(?:e|ing) (?:up|down|left|right|to|it|the|this|away|across|here|over)\\b',
      '\\b(?:a|one|quick) swipe\\b',
      '\\b(?:say|speak|whisper|shout|type|enter|tell me) (?:the|a|your|our) (?:secret |magic )?(?:password|passcode|passphrase|code ?word|magic word|secret word|pin)\\b',
      '\\b(?:point|aim|open) (?:your|the) camera\\b',
      '\\b(?:take|snap) a (?:photo|picture|selfie)\\b',
      '\\bscan (?:the|a|this|it)\\b',
      '\\bdouble[- ]tap\\b',
      '\\b(?:pinch|drag|flick) (?:the|it|to|your)\\b',
    ].join('|'),
    'u',
  ),
  vi: new RegExp(
    [
      `(?<![\\p{L}])(?:lắc|nghiêng|xoay|lật|úp|vẫy|bóp|rung|thổi vào|chĩa) ${phoneVi}(?![\\p{L}])`,
      `(?<![\\p{L}])(?:giữ|cầm|để)(?: cho)? ${phoneVi}(?: cho)?(?: thật)? (?:yên|chắc|vững|thẳng|đứng im)(?![\\p{L}])`,
      '(?<![\\p{L}])vuốt (?:lên|xuống|sang|qua|trái|phải|ngang|màn hình|để|một cái)(?![\\p{L}])',
      '(?<![\\p{L}])(?:nói|đọc|hô|nhập|gõ|thì thầm) (?:mật khẩu|mật mã|câu thần chú|khẩu lệnh|mã bí mật)(?![\\p{L}])',
      '(?<![\\p{L}])(?:chĩa|giơ|mở|bật) (?:camera|máy ảnh)(?![\\p{L}])',
      '(?<![\\p{L}])chụp (?:một |một tấm |tấm )?(?:ảnh|hình)(?![\\p{L}])',
      '(?<![\\p{L}])quét (?:mã|qr)(?![\\p{L}])',
      '(?<![\\p{L}])(?:chạm|nhấn|bấm) (?:hai|đúp) (?:lần|cái)(?![\\p{L}])',
    ].join('|'),
    'u',
  ),
};
