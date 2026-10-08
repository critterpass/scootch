// The eval for a thing that arrives from a website monster. For each thing it does what a visitor
// and then their phone do: the website's maker hatches a monster, the monster is given a page,
// and the thing is sent through the task call with that page (stage one, the name, the pack).
//   SCOOTCH_API_URL=http://localhost:8787 pnpm --filter @scootch/voice eval:adopted
//   EVAL_LANGUAGES=vi narrows the run.
// It checks that the monster comes back as itself (name, card line, seed and body), that the kind
// line and the hatch line written about it pass the voice check, and that the pack is whole. The
// page is taken down again afterwards. It exits non-zero when any monster comes back changed or
// when fewer than 96% of the written lines pass. The maker naps after twelve hatches in a row from
// one address, so each language has five things.
import {
  taskCreateNameResponseSchema,
  taskCreatePackResponseSchema,
  taskCreateStartResponseSchema,
} from '@scootch/domain';

import { checkLine } from '../../src/index.ts';
import { baseUrl, languages, pooled, post, share, spread, startTask } from '../shared.mjs';

const passBar = 0.96;
const attitude = 'cheeky';
const things = {
  en: [
    'email the dentist about Thursday',
    'pair the socks on the bedroom chair',
    'reply to Sam about the weekend',
    'take the recycling out of the hall',
    'renew the car insurance',
  ],
  vi: [
    'gửi email cho nha sĩ về lịch thứ Năm',
    'gấp đống quần áo trên ghế',
    'trả lời tin nhắn của chị Lan',
    'đem rác tái chế ra ngoài',
    'gia hạn bảo hiểm xe máy',
  ],
};

async function unshare(id, token) {
  await fetch(`${baseUrl}/v1/monster-share/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}

/** One thing, from the website's maker to the phone's pack. Returns what went wrong, and timings. */
async function arrive(language, token, text) {
  const made = await post('/v1/monster-make', { text, language, attitude });
  if (made.status !== 200 || made.json?.result !== 'monster') {
    return { text, skipped: `the maker gave no monster (HTTP ${made.status})` };
  }
  const { seed, bodyType, name, flavourText, signature } = made.json;
  const page = await post('/v1/monster-share', {
    seed,
    bodyType,
    name,
    flavourText,
    language,
    signature,
    typed: text,
  });
  if (page.status !== 200 || typeof page.json?.id !== 'string') {
    return { text, skipped: `the monster got no page (HTTP ${page.status})` };
  }

  const failed = [];
  const lines = { written: 0, passed: 0 };
  let nameMs;
  try {
    const start = await startTask(language, token, text, { attitude, monsterPage: page.json.id });
    const first = taskCreateStartResponseSchema.safeParse(start.json);
    if (start.status !== 200 || !first.success || first.data.verdict !== 'pass') {
      return { text, failed: [`stage one: HTTP ${start.status}`], lines };
    }
    if (first.data.labels.bodyType !== bodyType) failed.push('body changed');

    const named = await post(
      '/v1/task-create/name',
      { continuation: first.data.continuation.token },
      token,
    );
    nameMs = named.ms;
    const second = taskCreateNameResponseSchema.safeParse(named.json);
    if (named.status !== 200 || !second.success) {
      return { text, failed: [...failed, `name: HTTP ${named.status}`], lines, nameMs };
    }
    const { monster, hatch, continuation } = second.data;
    if (monster.name !== name) failed.push('name changed');
    if (monster.flavourText !== flavourText) failed.push('card line changed');
    if (monster.signed?.seed !== seed) failed.push('seed changed');
    for (const [kind, written] of [
      ['monsterTitle', monster.title],
      ['hatch', hatch],
    ]) {
      lines.written += 1;
      const check = checkLine({ text: written, kind, language, attitude });
      if (check.ok) lines.passed += 1;
      else failed.push(`voice (${kind}): ${check.reasons.join(' ')}`);
    }

    const packed = await post('/v1/task-create/pack', { continuation: continuation.token }, token);
    if (packed.status !== 200 || !taskCreatePackResponseSchema.safeParse(packed.json).success) {
      failed.push(`pack: HTTP ${packed.status}`);
    }
  } finally {
    await unshare(page.json.id, page.json.unshareToken);
  }
  return { text, failed, lines, nameMs };
}

let changed = 0;
let written = 0;
let passed = 0;
let asked = 0;
const nameTimes = [];
for (const language of languages) {
  const jobs = (things[language] ?? []).map((text) => (token) => arrive(language, token, text));
  for (const result of await pooled(language, jobs)) {
    if (result.skipped !== undefined) {
      console.log(`[${language}] skipped: ${result.skipped}`);
      continue;
    }
    asked += 1;
    written += result.lines.written;
    passed += result.lines.passed;
    nameTimes.push(result.nameMs);
    if (result.failed.some((reason) => reason.endsWith('changed'))) changed += 1;
    if (result.failed.length > 0) console.log(`[${language}] ${result.failed.join('; ')}`);
  }
}

console.log(`API: ${baseUrl}`);
console.log(`Monsters that arrived as themselves: ${share(asked - changed, asked)}`);
console.log(`Written lines that pass the voice check: ${share(passed, written)}`);
console.log(`Name step, ms: ${spread(nameTimes)}`);
if (asked === 0) {
  console.error('No monster could be made: nothing was checked.');
  process.exit(1);
}
if (changed > 0 || (written > 0 && passed / written < passBar)) process.exit(1);
