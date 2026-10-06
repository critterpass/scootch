import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DecideContext } from '../src/ai/decide';
import { hasSameLetters, lacksVietnameseMarks, restoreMarks } from '../src/ai/vietnamese-marks';

import { connectionDrops, providers, timesOut, type Reply } from './ai-providers';

describe('finding Vietnamese typed without its marks', () => {
  it.each([
    // Typed with no marks at all.
    ['mai nop bai tap toan, chua lam duoc gi ca', true],
    ['goi tho sua may giat', true],
    ['toi nay phai don phong roi rua bat', true],
    ['Khong biet bat dau tu dau', true],
    // Mixed: some words marked, some not.
    ['Chiều nay di cho mua rau, nau com roi rua bat', true],
    ['Mình phải nop bai truoc thứ sáu', true],
    // Properly marked Vietnamese.
    ['Mai nộp bài tập toán, chưa làm được gì cả', false],
    ['Gọi thợ sửa cái máy giặt', false],
    ['Chiều nay đi chợ mua rau, nấu cơm rồi rửa bát', false],
    ['Hôm nay anh em mình đi ăn sau khi tan ca', false],
    // English, and English that happens to hold one such word in a longer note.
    ['Renew my passport before the trip to Japan', false],
    ['Call the plumber about the leak under the sink', false],
    ['Pick up the ad hoc report and email it to the whole team today', false],
    ['Book a table for mai and me on Friday night', false],
    ['', false],
  ])('"%s" lacks marks: %s', (text, expected) => {
    expect(lacksVietnameseMarks(text)).toBe(expected);
  });
});

describe('the same-letters guard on a restored text', () => {
  it.each([
    // Marks added and nothing else.
    ['mai nop bai tap toan', 'mai nộp bài tập toán', true],
    ['goi tho sua may giat.', 'gọi thợ sửa máy giặt.', true],
    ['di cho mua rau', 'đi chợ mua rau', true],
    ['Mình phải nop bai', 'Mình phải nộp bài', true],
    ['gui email cho sep, xong di ngu', 'gửi email cho sếp, xong đi ngủ', true],
    // A word added, dropped, swapped or respelt.
    ['mai nop bai tap toan', 'mai tôi nộp bài tập toán', false],
    ['mai nop bai tap toan', 'mai nộp bài tập', false],
    ['mai nop bai tap toan', 'mai nộp bài tập văn', false],
    ['goi tho sua may giat', 'gọi thợ sửa máy giặc', false],
    // Punctuation changed, an answer in place of the text, or nothing at all.
    ['di cho mua rau', 'đi chợ, mua rau', false],
    ['di cho mua rau', 'Đây là văn bản đã thêm dấu: đi chợ mua rau', false],
    ['di cho mua rau', '', false],
    ['di cho mua rau', '   ', false],
  ])('"%s" restored as "%s" is kept: %s', (original, restored, expected) => {
    expect(hasSameLetters(original, restored)).toBe(expected);
  });
});

describe('restoring marks on the fast tier', () => {
  const typed = 'mai nop bai tap toan';

  function contextFor(deepseek: Reply) {
    const doubles = providers({ jev: connectionDrops, deepseek });
    const context: DecideContext = {
      env: { DB: env.DB, TYPESAFE_API_KEY: 'jev-test-key', DEEPSEEK_API_KEY: 'deepseek-test-key' },
      route: 'test.restore',
      deviceHash: null,
      fetch: doubles.fetch,
    };
    return { context, doubles };
  }

  const restores =
    (text: string): Reply =>
    ({ body }) =>
      Response.json({
        id: 'msg_recorded',
        type: 'message',
        role: 'assistant',
        model: body['model'],
        content: [
          { type: 'tool_use', id: 'call_recorded', name: 'restore_marks', input: { text } },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 180, output_tokens: 24 },
      });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the text with its marks when nothing else changed', async () => {
    const { context, doubles } = contextFor(restores('mai nộp bài tập toán'));

    expect(await restoreMarks(context, typed)).toEqual({
      outcome: 'restored',
      text: 'mai nộp bài tập toán',
    });
    expect(doubles.sent.deepseek[0]?.['model']).toBe('deepseek-flash');
  });

  it.each([
    ['added a word', restores('mai tôi nộp bài tập toán')],
    ['answered the note instead', restores('Bạn nên bắt đầu ngay hôm nay.')],
    ['timed out', timesOut],
    ['could not be reached', connectionDrops],
  ])('reads nothing when the model %s, and logs neither text', async (_, reply) => {
    const logged: unknown[][] = [];
    for (const level of ['log', 'warn', 'error'] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logged.push(args));
    }
    const { context } = contextFor(reply);

    expect(await restoreMarks(context, typed)).toEqual({ outcome: 'unread' });
    expect(JSON.stringify(logged)).not.toContain('nop bai');
    expect(JSON.stringify(logged)).not.toContain('nộp');
  });
});
