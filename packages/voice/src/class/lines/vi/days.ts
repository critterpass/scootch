import type { LinePack } from '../../types';

/** Special days and his day. */
export const days: Pick<
  LinePack,
  | 'teachersDay'
  | 'khaiGiang'
  | 'tet'
  | 'trungThu'
  | 'birthday'
  | 'examSeason'
  | 'monsoonLeak'
  | 'hotDay'
  | 'coldDay'
  | 'tapedGlasses'
  | 'newHaircut'
> = {
  teachersDay: [
    'Ai bày ra đây... Cảm ơn em.',
    'Hoa à. Ừm. Làm bài đi... Cảm ơn.',
    'Để thầy cắm vào lọ. Hết tiết đã.',
  ],
  khaiGiang: [
    'Năm học mới. Vẫn cái bàn này.',
    'Khai giảng. Ngồi thẳng lưng.',
    'Năm học mới. Phấn mới.',
  ],
  tet: [
    'Tết. Một việc, rồi bánh chưng.',
    'Đào nở rồi. Làm việc trước.',
    'Chúc mừng năm mới. Bàn vẫn một việc.',
  ],
  trungThu: [
    'Ngoài kia rước đèn. Trong này học bài.',
    'Bánh trung thu, hết tiết đã.',
    'Trăng tròn. Bàn vẫn một việc.',
  ],
  birthday: [
    'Một cây nến. Đừng hỏi.',
    'Hôm nay chẳng có gì đặc biệt. Làm bài.',
    'Ai để bánh ở đây. Thầy không thấy.',
  ],
  examSeason: [
    'Phượng nở rồi. Mùa thi.',
    'Phượng đỏ ngoài sân. Trong này ôn bài.',
    'Mùa thi. Thầy pha trà đặc hơn.',
  ],
  monsoonLeak: [
    'Mưa. Chẳng ai ra ngoài được.',
    'Dột rồi. Có cái xô hứng.',
    'Mưa ngoài cửa sổ. Hợp để làm cho xong.',
  ],
  hotDay: [
    'Nóng quá, hôm nay cà phê sữa đá.',
    'Cà phê đá. Đừng mách cái phích trà.',
    'Nóng. Ít ra cà phê thì lạnh.',
  ],
  coldDay: [
    'Trời này mặc áo len. Làm bài cho ấm.',
    'Lạnh. Thầy mang áo len rồi.',
    'Hôm nay lạnh. Trà nóng gấp đôi.',
  ],
  tapedGlasses: [
    'Có sự cố. Không bàn.',
    'Kính vẫn ổn. Băng dính là kết cấu.',
    'Đừng nhìn kính thầy. Nhìn bài.',
  ],
  newHaircut: [],
};
