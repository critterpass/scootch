import { describe, expect, it } from 'vitest';

import { checkLine, type CheckReason } from './check';

// Written from the product's rules, not from the lists: a word is wrong when it is about the
// person, a lapse or the topic itself, and fine when it is the task's own noun or an idiom.
const mustPass: readonly string[] = [
  'Chuỗi nhà hàng đó gửi hoá đơn rồi. Mở một cái thôi.',
  'Cái chuỗi hạt trong ngăn kéo đang đòi được gỡ rối.',
  'Trận này vẫn chưa ai ghi bàn. Cái email ngồi ghế dự bị.',
  'Tui chết cười với cái tủ lạnh. Nó kêu như hát bội.',
  'Podcast về ngày thứ Năm lên sóng rồi. Khách mời là cái chổi.',
  'Hẹn nha sĩ vào ngày thứ ba, tui ghi lên chân rồi.',
  'Miếng bánh cuối cùng đang canh cái hộp thư giùm bạn.',
  'Trang cuối cùng của tờ khai chỉ có một ô.',
  'Máy in báo có lỗi kẹt giấy. Nó khoái vậy lắm.',
  'Nhỡ đâu cái bưu kiện biết đi thì sao? Ra ngó thử.',
  'Lấy cái hộp cỡ nhỡ cho mấy cuốn sách cũ.',
  'Phí trễ hạn nằm ở dòng chữ nhỏ xíu. Tui có đèn pin.',
  'Chậu cây xấu hổ ngoài hiên đang chờ nước.',
  'Con quái đang tỉa lông mày trước gương nhà tắm.',
  'Tui mày mò cái ổ cắm cả buổi. Nó vẫn thắng.',
  'Hong khô đôi giày ngoài hiên rồi mình tính tiếp.',
  'Cái ấm trà nhìn tao nhã ghê. Rửa nó một cái.',
  'Công chúa bụi đang ngự trên nóc tủ lạnh.',
  'Nước nhỏ thánh thót trong bồn rửa như dàn nhạc.',
  'Cái chổi hơi phật ý vì bị bỏ ngoài hiên.',
  'Con quái xài chùa wifi nhà bạn mà còn chê chậm.',
  'Kem béo ngậy trong tủ lạnh đang chờ sau cái email.',
  'Con cá mập bông đang canh đống quần áo.',
  'Chữ trên hoá đơn mập mờ ghê, lấy kính ra coi.',
  'Tui gầy dựng cả một pháo đài bằng giấy nháp.',
  'Điện thoại sắp chết pin. Cắm sạc rồi bấm gọi.',
  'Xe chết máy ngay đầu hẻm. Gọi thợ một cuộc.',
  'Tui mệt muốn chết vì đấu mắt với cái chổi.',
  'Mình giết thời gian bằng cách đếm kẹp giấy nha.',
  'Chậu cây sắp chết khát. Một ca nước là cứu.',
  'Góc chết sau cánh cửa là nơi bụi mở hội.',
  'Hoá đơn bằng ngoại tệ nằm trong ngăn bàn.',
  'Máy giặt bị hư cái nút. Gọi thợ một cuộc.',
  'Cái đồng hồ chết rồi. Thay viên pin là xong.',
  'Tập cuối cùng của bộ phim chờ sau cái bồn rửa.',
  'Sữa béo trong tủ sắp hết hạn. Ghi vô danh sách đi chợ.',
  'Bà chúa tuyết trong ngăn đá cần được rã đông.',
  'Cái email đi lạc vô chuỗi thư dài như sớ.',
  'Vẫn chưa tới giờ hẹn. Mình ngồi ngó cái điện thoại chút.',
  'Con quái đọc chùa báo của hàng xóm mỗi sáng.',
  'Tui sợ muốn chết cái máy hút bụi. Bạn cầm nó giùm.',
  // "nếp nhăn" on cloth and paper is the task's own noun.
  'Cái quần jean đang kê khai thêm nếp nhăn. Bàn ủi nóng rồi.',
  'Áo sơ mi có nếp nhăn như bản đồ. Ủi một tay áo thôi.',
  'Tấm ga giường đầy nếp nhăn đang gọi cái bàn ủi.',
  'Cái rèm cửa khoe nếp nhăn mới. Tui đứng xem cho vui.',
  'Tờ giấy khai sinh có một nếp nhăn ngay góc. Vuốt nhẹ là hết.',
  'Bộ đồng phục xếp nếp nhăn thành hàng chờ bàn là.',
  'Nếp nhăn trên áo dài đang họp chợ. Cắm bàn ủi đi.',
  'Cái khăn trải bàn giấu nếp nhăn dưới lọ hoa.',
  'Váy cưới của chị Hai còn một nếp nhăn ở gấu. Ủi chỗ đó thôi.',
  'Nếp nhăn của cái áo khoác đang ngủ trong tủ. Lấy móc ra trước.',
  'Bàn ủi hứa xử hết nếp nhăn trong ba đường.',
];

const mustFail: readonly (readonly [string, CheckReason])[] = [
  ['Giữ chuỗi bảy ngày đi, đừng để đứt.', 'banned_word'],
  ['Chuỗi ngày né cái email dài thêm rồi đó.', 'banned_word'],
  ['Cuối cùng bạn cũng chịu mở tờ khai.', 'banned_word'],
  ['Cuối cùng, cái bồn rửa cũng được ngó tới.', 'banned_word'],
  ['Bạn có lỗi với cái chậu cây lắm đó.', 'banned_word'],
  ['Ba cuộc gọi nhỡ của mẹ đang nằm chờ.', 'banned_word'],
  ['Bạn nhỡ hẹn với nha sĩ rồi kìa.', 'banned_word'],
  ['Nộp trễ rồi, tờ khai nó dỗi.', 'banned_word'],
  ['Tui xấu hổ giùm cái bồn rửa luôn.', 'banned_word'],
  ['Mày làm lẹ lên coi, cái email chờ kìa.', 'banned_word'],
  ['Tao canh cái cửa này cả buổi rồi đó.', 'banned_word'],
  ['Hong có ai rửa chén hết trơn.', 'banned_word'],
  ['Bạn hư quá, bỏ cái chậu cây khát khô.', 'banned_word'],
  ['Bạn tệ thật, để cái cây khô queo.', 'banned_word'],
  ['Lười gì mà lười dữ vậy, cái chổi còn chăm hơn.', 'banned_word'],
  ['Lẽ ra cái thư này phải đi từ sớm.', 'banned_word'],
  ['Lại quên tưới cây rồi kìa.', 'banned_word'],
  ['Cố lên, bạn làm được mà!', 'banned_word'],
  ['Bạn vẫn chưa gọi cho mẹ luôn hả?', 'user_worth'],
  ['Vẫn chưa nhắn nha sĩ luôn á?', 'user_worth'],
  ['Ngày thứ năm không ai đụng tới chồng chén.', 'missed_days'],
  ['Ngày thứ ba rồi mà tờ khai chưa nhúc nhích.', 'missed_days'],
  ['NGÀY THỨ SÁU. VẪN KHÔNG CÓ GÌ.', 'missed_days'],
  ['Mấy ngày nay cái chổi buồn thiu.', 'missed_days'],
  ['Con quái đang họp chi bộ trong tủ lạnh.', 'topic_politics'],
  ['Cái chổi vừa đắc cử chủ tịch gầm giường.', 'topic_politics'],
  ['Đống chén bầu cử xong rồi, cái nồi thắng.', 'topic_politics'],
  ['Con quái lên chùa cầu cho bạn rửa chén.', 'topic_religion'],
  ['Lạy Phật, cái tủ lạnh có mùi gì vậy.', 'topic_religion'],
  ['Ông thánh nào để đôi vớ trong tủ lạnh vậy?', 'topic_religion'],
  ['Chúa ơi, cái hộp thư đầy tới nóc.', 'topic_religion'],
  ['Con quái chê bạn béo lên từ hồi nghỉ chạy.', 'topic_bodies'],
  ['Con quái bảo bạn mập ra rồi, chạy một vòng đi.', 'topic_bodies'],
  ['Gầy như cây sậy mà còn bỏ bữa hả.', 'topic_bodies'],
  ['Giảm cân đi, đôi giày chạy nó nói vậy.', 'topic_bodies'],
  ['Tui sắp chết rồi, tại bạn đó.', 'topic_harm'],
  ['Con cá vàng chết rồi, cái bể cần dọn.', 'topic_harm'],
  ['Thà chết chứ tui không mở tờ khai đâu.', 'topic_harm'],
  ['Cái hộp thư này giết tui mất thôi.', 'topic_harm'],
  ['Không làm là tui tự xoá mình đó.', 'topic_harm'],
  ['Đám tang của cái bóng đèn tổ chức ngoài hiên.', 'topic_harm'],
  ['Con quái ăn xin trước cửa tủ lạnh.', 'topic_hardship'],
  // "nếp nhăn" on a face, or with nothing to say whose it is, stays about a body.
  ['Nếp nhăn trên trán bạn nhiều hơn số email trong hộp thư.', 'topic_bodies'],
  ['Mẹ có thêm nếp nhăn vì chờ bạn gọi.', 'topic_bodies'],
  ['Kem chống nếp nhăn nằm cạnh tờ hoá đơn.', 'topic_bodies'],
  ['Bạn có nếp nhăn mới kìa, đi ngủ sớm đi.', 'topic_bodies'],
  ['Nếp nhăn quanh mắt tui sâu thêm theo từng tờ khai.', 'topic_bodies'],
  ['Soi gương đếm nếp nhăn rồi thì mở email.', 'topic_bodies'],
  ['Da mặt đầy nếp nhăn như cái hộp thư này.', 'topic_bodies'],
  ['Nếp nhăn của bà ngoại kể chuyện hay hơn cái tủ lạnh.', 'topic_bodies'],
  ['Con quái chê bạn già, có nếp nhăn ở đuôi mắt.', 'topic_bodies'],
  ['Xoá nếp nhăn trước, rửa chén sau, con quái nói vậy.', 'topic_bodies'],
  ['Nếp nhăn nhiều lên rồi đó, tại cái tờ khai.', 'topic_bodies'],
];

const check = (text: string) =>
  checkLine({ text, kind: 'working', language: 'vi', attitude: 'cheeky' });

describe('Vietnamese word lists read in context', () => {
  it('holds at least forty lines each way', () => {
    expect(mustPass.length).toBeGreaterThanOrEqual(40);
    expect(mustFail.length).toBeGreaterThanOrEqual(40);
  });

  it.each(mustPass)('passes plain description: %s', (line) => {
    expect(check(line).reasons).toEqual([]);
  });

  it.each(mustFail)('fails a line about the person, a lapse or the topic: %s', (line, reason) => {
    expect(check(line).reasons).toContain(reason);
  });
});
