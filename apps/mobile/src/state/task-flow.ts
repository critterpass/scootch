import { MINUTE_MS, hasStartLeft, type TaskCreateRequest, type TaskRow } from '@scootch/domain';
import { asksToChoose } from '@scootch/voice';

import { careGate } from '../api/care-gate';
import type { TaskCall } from '../api/task-client';

import { arrivedPageOf, handBack, withHandedBackPage } from './arrived-pages';
import { endQuiet, enterCrisis, isQuietDay } from './care-flow';
import type { DayContext, Offer } from './day-types';
import {
  inTheWayField,
  keepInTheWay,
  localTimeField,
  withoutInTheWayWhenHeavy,
} from './in-the-way';
import { pickForMe } from './pick-flow';
import { applyCall, keepTranscript, treatNamed } from './task-answers';
import { keepHeardTime } from './heard-time';
import { askForFinished } from './late-catch';
import { setWithoutAnswer, sortOrphanWords, wordsToAsk } from './late-words';

/** A task waiting for a trusted screen is asked about at most this often. */
export const RESCREEN_EVERY_MS = MINUTE_MS;

function requestFor(ctx: DayContext, offer: Offer, canChoose = false): TaskCreateRequest {
  const { settings, localDate } = ctx.memory.state;
  return {
    language: settings.language,
    attitude: settings.attitude,
    energy: offer.energy,
    text: offer.text,
    source: offer.source,
    localDate,
    timeZone: ctx.deps.timeZone(),
    overrideSerious: false,
    ...localTimeField(ctx),
    ...inTheWayField(offer),
    ...(canChoose ? { canChoose } : {}),
    ...(offer.monsterPage === undefined ? {} : { monsterPage: offer.monsterPage }),
  };
}

const isOnline = (ctx: DayContext) => ctx.deps.online().catch(() => false);

/** How long the person is kept waiting for the model before the day starts without it. */
export const TASK_PATIENCE_MS = 8_000;

/**
 * A ramble or a typed task. The phone's gate runs before anything is sent or written; the call
 * itself is not waited for here.
 */
export async function submitText(ctx: DayContext, sent: Offer): Promise<void> {
  const { today } = ctx.memory.state;
  if (today.kind === 'crisis') return;
  // Another thing is taken on only while the day has a start left for it.
  if (!('task' in today) && !hasStartLeft(today)) return;
  const gate = careGate(sent.text);
  if (gate === 'crisis') {
    await enterCrisis(ctx);
    return ctx.refresh();
  }
  // The next thing typed after the care screen was closed: the quiet is over.
  await endQuiet(ctx);
  const offer = withoutInTheWayWhenHeavy(
    ctx,
    withHandedBackPage(ctx.memory, sent),
    gate === 'hold',
  );

  // With nothing set and things parked, the words may be asking Scootch to choose among them.
  // The phrases the phone knows are answered here, with or without a connection; a looser
  // wording is the server's to read.
  const canChoose = !('task' in today) && ctx.memory.state.drawer.items.length > 0;
  if (canChoose && gate === 'clear' && asksToChoose(offer.text)) {
    ctx.set({ notice: null, line: null });
    return pickForMe(ctx);
  }

  ctx.memory.offer = offer;
  ctx.set({
    taskCall: gate === 'hold' ? 'held' : 'waiting',
    notice: null,
    line: null,
    modelDown: false,
  });
  // The battery the person named is kept for the day, with or without a connection.
  if (offer.energy !== 'guess') {
    const { days } = ctx.deps.repositories;
    const day = await days.get(ctx.memory.state.localDate);
    if (day) await days.put({ ...day, energy: offer.energy });
  }
  const request = requestFor(ctx, offer, canChoose);
  // The answer is waited for outside the queue of events: the drawer, settings and every other
  // tap go on working meanwhile. It comes back as a step of its own, in its turn.
  ctx.later(askWithPatience(ctx, request), ({ online, call }) =>
    applyAnswer(ctx, offer, online, call),
  );
}

/**
 * Asks for the task, for no longer than a person will wait. No connection, an error, the wait
 * running out or the person's cancel all answer `null`.
 */
async function askWithPatience(
  ctx: DayContext,
  request: TaskCreateRequest,
): Promise<{ readonly online: boolean; readonly call: TaskCall | null }> {
  const online = await isOnline(ctx);
  if (!online) return { online, call: null };
  let giveUp: () => void = () => undefined;
  const gaveUp = new Promise<null>((done) => (giveUp = () => done(null)));
  const stopTimer = ctx.deps.timers.set(TASK_PATIENCE_MS, giveUp);
  ctx.memory.stopWaiting = giveUp;
  const asked = ctx.deps.tasks.createTask(request, treatNamed(ctx)).catch(() => null);
  const call = await Promise.race([asked, gaveUp]);
  stopTimer();
  if (ctx.memory.stopWaiting === giveUp) ctx.memory.stopWaiting = null;
  return { online, call };
}

/**
 * The answer to a sent text, in its turn. An answer for words the person has since cancelled, or
 * moved on from by taking something else, is dropped unread. With none, the text becomes the one
 * thing as it is, unscreened: plain company and no monster until the connection returns.
 */
async function applyAnswer(
  ctx: DayContext,
  offer: Offer,
  online: boolean,
  call: TaskCall | null,
): Promise<void> {
  if (ctx.memory.offer !== offer || ctx.memory.state.taskCall === 'idle') return;
  if (call !== null) {
    await applyCall(ctx, call, null);
    await keepHeardTime(ctx, call.first);
  } else {
    await setWithoutAnswer(ctx, offer);
    await keepTranscript(ctx, offer);
    // Nothing else was heard, so there is nothing else to offer. With a connection up, it was
    // the model that did not answer, and Scootch says so.
    ctx.set({ pick: { kind: 'offered', reveal: null }, modelDown: online });
  }
  // Today is read back before the waiting ends, so the composer never shows again in between.
  await ctx.refresh();
  await keepInTheWay(ctx, offer);
  ctx.set({ taskCall: 'idle' });
}

/** Whatever was being waited for is no longer wanted: its answer will be dropped when it comes. */
export function dropTaskCall(ctx: DayContext): void {
  ctx.memory.stopWaiting?.();
  ctx.memory.stopWaiting = null;
  if (ctx.memory.state.taskCall !== 'idle') ctx.memory.offer = null;
  ctx.set({ taskCall: 'idle' });
}

/**
 * "Cancel", while Scootch is thinking: nothing is set, and the words go back to the composer so
 * they are not typed twice.
 */
export function cancelTaskCall(ctx: DayContext): void {
  const { offer } = ctx.memory;
  if (ctx.memory.state.taskCall === 'idle' || offer === null) return;
  dropTaskCall(ctx);
  // A thing that arrived from a monster's page is still that monster's if it is sent again as it is.
  handBack(ctx.memory, offer);
  ctx.set({ returnedText: offer.text, notice: null });
}

/** The one thing is picked: the ramble's words go, unless the person keeps transcripts. */
export async function resolveTranscript(ctx: DayContext): Promise<void> {
  const { transcripts } = ctx.deps.repositories;
  const keep = ctx.memory.state.settings.keepTranscripts;
  for (let one = await transcripts.pending(); one; one = await transcripts.pending()) {
    await transcripts.picked(one.id, keep, ctx.now());
  }
  ctx.memory.offer = null;
}

/** Whether today's task still needs a screen the app can trust before anything funny is said. */
function needsScreen(ctx: DayContext, task: TaskRow): boolean {
  if (task.screen === 'unscreened') return true;
  // A serious answer nobody trusted is asked about again only while the task is still just set.
  return ctx.memory.untrustedTaskId === task.id && task.status === 'set';
}

/**
 * With a connection back, or the app opened again, the task that was waiting is asked for: one
 * with no screen, one screened only by the fallback, one with no monster, one told to be funny.
 * A task waiting for its screen is asked about at most once a minute, until a trusted answer
 * comes; then its comedy and its monster may.
 */
export async function fetchPending(ctx: DayContext): Promise<void> {
  const { today, settings, localDate, monster } = ctx.memory.state;
  // After the care screen was closed nothing is asked about until the next thing is typed.
  if (await isQuietDay(ctx)) return;
  await sortOrphanWords(ctx);
  if (ctx.memory.restPending || ctx.memory.askingPending) return;
  // Today's task comes first; the finished ones nobody has screened are asked about after it.
  if (!('task' in today)) return void (await askForFinished(ctx));
  const { task } = today;
  const screening = needsScreen(ctx, task);
  const waiting =
    screening ||
    (task.screen === 'pass' && monster === null) ||
    // "It's fine, be funny": the task is asked for again, this time with its comedy.
    (task.screen === 'serious' && task.seriousOverridden);
  if (!waiting) return void (await askForFinished(ctx));
  if (!(await isOnline(ctx))) return;
  if (screening) {
    const asked = ctx.memory.screenAskedAt;
    if (asked !== null && ctx.now() - asked < RESCREEN_EVERY_MS) {
      return void (await askForFinished(ctx));
    }
    ctx.memory.screenAskedAt = ctx.now();
  }

  ctx.memory.askingPending = true;
  const text = await wordsToAsk(ctx, task);
  // A thing that arrived from a monster's page is still that monster's, however late it is asked.
  const monsterPage = await arrivedPageOf(ctx, task.id);
  const asked = ctx.deps.tasks
    .createTask(
      {
        language: settings.language,
        attitude: settings.attitude,
        energy: 'guess',
        text,
        source: task.source === 'ramble' || task.source === 'drawer' ? task.source : 'typed',
        localDate,
        timeZone: ctx.deps.timeZone(),
        overrideSerious: task.seriousOverridden,
        ...localTimeField(ctx),
        ...(monsterPage === null ? {} : { monsterPage }),
      },
      treatNamed(ctx),
    )
    .catch(() => null);
  // Not waited for in the queue of events: the answer is its own step when it comes.
  ctx.later(asked, async (call) => {
    ctx.memory.askingPending = false;
    const waiting = await ctx.deps.repositories.tasks.get(task.id);
    // A task swapped out, let go or moved to another day in the meantime gets nothing.
    if (call === null || !waiting || waiting.localDate !== ctx.memory.state.localDate) return;
    ctx.set({ modelDown: false });
    await applyCall(ctx, call, waiting);
    await ctx.refresh();
  });
}

/**
 * "It's fine, be funny": the serious task takes the ordinary path from here on, and is asked for
 * again so that its monster and its own lines can come. A crisis day has no task, so there is
 * nothing here that could override one; and a second screen that calls a crisis still wins.
 */
export async function beFunny(ctx: DayContext): Promise<void> {
  const { today } = ctx.memory.state;
  if (today.kind !== 'serious' || today.session !== null) return;
  await ctx.deps.repositories.tasks.put({ ...today.task, seriousOverridden: true });
  await ctx.deps.repositories.careReminder.clear();
  ctx.set({ pick: { kind: 'none' }, line: null });
  await ctx.refresh();
  if (!ctx.memory.restPending) ctx.later(Promise.resolve(), () => fetchPending(ctx));
}

/**
 * After the one thing is chosen: an ordinary task hatches, and any other is simply set. A task
 * still without its monster or its screening is asked for, without holding anything up.
 */
export function afterPicked(ctx: DayContext): void {
  const { today, monster } = ctx.memory.state;
  const task = 'task' in today ? today.task : null;
  const hatches = today.kind === 'task_set' && task?.screen === 'pass';
  ctx.set({ pick: hatches ? { kind: 'hatching', shrunk: false } : { kind: 'none' } });
  const waiting = task?.screen === 'unscreened' || (hatches && monster === null);
  if (waiting && !ctx.memory.restPending) ctx.later(Promise.resolve(), () => fetchPending(ctx));
}
