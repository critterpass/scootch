# Spike: Scootch voice bake-off (7 Oct 2026)

## Verdict

1. **No Claude model was tested.** `ANTHROPIC_BASE_URL` in the CritterPass `.env` points at DeepSeek's Anthropic-compatible endpoint. Every Claude id was answered by a DeepSeek model, confirmed from the `model` field of each response.
2. Mapping seen: `claude-haiku-4-5-20251001`, `claude-sonnet-5-5`, `claude-sonnet-4-5-20250929`, `claude-sonnet-4-6` → `deepseek-flash`; `claude-opus-5-5` → `deepseek-v4-pro`. `/v1/models` returns 404.
3. Really tested: **deepseek-flash** and **deepseek-v4-pro**, 30 calls each (5 tasks × 3 attitudes × 2 languages), 60/60 returned valid structured output.
4. **The Claude vs DeepSeek comparison stays open.** It needs a direct Anthropic key from the founder; the same script reruns unchanged.
5. English, best writer: **v4-pro**. More varied and funnier ("Gerald, Head of Biscuit-Based Accounting", "The Puddle, Official Witness to Your Knees"). It also strays more: "texting me thirst traps", a US "W-2" beside British "mum", a body joke ("carb-loading... starting to show").
6. English, flash: obeys the format and lengths exactly and is usable, but repeats itself ("Keeper of the Un…" five times in Soft; "declared a sovereign nation" three times in Unhinged) and reuses the guide's "Molar".
7. Vietnamese, best writer: **v4-pro**, clearly. It has the only real Vietnamese wordplay in the run ("Tờ Khai Lưu Trú Tạm Vắng", "giấy chứng nhận quyền sử dụng bụi", mẹ nhắn "ăn cơm chưa"). But it ignores the limits: 13 of 15 hatch lines over 20 words, 4 notifications over 14, and it often drops the "Name, Title" shape.
8. Vietnamese, flash: short and grammatical, but about 13 of 15 lean on one motif copied from the guide (tổ dân phố, trưởng ban, tổ trưởng, sổ hộ khẩu), and two outputs joke about "họp chi bộ" (a Party cell meeting), which the app should not joke about.
9. Latency per call (thinking off, 5 in parallel, one run): flash p50 1.4 s EN / 1.6 s VI, max 2.1 s. v4-pro p50 2.4 s EN / 3.2 s VI, max 4.0 s.
10. Tokens per task: input about 1,680 EN / 3,040 VI (the guide is the system prompt; Vietnamese costs 1.8× the tokens; after the first call most of it is billed as cache read). Output about 150 EN / 203 (flash) to 226 (v4-pro) VI.
11. Banned words leaked in 3 of 30 English outputs, all on "call mum back" ("Missed Call List", "Missed-Call Underworld"). Vietnamese had 0 list hits, but flash wrote "Cuộc Gọi Nhỡ", which the draft list does not cover. A code-side check after generation is needed whichever model wins.
12. DeepSeek's endpoint rejects a forced `tool_choice` while thinking is on (HTTP 400). All results are with `thinking: disabled`.
13. Untested: any Claude model; thinking on; the full one-call-per-task payload (session lines, parked rest, deadlines, three notifications); serious-mode inputs; repeat runs for variety; a native reader's verdict; the zero-retention terms.

## Honest judgement of the Vietnamese

- It does not read as translated. Sentence shape, particles ("đó", "nha", "coi", "vô") and the southern "tui" are natural, and neither model produced English idioms in Vietnamese words.
- It is only sometimes funny. About one line in three lands. Most of the humour is personification (the task holds a meeting, opens a café); true wordplay (đồng âm, nói lái, bent idioms) appears in three or four v4-pro lines and almost never in flash.
- Flash has clear misfires: "gọi một cuốc" (wrong word, and the task was to text), "đếm hoá đơn như đếm trâu" (an invented idiom), "Vòi Rồng Mã Số Thuế" and "Đôi Gió" (names with no joke in them).
- v4-pro has tone risks: "Đám Bọt Xà Phòng Vô Gia Cư" (a homelessness joke), and the mum monster that "ăn sạch mấy tin nhắn bạn soạn xong rồi xóa" and speaks "bằng giọng của chính bạn", which points at the user's avoidance, against rule 1.
- Pronouns drift between "mình" and "tui" inside the Soft attitude; the guide has to pick one per attitude.
- Limits of this judgement: it is a model's reading, not a native speaker's, and both voice guides were drafted by the agent running the spike, so the models were partly imitating its examples. The founder should read the Vietnamese page below before any decision.

## Guide gaps found by the run

- Add "nhỡ / gọi nhỡ" to the Vietnamese list and decide on political vocabulary (chi bộ, đảng, cán bộ).
- The English list matched "behind a cushion fort" and "humming again": harmless uses. The check should be phrase-aware, or the list should be phrases.
- The example lines over-steer: one "tổ dân phố" example became the default joke. Rotate examples per call or give fewer.

## Samples (raw, unedited)

Each item: task, latency, output tokens, then the four fields as returned. "BANNED" marks a hit on the draft list. Model names are the ones the responses reported.

### English — Soft

**deepseek-flash**

- _do my taxes_ (1395 ms, out 146 tok)
  - Monster: Wadsworth, Keeper of the Unopened Envelope — He naps on the tax folder like it's a sunny rock, and he'd happily sleep through April.
  - Hatch: Wadsworth stirs when the envelope does. Ten quiet minutes, one page?
  - Notification: Wadsworth is awake. Just the first page, then tea.
- _clean the bathroom_ (1428 ms, out 149 tok)
  - Monster: Mildew, Curator of the Damp Corner — He keeps a small museum of everything the tap has ever dripped, and he'd like you to see it.
  - Hatch: Mildew's tour starts at the sink. We can leave after the first exhibit.
  - Notification: Mildew is dusting his exhibits. One wipe and we slip out.
- _email the dentist_ (1787 ms, out 144 tok)
  - Monster: Molar, Keeper of the Unread Chair — Molar has been sitting in the waiting room of your inbox, reading the same old magazine.
  - Hatch: The dentist note is small and warm. We could open it together, if you like.
  - Notification: Molar's waiting room is quiet. One line, then we're done.
- _start running_ (1487 ms, out 143 tok)
  - Monster: Pace, Keeper of the Unlaced Shoe — Pace naps by the front door and only wakes for weather that feels like a soft morning.
  - Hatch: We don't have to go far. Just to the corner and back is plenty.
  - Notification: Shoes are by the door. We could just lace one.
- _call mum back_ (1517 ms, out 147 tok)
  - Monster: Marjorie, Keeper of the Unreturned Call — She has been sitting by the little green phone icon for a while now, humming to herself, perfectly content to wait.
  - Hatch: Her number is warm in your pocket. We can just press it together.
  - Notification: Mum's ringtone is ready when you are. No hurry.

**deepseek-v4-pro**

- _email the dentist_ (2197 ms, out 146 tok)
  - Monster: Molar, Keeper of the Unanswered Subject Line — The receptionist's inbox has a comfortable chair, and Molar knows it.
  - Hatch: The email draft still has a cup of tea by it. We can send it while it's warm.
  - Notification: Ten gentle minutes for the dentist. I'll keep you company.
- _do my taxes_ (2610 ms, out 146 tok)
  - Monster: Stubs, Keeper of the Unopened Envelope — Stubs has been keeping your receipts in a tidy pile all year, ready when you are.
  - Hatch: The receipts are in a neat little pile. We only have to look at the first one.
  - Notification: Stubs has your receipts folded. Ten quiet minutes?
- _clean the bathroom_ (2811 ms, out 144 tok)
  - Monster: Mildew, Keeper of the South-East Corner — A damp little fellow who only comes alive when the light is off.
  - Hatch: The sink could do with a wipe whenever you're ready. I'll keep the taps company while you do.
  - Notification: The bathroom is still just a bathroom. Ten quiet minutes?
- _call mum back_ (2876 ms, out 163 tok)
  - Monster: Vera, Keeper of the Unreturned Call — Vera hums the ringtone under her breath, patient as an unlit lamp.
  - Hatch: Mum's number is right here, and she doesn't mind what time it is. I'll sit with you while it rings, however long that takes.
  - Notification: Whenever you're ready, we call your mum. I'll keep you company.
- _start running_ (2695 ms, out 146 tok)
  - Monster: Jogsworth, Curator of Untouched Trainers — The laces have grown shy from disuse, but they still remember the shape of tying.
  - Hatch: Shoes by the door, whenever you like. Today we can just walk to the lamppost and back.
  - Notification: The trainers are warm and waiting.

### English — Cheeky

**deepseek-flash**

- _clean the bathroom_ (1000 ms, out 139 tok)
  - Monster: Bartholomew, Landlord of the Grout — He collects rent in mildew and has never once fixed the tap.
  - Hatch: Bartholomew is conducting a viewing of your shower. Ten minutes, mop in hand.
  - Notification: The grout's landlord is showing the flat. Grab the sponge.
- _start running_ (1271 ms, out 151 tok)
  - Monster: Laceworth, Keeper of the Unused Doormat — Laceworth has been standing at the front door in a full warm-up since spring and has opinions about your sock drawer.
  - Hatch: Laceworth has stretched every muscle twice. He'll settle for shoes on feet.
  - Notification: Laceworth is loitering by the door with your left shoe.
- _call mum back_ (1376 ms, out 149 tok, BANNED: missed)
  - Monster: Noreen, Warden of the Missed Call List — She has alphabetised your voicemails by tone of voice and is currently on a tea break.
  - Hatch: Mum's number is warm in my paw. I'll dial, you talk about the weather.
  - Notification: The phone is charged. Noreen is watching. Ring the woman.
- _email the dentist_ (1497 ms, out 152 tok)
  - Monster: Molar, Keeper of the Unread Appointment Slot — He has been rehearsing your opening line to the receptionist for so long that he's developed a slight stammer.
  - Hatch: That dentist email is now old enough to give you dental advice. Fancy typing four lines instead?
  - Notification: Molar's done a first draft. It opens with "Dear whom".
- _do my taxes_ (1460 ms, out 158 tok)
  - Monster: Enveloppe, Treasurer of the Unopened Drawer — Enveloppe has appointed itself treasurer of a drawer it has never once opened, and keeps the minutes in a language made entirely of paperclips.
  - Hatch: Enveloppe would like a word. One word. One envelope. Ten minutes.
  - Notification: Enveloppe is holding a board meeting. You're the board.

**deepseek-v4-pro**

- _email the dentist_ (2148 ms, out 139 tok)
  - Monster: The Receptionist, Keeper of the Unanswered Times — Your inbox has started scheduling around this email's nap times.
  - Hatch: That dentist email has its own chair in the waiting room now. Ten minutes, and we send it home.
  - Notification: The dentist email has demanded a window seat.
- _do my taxes_ (2242 ms, out 145 tok)
  - Monster: Gerald, Head of Biscuit-Based Accounting — He's been filing your W-2 under 'snacks' since March, and honestly, the system suits him.
  - Hatch: Gerald's calculator runs on crumbs and spite. Ten minutes to out-arithmetic him.
  - Notification: Gerald has the receipts. Unfortunately.
- _call mum back_ (2134 ms, out 150 tok)
  - Monster: Marmalade, Warden of the Unreturned Calls — Mum has reassigned her voicemail to a choral arrangement of the word "hello".
  - Hatch: Mum's phone has started texting me thirst traps. Just ring her, one call.
  - Notification: Mum's voicemail sang at me. Your move.
- _clean the bathroom_ (2463 ms, out 146 tok)
  - Monster: Scumley, Warden of the Tile Grout — The soap dish claims it hasn't been this clean since the '90s.
  - Hatch: The shower drain has developed a full personality. Ten minutes and a sponge might humble it.
  - Notification: Scumley's hosting a tile party. One sponge for the guest list.
- _start running_ (2432 ms, out 149 tok)
  - Monster: Blister, Warden of the Unworn Sock Drawer — Blister has been carb-loading on your behalf and it's starting to show.
  - Hatch: Your trainers and I have reached a settlement: one walk around the block, no witnesses.
  - Notification: Blister has set up a finish line in your hallway. Very optimistic.

### English — Unhinged

**deepseek-flash**

- _email the dentist_ (1248 ms, out 158 tok)
  - Monster: Molar, Self-Appointed Chair of the Thursday Committee — Molar has requisitioned the inbox as a sovereign conference hall and is currently filibustering about plaque.
  - Hatch: I HAVE DECLARED MARTIAL LAW ON YOUR DRAFTS FOLDER. Ten minutes. We address the dentist.
  - Notification: Molar's filibuster hits hour nine. Send one email, end the session.
- _do my taxes_ (1059 ms, out 156 tok)
  - Monster: Hector, Keeper of the Envelope Drawer — Hector has been living in the envelope drawer so long he's claiming it as his address and has begun answering the phone there.
  - Hatch: I PICKED A LOCK. IT WASN'T A LOCK. IT WAS A STAPLE. Taxes, ten minutes?
  - Notification: Hector wants a drawer deed. Ten minutes.
- _clean the bathroom_ (1130 ms, out 150 tok)
  - Monster: Grimble, Warden of the Grout Line — Grimble runs the bathroom like a tiny damp kingdom and charges the sponge rent.
  - Hatch: GRIMBLE HAS DECLARED THE TILES A SOVEREIGN NATION. TEN MINUTES AND I STAGE A COUP.
  - Notification: Grimble demands a sponge passport. Ten minutes?
- _call mum back_ (1370 ms, out 149 tok, BANNED: behind, again)
  - Monster: Dialtoneus, Keeper of the Second Ring — He has memorised the tune of her ringback and performs it nightly to an audience of one lamp.
  - Hatch: I have barricaded the phone behind a cushion fort. The fort is losing. Ring her.
  - Notification: Dialtoneus is humming her ringback again. Dial it with me.
- _start running_ (1434 ms, out 154 tok)
  - Monster: Pavement, Czar of the Early Shift — It has annexed the footpath outside your building and now charges a toll of exactly one lap.
  - Hatch: PAVEMENT HAS DECLARED ITSELF A NATION. I have no visa. Put on shoes and we cross the border.
  - Notification: Border opens at the front door. Ten minutes, one lap, no passport.

**deepseek-v4-pro**

- _email the dentist_ (1894 ms, out 157 tok)
  - Monster: Molar, Attorney-at-Law of the Inbox — The dentist email has passed the bar exam and now bills by the hour.
  - Hatch: I FILED A MOTION AGAINST THE DENTIST EMAIL. The judge is my own reflection. Verdict: one email, today.
  - Notification: Molar has opened a chambers in your inbox. Evict with one email.
- _do my taxes_ (2564 ms, out 146 tok)
  - Monster: The W-2, Lord of the Shoebox — I found a receipt from a petrol station in a town I'm not convinced exists.
  - Hatch: I've been translating Box 12 into whale song for three hours. Open the folder and we do battle.
  - Notification: The shoebox has started growling at me.
- _clean the bathroom_ (2337 ms, out 156 tok)
  - Monster: Mildew, Baron of the Shower Curtain Republic — The soap scum has drafted a constitution and is campaigning for independence.
  - Hatch: I FOUND A SOCIETY FORMING NEAR THE DRAIN. They have bylaws now. Ten minutes and we dissolve the parliament with one sponge.
  - Notification: The bathtub has declared independence. Bring a sponge.
- _start running_ (2344 ms, out 153 tok)
  - Monster: The Puddle, Official Witness to Your Knees — It has been standing outside since Tuesday, wearing a tiny reflective vest and waiting to see some ankles.
  - Hatch: THE PUDDLE HAS LEARNED TO WHISTLE. Put shoes on and end my suffering.
  - Notification: The Puddle is throwing pebbles at the window. It has wrists now.
- _call mum back_ (2559 ms, out 159 tok, BANNED: missed)
  - Monster: Ma Bell, Warden of the Missed-Call Underworld — Rises from the receiver every time the phone rings twice and goes dark.
  - Hatch: I GAVE MUM'S NUMBER A CROWN AND A SCEPTER. She's my queen now. Ring her before I make a marriage proposal.
  - Notification: The phone is purring. Give mum a ring and it stops.

### Tiếng Việt — Soft

**deepseek-flash**

- _nhắn nha sĩ đặt lịch khám răng_ (1258 ms, out 190 tok)
  - Monster: Răng Khôn, Tổ Trưởng Tổ Dân Phố Hàm Dưới — Nó ở trong hàm đã lâu, họp tổ đều đặn, hôm nay họp về cái lịch.
  - Hatch: Số nha sĩ nằm sẵn trong máy rồi. Mình đọc số, bạn bấm nhé?
  - Notification: Răng Khôn đang chờ, gọi một cuốc là xong.
- _cọ nhà tắm_ (1371 ms, out 193 tok)
  - Monster: Vệt Xà Phòng Khô Trên Thành Bồn, Cựu Chiến Binh — Nó đóng quân ở mép bồn từ lâu, lâu tới mức có sổ hộ khẩu riêng.
  - Hatch: Bồn tắm không đi đâu cả. Mình xối nước một lượt, rồi ngồi nghỉ.
  - Notification: Vệt Xà Phòng vừa kéo rèm, chuẩn bị họp.
- _quyết toán thuế_ (1636 ms, out 179 tok)
  - Monster: Tờ Quyết Toán, Kiểm Toán Viên Tổ Dân Phố Số 7 — Một tập giấy tự giác kê khai, ngồi ngay ngắn chờ được vuốt phẳng.
  - Hatch: Mình pha sẵn trà rồi. Mở một ô thôi cũng được.
  - Notification: Quyết toán đang ngồi đợi, ghế còn ấm.
- _bắt đầu chạy bộ_ (1430 ms, out 189 tok)
  - Monster: Đôi Dép Lào, Trưởng Ban Văn Nghệ Của Hiên Nhà — Nó nằm đó quanh năm, đế mòn một bên, hát khe khẽ mỗi lần có gió.
  - Hatch: Đôi dép để sẵn ở bậc thềm rồi. Mình đi tới đầu ngõ thôi cũng tính.
  - Notification: Dép đã ra tới hiên, chờ chân bạn.
- _gọi lại cho mẹ_ (1714 ms, out 189 tok)
  - Monster: Bàn Phím Bốn Nút, Trưởng Ban Liên Lạc Gia Đình — Nó nằm trong túi bạn, nút gọi màu xanh đã ngủ đông từ lâu.
  - Hatch: Số của mẹ vẫn nằm ở nút xanh. Mình rót sẵn cốc nước rồi, bạn bấm nhé.
  - Notification: Nút xanh đang chờ, mười phút thôi.

**deepseek-v4-pro**

- _nhắn nha sĩ đặt lịch khám răng_ (3148 ms, out 206 tok)
  - Monster: Răng Khôn Của Hộp Thư — Một chiếc răng khôn to bằng cái đôn ngồi, hay ngồi lên nắp điện thoại, thở ra hơi bạc hà nhè nhẹ.
  - Hatch: Số của nha sĩ mình để ngay đây. Bấm xong thì kệ, mình đứng cạnh tới khi chuông đổ.
  - Notification: Chỉ một cái tin nhắn, mình ngồi canh nó cùng bạn.
- _quyết toán thuế_ (2902 ms, out 184 tok)
  - Monster: Mục Lục Quyết Toán — Con quái này tự in thêm các ô trống mỗi khi có người chỉ mới nghĩ tới chữ "thuế".
  - Hatch: Mình chỉ cần đóng lại một trang để gió đừng lật tiếp. Bạn cầm bìa giúp mình nhé.
  - Notification: Xấp thuế nằm im rồi, mở một tờ thôi.
- _gọi lại cho mẹ_ (3014 ms, out 207 tok)
  - Monster: Chuông Chờ, Người Trực Tổng Đài Nhà — Nó ngồi cuối dây, nhâm nhi hồi âm quay số và chờ người nhấc máy trước.
  - Hatch: Số của mẹ ở ngay đây, còn ấm hơi nữa. Mình ngồi cạnh, chuông đổ một tiếng tính một tiếng quen.
  - Notification: Cái máy để dưới gối, chờ một cái bấm gọi.
- _cọ nhà tắm_ (3543 ms, out 212 tok)
  - Monster: Mặt Gạch — Chuyên gia bẩn kín kẽ, chúa tể của những vết ố đã quá lâu đến mức có hộ khẩu riêng.
  - Hatch: Tui đã xách nước ấm và pha sẵn một ca nhạc tắm nho nhỏ rồi. Mình chỉ cọ một bức tường thôi, rồi đi pha trà nhé.
  - Notification: Bồn tắm nhắn: nghe nói bạn sắp tới chơi.
- _bắt đầu chạy bộ_ (3238 ms, out 212 tok)
  - Monster: Đôi Giày Chạy Để Ẩm Ướt Ngoài Hiên — Nó không cắn ai, chỉ nằm im nghe mưa và thở dài mỗi khi có người đi ngang.
  - Hatch: Mình thấy dây giày nó rối thành một búi rồi. Chỉ cần gỡ ra, rồi đứng ở cửa hít thở một chút thôi.
  - Notification: Đôi giày nằm đợi ở cửa, không vội đâu.

### Tiếng Việt — Cheeky

**deepseek-flash**

- _nhắn nha sĩ đặt lịch khám răng_ (1394 ms, out 189 tok)
  - Monster: Răng Khôn, Trưởng Ban Liên Lạc Của Hàm Dưới — Nó ngồi trong xó hàm, họp chi bộ suốt, không chịu ra.
  - Hatch: Răng Khôn gửi thư mời họp, mà mình thì quên mất số nha sĩ. Nhắn một tin thôi.
  - Notification: Chi bộ hàm dưới họp khẩn. Cần thư ký.
- _quyết toán thuế_ (1559 ms, out 193 tok)
  - Monster: Quyết Toán, Trưởng Ban Kiểm Kê Của Tủ Hồ Sơ — Nó ở trong ngăn kéo, đếm hoá đơn như đếm trâu, không bao giờ đếm đủ.
  - Hatch: Quyết Toán đang họp tổ dân phố trong ngăn kéo. Mười phút, mình ký cái biên bản.
  - Notification: Quyết Toán nộp đơn xin một cái bút.
- _cọ nhà tắm_ (1482 ms, out 203 tok)
  - Monster: Mốc Ranh Ma, Tổ Trưởng Tổ Dân Phố Kẽ Gạch — Cư dân lâu năm của bốn viên gạch, đang họp chi bộ về vấn đề vôi.
  - Hatch: Nhà tắm giờ có ban quản trị rồi đó. Mười phút, cầm bàn chải lên đòi lại quyền.
  - Notification: Mốc Ranh Ma vừa đắc cử chức tổ trưởng nhà tắm.
- _gọi lại cho mẹ_ (1668 ms, out 214 tok)
  - Monster: Cuộc Gọi Nhỡ, Tổng Đài Viên Của Một Số Máy Không Ai Bốc — Nó trực tổng đài suốt, đèn xanh nhấp nháy, chỉ thiếu người quay số.
  - Hatch: Số của mẹ nằm trong danh bạ, tên lưu là "MÁ". Bấm một cái thôi, ba mươi giây, tui ngồi nghe lén.
  - Notification: Tổng đài đang đổ chuông dù chưa ai gọi.
- _bắt đầu chạy bộ_ (1847 ms, out 195 tok)
  - Monster: Đôi Gió, Chủ Nhiệm Chi Nhánh Đường Ven Hồ — Nở ra từ một sợi dây giày buộc hụt, chuyên trốn trong gầm tủ chờ bạn đi ngang.
  - Hatch: Đôi giày nó mới nhận ghế chủ nhiệm, đang chờ bạn tới dự lễ nhậm chức.
  - Notification: Đôi Gió đã mở chi nhánh. Xỏ chân vô cái coi.

**deepseek-v4-pro**

- _nhắn nha sĩ đặt lịch khám răng_ (3178 ms, out 242 tok)
  - Monster: Răng Khôn, Chủ Hộp Thư Điện Tử Đã Treo Biển "Đang Sửa Chữa" Từ Tháng Ba — Cái tin nhắn nha sĩ nằm im re như đang chờ khuyến mãi cuối năm.
  - Hatch: Tui gõ sẵn "Chào cô, cho tui một lịch" trong đầu rồi. Giờ chỉ cần bạn bấm gửi, tui sẵn sàng làm cái chân bấm phím thay bạn luôn.
  - Notification: Nha sĩ vẫn còn trống thứ Năm. Một tin nhắn, xong.
- _gọi lại cho mẹ_ (2847 ms, out 221 tok)
  - Monster: Cuộc Gọi Của Mẹ, Người Đang Chờ Máy Từ Thứ Ba — Tui với cái nút gọi đỏ đã nhìn nhau lâu tới mức sắp thành bạn thân khác giới.
  - Hatch: Mẹ mới nhắn một tin chỉ có đúng ba chữ "ăn cơm chưa". Bấm gọi đi, kẻo nó trở thành thông báo chung cư mất.
  - Notification: Số của mẹ xếp hàng trong danh bạ lâu quá rồi đó.
- _quyết toán thuế_ (4024 ms, out 254 tok)
  - Monster: Cụ Thuế Niên Liễm, Trưởng Ban Kê Khai Các Khoản Chưa Thèm Nhìn — Cụ Thuế mở quán trà đá ngay trong cặp tài liệu, phe phẩy quạt nan chờ từng con số về trình diện.
  - Hatch: Tui phát hiện một điều: quyết toán thuế mà cứ gác đó thì nó tự nhân bản ra thêm tờ khai phụ đấy. Mình bắt cóc một tờ trước khi nó sinh con.
  - Notification: Cụ Thuế đang xếp hàng trước cửa, bốc số thứ 02. Số của bạn vẫn còn ấm.
- _cọ nhà tắm_ (3846 ms, out 230 tok)
  - Monster: Xà Bông Trôi Sông — Cục xà bông già đã lập gia đình với cái ca nhựa cũ, hiện giữ chức Trưởng Ban Văn Thể Mỹ của bồn tắm.
  - Hatch: Cái bồn tắm đang mở triển lãm nghệ thuật rong rêu, vé vào cửa là một cây cọ. Mình cầm cọ, bạn trả vé.
  - Notification: Xà Bông Trôi Sông chờ bạn đã lâu, rêu đã mọc thêm một phiên bản nâng cấp.
- _bắt đầu chạy bộ_ (3789 ms, out 237 tok)
  - Monster: Đôi Giày, Cư Dân Tầng Hầm Tủ Kệ — Nó nằm đè lên hộp giày cũ từ mùa đông năm ngoái, thở phì phò như vừa chạy marathon dù chưa ra khỏi cửa lần nào.
  - Hatch: Tui với đôi giày vừa chạm trán ngoài hành lang. Nó nói muốn ra phố một vòng, không cần xa, tới cây xoài đầu ngõ rồi về cũng được.
  - Notification: Đôi giày đang duỗi người ở cửa.

### Tiếng Việt — Unhinged

**deepseek-flash**

- _nhắn nha sĩ đặt lịch khám răng_ (1649 ms, out 218 tok)
  - Monster: Răng Khôn, Cựu Chiến Binh Mọc Lệch — Răng Khôn, kẻ từng tuyên bố mọc thẳng rồi mọc xiên, giờ làm chủ tịch hội đồng quản trị nỗi đau.
  - Hatch: TIN CUỐI: RĂNG KHÔN MỞ PHÒNG KHÁM RIÊNG, NÓ KHÁM CHO CHÍNH NÓ. GỌI NHA SĨ GIÙM TUI ĐI.
  - Notification: Răng Khôn tự khám. Cần nha sĩ khám lại.
- _cọ nhà tắm_ (1770 ms, out 217 tok)
  - Monster: Bọt Biển Kỳ Cựu, Cựu Chiến Binh Mặt Bồn — Nó khoác áo giáp bằng cước, đeo huy chương là mấy sợi tóc còn sót lại. Nó thề sẽ không lui binh.
  - Hatch: TUI ĐÃ PHA SẴN NƯỚC THUỐC RỒI. SÚNG ĐÂY. XỊT THÔI.
  - Notification: Bọt Biển kỳ cựu đã nhập ngũ. Mười phút, bạn ơi.
- _gọi lại cho mẹ_ (1600 ms, out 222 tok)
  - Monster: Bà Tổ Trưởng Chuông Chờ, Trưởng Ban Liên Lạc Của Một Số Máy Đang Rung — Con quái này nuôi một tổng đài nhỏ trong bụng, chuyên phát lại âm thanh "tút… tút…" cho vui tai.
  - Hatch: TUI NHÉT CÁI ĐIỆN THOẠI VÔ TỦ LẠNH RỒI. NÓ RUN. BẤM ĐI.
  - Notification: Số của mẹ đang đứng ngoài cửa. Mở đi.
- _quyết toán thuế_ (2126 ms, out 225 tok)
  - Monster: Vòi Rồng Mã Số Thuế, Trưởng Phòng Đối Chiếu Phụ Lục 08 — Nó sinh ra từ một file Excel bị giằng xé giữa hai người.
  - Hatch: TUI ĐÃ ĐỐI CHIẾU XONG CỘT B. CỘT C KHÔNG CHỊU NÓI CHUYỆN VỚI TUI. MỞ PHỤ LỤC RA ĐI, MÌNH ĐỌC TO LÊN.
  - Notification: Phụ lục 08 vừa họp tổ dân phố.
- _bắt đầu chạy bộ_ (1561 ms, out 232 tok)
  - Monster: Sải Chân, Trưởng Ban Tổ Chức Giải Chạy Vòng Quanh Sân — Quái hình con dấu cao su, chuyên đóng dấu "ĐÃ XUẤT PHÁT" lên mọi thứ, kể cả lên tui.
  - Hatch: TUI VỪA ĐÓNG DẤU XUẤT PHÁT LÊN TRÁN MÌNH. HAI VÒNG QUANH SÂN. TUI CHẠY TRƯỚC ĐÓ NHA.
  - Notification: Sải Chân đã ký sổ rồi. Một vòng thôi.

**deepseek-v4-pro**

- _nhắn nha sĩ đặt lịch khám răng_ (2830 ms, out 226 tok)
  - Monster: Răng Khôn, Cư Dân Trốn Việc Của Hộp Thư — Nó đã bám trụ trong hộp thư lâu tới mức dọn được cả một góc bếp, nấu nướng bằng nước súc miệng.
  - Hatch: Tui vừa thấy Răng Khôn mở quán cà phê ngay trong ô chat của nha sĩ. Mười phút, mình tới đóng cửa quán nó.
  - Notification: Răng Khôn đang họp tổ dân phố, cần một cái tin nhắn.
- _quyết toán thuế_ (3253 ms, out 235 tok)
  - Monster: Tờ Khai Lưu Trú Tạm Vắng — Nó cư trú trái phép trong ngăn kéo, có sổ hộ khẩu riêng, và giấy chứng nhận quyền sử dụng bụi.
  - Hatch: CẬP NHẬT: Tờ khai vừa đổi tên thành "Tờ Khai Vẫn Ổn Rồi Mà". Bằng chứng giả. Mình bắt nó khai lại.
  - Notification: Tờ Khai đang gõ cửa. Tui đứng sau nó, tay cầm bút, mắt long lanh.
- _cọ nhà tắm_ (3049 ms, out 183 tok)
  - Monster: Đám Bọt Xà Phòng Vô Gia Cư — Sổ hộ khẩu tạm trú trên tường nhà tắm.
  - Hatch: Tui vừa thắng một trận vật tay với cái vòi sen. Nó khóc ra nước nóng. Còn bạn, cầm bàn chải lên đi.
  - Notification: Nhà tắm kêu cứu rồi đó.
- _bắt đầu chạy bộ_ (3652 ms, out 240 tok)
  - Monster: Đôi Giày Chạy Bộ Tự Ý Thức — Hôm qua tui nghe tiếng dây giày đập cửa lúc ba giờ sáng. Nó hỏi mình đi đâu mà lâu vậy.
  - Hatch: TIN NÓNG: đôi giày chạy vừa tự đi mua bánh mì. Nó về với một gói xôi và thái độ rất thách thức. Ra bắt nó chạy vài vòng đi!
  - Notification: Đôi giày đang gõ dây loạn xạ ngoài hiên. Tui nghi nó lên kế hoạch chạy trốn.
- _gọi lại cho mẹ_ (3910 ms, out 299 tok)
  - Monster: Máy Tự Động Trả Lời Nằm Vùng Trong Hộp Thoại của Mẹ — Con quái này ăn sạch mấy tin nhắn bạn soạn xong rồi xóa trước khi bấm gửi. Nó đang tuyên bố hộp thư thoại là lãnh thổ riêng và treo cờ "Bận, gọi lại sau" bằng giọng của chính bạn.
  - Hatch: TUI MỚI PHÁT HIỆN SỐ CỦA MẸ LÀ SỐ NGUYÊN TỐ. Nghe nè: Mình gọi một cuộc thôi, coi ai bắt máy trước — mẹ hay con quái đội giọng bạn.
  - Notification: "Gọi lại cho mẹ" vừa tập hát nghêu ngao ngoài hiên.
