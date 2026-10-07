import type { TaskCreateRequest, TaskRow, TaskScreen } from '@scootch/domain';

import type { TaskCall } from '../api/task-client';

import { enterCrisis } from './care-flow';
import type { DayContext, DayMemory, Offer } from './day-types';
import { TASK_TEXT_MAX, newTask, park } from './task-rows';

/** The most the task call takes. */
const WORDS_MAX = 4000;

type Sorted = Extract<TaskCall['first'], { readonly verdict: 'pass' | 'serious' }>;

/** The start of the person's words that fits a task, ending on a whole word. */
export function oneThingFrom(words: string): string {
  const text = words.trim();
  if (text.length <= TASK_TEXT_MAX) return text;
  const cut = text.slice(0, TASK_TEXT_MAX + 1);
  const end = cut.lastIndexOf(' ');
  return (end > 0 ? cut.slice(0, end) : cut.slice(0, TASK_TEXT_MAX)).trim();
}

/**
 * No answer came for the person's words: they become the one thing as they are, as much of them
 * as a task holds, and every word is kept on the phone until the model can sort them.
 */
export async function setWithoutAnswer(ctx: DayContext, offer: Offer): Promise<TaskRow> {
  const { tasks, unsortedWords } = ctx.deps.repositories;
  const task = newTask(ctx, oneThingFrom(offer.text), offer.source, 'unscreened');
  await tasks.put(task);
  await unsortedWords.keep({ taskId: task.id, text: offer.text.trim().slice(0, WORDS_MAX) });
  return task;
}

/** What is asked about for a task still waiting for its answer: everything that was said for it. */
export async function wordsToAsk(ctx: DayContext, task: TaskRow): Promise<string> {
  const kept = await ctx.deps.repositories.unsortedWords.for(task.id);
  return kept?.text ?? task.originalText;
}

/** Things parked from a late answer are never called heavy on the strength of the whole text. */
const parkedScreen = (first: Sorted): TaskScreen =>
  first.verdict === 'pass' && first.trusted !== false ? 'pass' : 'unscreened';

/**
 * The answer for words that were kept: the rest is parked, with its dates, as it would have been
 * had the answer come at once. A task that could only hold the start of a long ramble, and that
 * nobody has started yet, takes the one thing's own words; any other keeps the words it has.
 */
export async function sortKeptWords(
  ctx: DayContext,
  task: TaskRow,
  first: Sorted,
): Promise<TaskRow> {
  const { tasks, unsortedWords } = ctx.deps.repositories;
  const kept = await unsortedWords.for(task.id);
  if (kept === null) return task;
  const screen = parkedScreen(first);
  await park(ctx, first.parked, screen);
  await park(ctx, first.deadlines, screen);
  await unsortedWords.remove(task.id);
  // Words that fitted a task stay exactly as the person put them.
  const cut = kept.text.length > task.originalText.length;
  if (!cut || task.status !== 'set' || task.shrinkCount > 0) return task;
  const { text, dueDate } = first.oneThing;
  const sorted: TaskRow = { ...task, text, originalText: text, dueDate };
  await tasks.put(sorted);
  return sorted;
}

const asking = new WeakMap<DayMemory, Set<string>>();

/**
 * Kept words whose task is gone (let go, or swapped for something else) are still the person's:
 * with a connection, the model sorts them and everything but the one thing is parked. The one
 * thing itself is not brought back: the person already dealt with it.
 */
export async function sortOrphanWords(ctx: DayContext): Promise<void> {
  const { tasks, unsortedWords } = ctx.deps.repositories;
  const kept = await unsortedWords.all();
  if (kept.length === 0 || ctx.memory.state.today.kind === 'crisis') return;
  const inFlight = asking.get(ctx.memory) ?? new Set<string>();
  asking.set(ctx.memory, inFlight);
  for (const words of kept) {
    if (inFlight.has(words.taskId) || (await tasks.get(words.taskId)) !== null) continue;
    if (!(await ctx.deps.online().catch(() => false))) return;
    inFlight.add(words.taskId);
    const { settings, localDate } = ctx.memory.state;
    const request: TaskCreateRequest = {
      language: settings.language,
      attitude: settings.attitude,
      energy: 'guess',
      text: words.text,
      source: 'ramble',
      localDate,
      timeZone: ctx.deps.timeZone(),
      overrideSerious: false,
    };
    const asked = ctx.deps.tasks.createTask(request, { treat: () => null }).catch(() => null);
    ctx.later(asked, async (call) => {
      inFlight.delete(words.taskId);
      if (call === null) return;
      // Only the first stage is wanted: no monster or lines are made for a task that is gone.
      void call.rest.catch(() => undefined);
      void call.name?.catch(() => undefined);
      const { first } = call;
      if (first.verdict === 'crisis') {
        await enterCrisis(ctx);
      } else {
        if (first.verdict !== 'reject' && first.verdict !== 'choose') {
          await park(ctx, first.parked, parkedScreen(first));
          await park(ctx, first.deadlines, parkedScreen(first));
        }
        await unsortedWords.remove(words.taskId);
      }
      await ctx.refresh();
    });
  }
}
