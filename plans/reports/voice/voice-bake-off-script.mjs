import { readFileSync, writeFileSync } from 'node:fs';
const base = process.env.ANTHROPIC_BASE_URL.replace(/\/+$/, '');
const key = process.env.ANTHROPIC_API_KEY;
const H = { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
const G = new URL('./', import.meta.url).pathname;
const guide = { en: readFileSync(G + 'voice-guide-draft-en.md', 'utf8'), vi: readFileSync(G + 'voice-guide-draft-vi.md', 'utf8') };
const tasks = {
  en: ['email the dentist', 'do my taxes', 'clean the bathroom', 'call mum back', 'start running'],
  vi: ['nhắn nha sĩ đặt lịch khám răng', 'quyết toán thuế', 'cọ nhà tắm', 'gọi lại cho mẹ', 'bắt đầu chạy bộ'],
};
const att = { en: ['Soft', 'Cheeky', 'Unhinged'], vi: ['Dịu', 'Láu', 'Điên'] };
const models = process.argv.slice(2);
const tool = { name: 'hatch_monster', description: 'Return the monster and Scootch lines for one task.', input_schema: { type: 'object', required: ['monster_name', 'flavour_text', 'hatch_line', 'notification'], properties: {
  monster_name: { type: 'string' }, flavour_text: { type: 'string' }, hatch_line: { type: 'string' }, notification: { type: 'string' } } } };
const ask = { en: (t, a) => `Task the user set: "${t}". Attitude: ${a}. Write fresh lines for this task (do not reuse the guide's examples): monster name, one sentence of flavour text, the hatch line Scootch says, one notification.`,
  vi: (t, a) => `Việc người dùng đặt: "${t}". Giọng: ${a}. Viết câu mới cho đúng việc này (không dùng lại ví dụ trong bản hướng dẫn): tên quái, một câu giới thiệu quái, câu Scootch nói lúc nở trứng, một thông báo.` };
async function one(model, lang, ai, ti) {
  const t0 = Date.now(); const rec = { requested: model, lang, attitude: att.en[ai], task: tasks[lang][ti] };
  try {
    const r = await fetch(base + '/v1/messages', { method: 'POST', headers: H, body: JSON.stringify({ model, max_tokens: 3000, thinking: { type: 'disabled' }, system: guide[lang],
      tools: [tool], tool_choice: { type: 'tool', name: 'hatch_monster' }, messages: [{ role: 'user', content: ask[lang](tasks[lang][ti], att[lang][ai]) }] }) });
    const j = await r.json(); rec.ms = Date.now() - t0; rec.status = r.status; rec.answered = j.model; rec.usage = j.usage; rec.stop = j.stop_reason;
    const tu = j.content?.find(c => c.type === 'tool_use');
    if (tu) rec.out = tu.input; else { rec.raw = JSON.stringify(j.content ?? j).slice(0, 800); }
  } catch (e) { rec.ms = Date.now() - t0; rec.err = e.message; }
  return rec;
}
const jobs = [];
for (const m of models) for (const lang of ['en', 'vi']) for (let a = 0; a < 3; a++) for (let t = 0; t < 5; t++) jobs.push([m, lang, a, t]);
const res = []; let i = 0;
await Promise.all(Array.from({ length: 5 }, async () => { while (i < jobs.length) { const j = jobs[i++]; res.push(await one(...j)); } }));
writeFileSync('results.json', JSON.stringify(res, null, 1));
const by = {};
for (const r of res) { const k = `${r.requested} -> ${r.answered}`; (by[k] ??= []).push(r); }
for (const [k, v] of Object.entries(by)) { const ms = v.map(x => x.ms).sort((a, b) => a - b); const ok = v.filter(x => x.out);
  const avg = f => Math.round(ok.reduce((s, x) => s + (f(x) || 0), 0) / (ok.length || 1));
  console.log(k, 'n', v.length, 'structured', ok.length, 'p50ms', ms[ms.length >> 1], 'maxms', ms.at(-1), 'in', avg(x => x.usage?.input_tokens), 'out', avg(x => x.usage?.output_tokens), 'cacheRead', avg(x => x.usage?.cache_read_input_tokens)); }
