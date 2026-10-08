import {
  taskCreateLinesResponseSchema,
  taskCreatePackResponseSchema,
  treatPlaceholder,
  type MonsterCopy,
  type TaskCreateLinesResponse,
  type TaskCreatePackResponse,
} from '@scootch/domain';
import { offlineMonsterName, type LineKind } from '@scootch/voice';

import { ApiError } from '../../errors';
import { shareSigningSecret, signWords } from '../../sharing/signed-words';
import { generate } from '../deepseek';

import { record, type TaskCreateContext, type VoiceCheckSummary } from './context';
import type { ContinuationPayload } from './continuation';
import { writerSystem } from './line-briefs';
import { rewritePrompt, taskPrompt, treatPrompt } from './prompt';
import {
  bitesAt,
  checkWritten,
  failuresIn,
  listAt,
  nameFields,
  offlineFor,
  packFields,
  rewriteSchema,
  schemaFor,
  slotsOf,
  textsFrom,
  tidied,
  type Field,
} from './voice-check';

/** What is written for a monster that arrives already named: its kind line and its hatch line. */
const adoptedFields = nameFields.filter(({ key }) => key === 'title' || key === 'hatch');

type Written = { readonly texts: Map<string, string>; readonly voice: VoiceCheckSummary };

export type TaskNameResult = {
  readonly monster: MonsterCopy;
  readonly hatch: string;
  readonly voice: VoiceCheckSummary;
};
export type TaskPackResult = {
  readonly response: TaskCreatePackResponse;
  readonly voice: VoiceCheckSummary;
};
export type TaskLinesResult = {
  readonly response: TaskCreateLinesResponse;
  readonly voice: VoiceCheckSummary;
};

function reasonOf(error: unknown): string {
  return error instanceof ApiError ? error.code : 'internal';
}

/**
 * Writes the lines of `parts` (each part is one writer call, all made at once) and checks every
 * one. A line that fails the voice check is asked for once more on its own, with the reasons and
 * never the rejected text; a line that fails twice becomes an offline line. When the writer gives
 * nothing at all, every line is an offline line and the name is made in code. This never fails.
 */
async function writeChecked(
  context: TaskCreateContext,
  { oneThing, language, attitude, bodyType, seed, adopted }: ContinuationPayload,
  job: {
    readonly tool: string;
    readonly parts: readonly (readonly Field[])[];
    readonly monsterName: string | null;
    readonly maxTokens: number;
    /** The treat the treat line will be filled with, when it is known before writing. */
    readonly treat?: string | undefined;
  },
): Promise<Written> {
  const config = { apiKey: context.env.DEEPSEEK_API_KEY };
  const slots = job.parts.flatMap(slotsOf);
  // A monster that arrived with its name keeps it in the offline lines too.
  const offlineName = adopted?.name ?? offlineMonsterName(language, bodyType, seed);
  const offline = (slot: { slot: string; kind: LineKind }) =>
    offlineFor(slot, language, attitude, offlineName);
  const named =
    job.monsterName === null
      ? []
      : [
          language === 'vi'
            ? `Con quái tên là "${job.monsterName}".`
            : `The monster is called "${job.monsterName}".`,
        ];

  const answers = await Promise.all(
    job.parts.map(async (fields, index) => {
      try {
        const generated = await generate(config, {
          tier: 'writer',
          // Each half draws its own examples and angles, so the halves do not tell one joke.
          system: writerSystem(
            language,
            attitude,
            seed + index,
            fields.map(({ key }) => key),
          ),
          prompt: [
            taskPrompt(oneThing),
            ...named,
            ...(job.treat !== undefined && fields.some(({ key }) => key === 'treatHandOver')
              ? [treatPrompt(language, job.treat)]
              : []),
          ].join('\n\n'),
          tool: {
            name: `${job.tool}${job.parts.length > 1 ? `_${index + 1}` : ''}`,
            description: 'Return what is asked for about the one thing.',
          },
          schema: schemaFor(fields, language),
          maxTokens: job.maxTokens,
        });
        await record(context, generated);
        return textsFrom(fields, generated.output);
      } catch (error) {
        // The reason only: the answer that failed is never logged.
        console.warn('task lines not written', {
          requestId: context.requestId,
          reason: reasonOf(error),
        });
        return textsFrom(fields);
      }
    }),
  );
  const texts = new Map(answers.flatMap((answer) => [...answer]));
  for (const { slot, kind } of slots)
    texts.set(slot, tidied(texts.get(slot) ?? '', kind, attitude));

  let failures = failuresIn(slots, texts, language, attitude, job.treat);
  if (failures.length === slots.filter(({ optional }) => !optional).length) {
    for (const slot of slots) texts.set(slot.slot, offline(slot));
    return { texts, voice: { attempts: 1, replaced: 0, source: 'offline' } };
  }

  let attempts = 1;
  if (failures.length > 0) {
    // Where and why only: a failure can be logged because it never holds the line.
    console.warn('task voice check failed', {
      requestId: context.requestId,
      failures: failures.map(({ slot, reasons }) => `${slot}: ${reasons.join(' ')}`),
    });
    attempts = 2;
    const nameFailed = failures.some(({ slot }) => slot === 'monster.name');
    // The card and the hatch line call the monster by its name, so a new name means new lines.
    const asked = nameFailed
      ? slots.map(
          (slot) =>
            failures.find((failure) => failure.slot === slot.slot) ?? { ...slot, reasons: [] },
        )
      : failures;
    try {
      const rewritten = await generate(config, {
        tier: 'writer',
        system: writerSystem(
          language,
          attitude,
          seed,
          job.parts.flatMap((fields) => fields.map(({ key }) => key)),
        ),
        prompt: rewritePrompt(
          language,
          oneThing,
          nameFailed ? null : (job.monsterName ?? texts.get('monster.name') ?? null),
          asked,
        ),
        tool: { name: 'write_lines_again', description: 'Return only the lines asked for.' },
        schema: rewriteSchema(asked.map(({ slot }) => slot)),
        maxTokens: 900,
      });
      await record(context, rewritten);
      const accepted = new Map<string, string>();
      for (const { slot, kind } of asked) {
        const text = tidied(rewritten.output[slot] ?? '', kind, attitude);
        if (checkWritten({ text, kind, language, attitude }, job.treat).ok)
          accepted.set(slot, text);
      }
      // A new name is used only with the lines written for it: all of them, or none.
      if (!nameFailed || accepted.size === asked.length) {
        for (const [slot, text] of accepted) texts.set(slot, text);
      }
      failures = failuresIn(slots, texts, language, attitude, job.treat);
    } catch (error) {
      console.warn('task lines not rewritten', {
        requestId: context.requestId,
        reason: reasonOf(error),
      });
    }
  }
  if (failures.length > 0) {
    console.warn('task lines replaced', {
      requestId: context.requestId,
      failures: failures.map(({ slot, reasons }) => `${slot}: ${reasons.join(' ')}`),
    });
    for (const slot of failures) texts.set(slot.slot, offline(slot));
  }
  return { texts, voice: { attempts, replaced: failures.length, source: 'writer' } };
}

/**
 * The first part of stage two: the monster's name and card and the line it hatches with, from
 * one small writer call, so the monster can appear while the rest is still being written. The
 * three words of the card are signed here, whoever wrote them (the writer or the offline pack),
 * so that a public page can later be made from them without screening the server's own comedy.
 */
export async function writeName(
  context: TaskCreateContext,
  payload: ContinuationPayload,
): Promise<TaskNameResult> {
  // A monster made on the website keeps its name, card line and seed: only its kind line and its
  // hatch line are written, about that name.
  const { adopted } = payload;
  const { texts, voice } = await writeChecked(context, payload, {
    tool: adopted ? 'write_kind_and_hatch' : 'write_name',
    parts: [adopted ? adoptedFields : nameFields],
    monsterName: adopted?.name ?? null,
    maxTokens: 400,
  });
  const at = (slot: string) => texts.get(slot) ?? '';
  const words = {
    name: adopted?.name ?? at('monster.name'),
    title: at('monster.title'),
    flavourText: adopted?.flavourText ?? at('monster.flavourText'),
  };
  // The words are vouched for as they leave: with the seed the monster will be drawn from.
  const secret = shareSigningSecret(context.env);
  const signing = adopted
    ? { seed: adopted.seed, language: adopted.language }
    : { seed: crypto.randomUUID(), language: payload.language };
  const signed =
    secret === undefined
      ? {}
      : { signed: { ...signing, signature: await signWords(secret, { ...words, ...signing }) } };
  return { monster: { ...words, ...signed }, hatch: at('lines.hatch'), voice };
}

/**
 * The second part of stage two: every other session line and the day's notifications, about the
 * monster already named. The treat line names the treat when one is passed in, and otherwise
 * keeps the placeholder the phone fills.
 */
export async function writePack(
  context: TaskCreateContext,
  payload: ContinuationPayload & { readonly monsterName: string },
  treat?: string,
): Promise<TaskPackResult> {
  const { texts, voice } = await writeChecked(context, payload, {
    tool: 'write_pack',
    parts: packFields(payload.attitude),
    monsterName: payload.monsterName,
    maxTokens: 1000,
    treat,
  });
  const at = (slot: string) => texts.get(`lines.${slot}`) ?? '';
  const bites = bitesAt(texts);
  const response = taskCreatePackResponseSchema.parse({
    lines: {
      start: at('start'),
      working: listAt(texts, 'lines.working'),
      pickedUp: at('pickedUp'),
      checkIn: at('checkIn'),
      tinyNextStep: at('tinyNextStep'),
      tinierNextSteps: listAt(texts, 'lines.tinierNextSteps'),
      twoMinutesLeft: at('twoMinutesLeft'),
      timeUp: at('timeUp'),
      caught: at('caught'),
      notFinished: at('notFinished'),
      treatHandOver:
        treat === undefined
          ? at('treatHandOver')
          : at('treatHandOver').replaceAll(treatPlaceholder, treat),
      parkedThoughts: at('parkedThoughts'),
      releasedEarly: at('releasedEarly'),
      ...(bites === undefined ? {} : { bites }),
    },
    notifications: listAt(texts, 'notifications').map((text) => ({ text })),
  });
  return { response, voice };
}

/** Stage two in one answer: the name first, then the pack about it. */
export async function writeLines(
  context: TaskCreateContext,
  payload: ContinuationPayload,
): Promise<TaskLinesResult> {
  const name = await writeName(context, payload);
  const pack = await writePack(context, { ...payload, monsterName: name.monster.name });
  return {
    response: taskCreateLinesResponseSchema.parse({
      monster: name.monster,
      lines: { hatch: name.hatch, ...pack.response.lines },
      notifications: pack.response.notifications,
    }),
    voice: {
      attempts: Math.max(name.voice.attempts, pack.voice.attempts),
      replaced: name.voice.replaced + pack.voice.replaced,
      source:
        name.voice.source === 'offline' && pack.voice.source === 'offline' ? 'offline' : 'writer',
    },
  };
}
