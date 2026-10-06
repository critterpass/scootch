import { specFromSeed } from '@scootch/art';
import {
  MONSTER_BODY_TYPE_IDS,
  isoFromInstant,
  parkThings,
  type MonsterRow,
  type Parkable,
  type TaskCreateRequest,
  type TaskRow,
  type TaskScreen,
} from '@scootch/domain';

import { careGate } from '../api/care-gate';
import type { TaskCall, TaskRest } from '../api/task-client';

import type { DayContext, Offer } from './day-types';

const TASK_TEXT_MAX = 280;

function newTask(ctx: DayContext, text: string, source: Offer['source'], screen: TaskScreen) {
  const { localDate } = ctx.memory.state;
  const task: TaskRow = {
    id: ctx.deps.nextId(),
    localDate,
    text,
    originalText: text,
    source,
    screen,
    seriousOverridden: false,
    status: 'set',
    carriedOver: false,
    firstMentionedOn: localDate,
    dueDate: null,
    workMode: null,
    fitsTenMinutes: null,
    sharePrivate: null,
    shrinkCount: 0,
    lines: null,
    notifications: [],
    createdAt: isoFromInstant(ctx.now()),
    finishedAt: null,
  };
  return task;
}

/** Self-harm language: every task is hidden for the day. The text itself is written nowhere. */
async function markCrisis(ctx: DayContext): Promise<void> {
  const { days, transcripts } = ctx.deps.repositories;
  const day = await days.get(ctx.memory.state.localDate);
  if (day) await days.put({ ...day, status: 'crisis' });
  const transcriptId = ctx.memory.offer?.transcriptId;
  if (transcriptId) await transcripts.remove(transcriptId);
  ctx.memory.offer = null;
}

/** A ramble's words are kept while its one thing is being picked, once they are known to be safe to keep. */
async function keepTranscript(ctx: DayContext, offer: Offer): Promise<void> {
  if (offer.source !== 'ramble' || offer.transcriptId !== null) return;
  const transcriptId = ctx.deps.nextId();
  await ctx.deps.repositories.transcripts.save(transcriptId, offer.text, ctx.now());
  ctx.memory.offer = { ...offer, transcriptId };
}

async function park(ctx: DayContext, things: readonly Parkable[], screen: TaskScreen) {
  if (things.length === 0) return;
  const { drawerItems } = ctx.deps.repositories;
  const parked = parkThings({
    drawer: await drawerItems.all(),
    things,
    screen,
    today: ctx.memory.state.localDate,
    now: ctx.now(),
    nextId: ctx.deps.nextId,
  });
  for (const item of parked) await drawerItems.put(item);
}

function monsterFor(ctx: DayContext, task: TaskRow, rest: Extract<TaskRest, { verdict: 'pass' }>) {
  // The body comes from the task's meaning; with no label, the task's own id picks one.
  const roll = [...task.id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  const bodyType =
    rest.labels.bodyType ?? MONSTER_BODY_TYPE_IDS[roll % MONSTER_BODY_TYPE_IDS.length] ?? 'slime';
  const monster: MonsterRow = {
    id: ctx.deps.nextId(),
    taskId: task.id,
    origin: 'task',
    spec: specFromSeed(bodyType, task.id),
    ...rest.monster,
    hatchedAt: isoFromInstant(ctx.now()),
    caughtAt: null,
    caughtOn: null,
    number: null,
    rarity: null,
    daysLurked: null,
    catchMinutes: null,
    dread: null,
    finish: 'standard',
  };
  return monster;
}

/**
 * Writes what a task call answered. `existing` is a task already on the phone that was waiting for
 * its answer: its words stay exactly as the person typed them.
 */
async function applyCall(ctx: DayContext, call: TaskCall, existing: TaskRow | null) {
  const { repositories } = ctx.deps;
  const { first } = call;
  const offer = ctx.memory.offer;

  if (first.verdict === 'crisis' || first.verdict === 'reject') {
    if (existing) await repositories.forgetTask(existing.id);
    if (first.verdict === 'crisis') return markCrisis(ctx);
    ctx.memory.offer = null;
    return ctx.set({ notice: 'say_it_another_way' });
  }

  const screen = first.verdict;
  let task: TaskRow = existing
    ? { ...existing, screen, seriousOverridden: first.seriousOverridden }
    : {
        ...newTask(ctx, first.oneThing.text, offer?.source ?? 'typed', screen),
        seriousOverridden: first.seriousOverridden,
        dueDate: first.oneThing.dueDate,
      };
  await repositories.tasks.put(task);
  if (!existing) {
    await park(ctx, [...first.parked, ...first.deadlines], screen);
    const day = await repositories.days.get(task.localDate);
    if (day) await repositories.days.put({ ...day, energy: first.energy });
    if (offer) await keepTranscript(ctx, offer);
    ctx.set({ heardDeadlines: first.deadlines });
  }
  // The first stage is on the screen while the rest is on its way.
  await ctx.refresh();

  const rest = await call.rest.catch(() => null);
  if (rest === null || rest.verdict !== screen) return;
  if (rest.verdict === 'serious') {
    await repositories.tasks.put({ ...task, lines: rest.lines });
    return;
  }
  task = {
    ...task,
    lines: rest.lines,
    notifications: [...rest.notifications],
    workMode: rest.labels.workMode,
    fitsTenMinutes: rest.labels.fitsTenMinutes,
    sharePrivate: rest.labels.sharePrivate,
  };
  await repositories.tasks.put(task);
  await repositories.monsters.removeWhere('taskId', task.id);
  await repositories.monsters.put(monsterFor(ctx, task, rest));
  ctx.set({ line: { slot: 'hatch', text: rest.lines.hatch } });
}

function requestFor(ctx: DayContext, offer: Offer): TaskCreateRequest {
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
    ...(offer.declined.length > 0 ? { declined: offer.declined.slice(-10) } : {}),
  };
}

const isOnline = (ctx: DayContext) => ctx.deps.online().catch(() => false);

/**
 * A ramble or a typed task. The phone's gate runs before anything is sent or written. With no
 * answer from the server, the text becomes the one thing as it is, unscreened: plain company and
 * no monster until the connection returns.
 */
export async function submitText(ctx: DayContext, offer: Offer): Promise<void> {
  if (ctx.memory.state.today.kind === 'crisis') return;
  const gate = careGate(offer.text);
  if (gate === 'crisis') {
    await markCrisis(ctx);
    return ctx.refresh();
  }

  ctx.memory.offer = offer;
  ctx.set({ taskCall: gate === 'hold' ? 'held' : 'waiting', notice: null, line: null });
  const call = (await isOnline(ctx))
    ? await ctx.deps.tasks.createTask(requestFor(ctx, offer)).catch(() => null)
    : null;

  if (call !== null) {
    await applyCall(ctx, call, null);
  } else {
    const text = offer.text.trim().slice(0, TASK_TEXT_MAX);
    await ctx.deps.repositories.tasks.put(newTask(ctx, text, offer.source, 'unscreened'));
    await keepTranscript(ctx, offer);
  }
  ctx.set({ taskCall: 'idle' });
  await ctx.refresh();
}

/** "Another": the offered thing leaves no trace and the same text is asked again without it. */
export async function askAnother(ctx: DayContext): Promise<void> {
  const { offer } = ctx.memory;
  const { today } = ctx.memory.state;
  if (!offer || !('task' in today) || today.task.status !== 'set') return;
  await ctx.deps.repositories.forgetTask(today.task.id);
  await submitText(ctx, { ...offer, declined: [...offer.declined, today.task.text] });
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

/** With a connection back, the task that was waiting is screened and gets its lines and monster. */
export async function fetchPending(ctx: DayContext): Promise<void> {
  const { today, settings, localDate, monster } = ctx.memory.state;
  if (!('task' in today)) return;
  const { task } = today;
  const waiting = task.screen === 'unscreened' || (task.screen === 'pass' && monster === null);
  if (!waiting || !(await isOnline(ctx))) return;

  const call = await ctx.deps.tasks
    .createTask({
      language: settings.language,
      attitude: settings.attitude,
      energy: 'guess',
      text: task.originalText,
      source: task.source === 'ramble' ? 'ramble' : 'typed',
      localDate,
      timeZone: ctx.deps.timeZone(),
      overrideSerious: task.seriousOverridden,
    })
    .catch(() => null);
  if (call === null) return;
  await applyCall(ctx, call, task);
  await ctx.refresh();
}
