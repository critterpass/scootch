import type { TaskCreateRequest } from '@scootch/domain';
import { wordsOf } from '@scootch/voice';

import { ApiError } from '../../errors';
import { generate } from '../deepseek';

import { record, unwritable, type TaskCreateContext } from './context';
import { fitTheGapNote, notePrompt, pickSystem } from './prompt';
import { pickOutputSchema, type PickOutput } from './schema';
import { oneThingProblem, sortThings, type OneThingProblem, type SortedThings } from './things';

/** A note this short is taken to be one task, so it can stand as the one thing in its own words. */
export const ownWordsAtMost = 8;

async function ask(
  context: TaskCreateContext,
  request: TaskCreateRequest,
  problem?: OneThingProblem,
  steer?: string,
): Promise<PickOutput> {
  const generated = await generate(
    { apiKey: context.env.DEEPSEEK_API_KEY },
    {
      // Choosing among things the note already names is selection, not writing.
      tier: 'fast',
      system: pickSystem(request.language),
      prompt: [
        notePrompt(
          request,
          request.energy === 'guess' ? 'unknown' : request.energy,
          problem === undefined ? undefined : [{ slot: 'oneThing', reasons: [problem] }],
        ),
        ...(steer === undefined ? [] : [steer]),
      ].join('\n\n'),
      tool: { name: 'pick_task', description: "Return today's one thing and the rest, sorted." },
      schema: pickOutputSchema,
      maxTokens: 900,
    },
  );
  await record(context, generated);
  return generated.output;
}

/**
 * The fast pick: today's one thing, the parked rest and the dates heard, with every thing and
 * date checked in code against the note. A one thing the note never named, or one already turned
 * down, is asked for once more with the reason. A short note stands in its own words when the
 * rewording strays or no model answers.
 */
export async function pickThings(
  context: TaskCreateContext,
  request: TaskCreateRequest,
): Promise<SortedThings> {
  const ownWords = request.text.trim();
  const short = wordsOf(ownWords).length <= ownWordsAtMost;
  const settle = (output: PickOutput): PickOutput =>
    short && oneThingProblem(output.oneThing, request) === 'not_in_text'
      ? { ...output, oneThing: ownWords }
      : output;

  let output: PickOutput;
  try {
    output = settle(await ask(context, request));
  } catch (error) {
    if (!(error instanceof ApiError) || !short || oneThingProblem(ownWords, request) !== null) {
      throw error;
    }
    console.warn('task not picked', { requestId: context.requestId, reason: error.code });
    output = { oneThing: ownWords, parked: [], dated: [] };
  }

  let problem = oneThingProblem(output.oneThing, request);
  if (problem !== null) {
    console.warn('task pick refused', { requestId: context.requestId, problem });
    try {
      const second = settle(await ask(context, request, problem));
      const secondProblem = oneThingProblem(second.oneThing, request);
      if (secondProblem === null) [output, problem] = [second, null];
    } catch (error) {
      console.warn('task not picked', {
        requestId: context.requestId,
        reason: error instanceof ApiError ? error.code : 'internal',
      });
    }
  }
  if (problem !== null) throw unwritable(context, problem);
  return sortThings(output, request);
}

/**
 * The pick asked once more for a thing that fits the minutes left before getting ready, with the
 * first one thing turned down. `null` when no model answers or its one thing cannot be used: the
 * first pick then stands.
 */
export async function pickToFit(
  context: TaskCreateContext,
  request: TaskCreateRequest,
  gapMinutes: number,
  tooLong: string,
): Promise<SortedThings | null> {
  const asked = { ...request, declined: [...(request.declined ?? []), tooLong].slice(-10) };
  try {
    const output = await ask(
      context,
      asked,
      undefined,
      fitTheGapNote(request.language, gapMinutes),
    );
    return oneThingProblem(output.oneThing, asked) === null ? sortThings(output, request) : null;
  } catch (error) {
    console.warn('task not picked to fit', {
      requestId: context.requestId,
      reason: error instanceof ApiError ? error.code : 'internal',
    });
    return null;
  }
}
