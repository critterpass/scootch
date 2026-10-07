import { specFromSeed } from '@scootch/art';
import { MINUTE_MS, type MonsterRow, type ParkedThought } from '@scootch/domain';
import type { Language } from '@scootch/i18n';
import { offlineLine, offlinePacks, type OfflineSlot } from '@scootch/voice';

import type { ShownLine } from '../../../state/day-types';
import type { SessionActions, SessionModel } from '../screens/screen-props';
import type { SessionView } from '../session-view';

/** What the person typed, in each language. None of it is anything Scootch says. */
const TYPED = {
  en: {
    task: 'Email the dentist about Thursday',
    treat: 'coffee',
    thoughts: ['Bin bags', 'Text Priya about Saturday'],
  },
  vi: {
    task: 'Gửi email cho nha sĩ về lịch thứ Năm',
    treat: 'ly cà phê',
    thoughts: ['Túi rác', 'Nhắn Lan về thứ Bảy'],
  },
} as const satisfies Record<Language, unknown>;

// Thirteen minutes to three in the afternoon, as the board draws it.
const PARKED_AT = Date.UTC(2026, 9, 6, 14, 47);

const MONSTER: MonsterRow = {
  id: 'registry-monster',
  taskId: 'registry-task',
  origin: 'task',
  spec: specFromSeed('tooth', 'tooth'),
  name: 'Molar',
  title: 'the Postponed',
  flavourText: '-',
  hatchedAt: '2026-10-06T09:00:00.000Z',
  caughtAt: null,
  caughtOn: null,
  number: null,
  rarity: null,
  daysLurked: null,
  catchMinutes: null,
  dread: null,
  finish: 'standard',
};

export const NO_ACTIONS: SessionActions = {
  leave: () => undefined,
  leaveNow: () => undefined,
  openPark: () => undefined,
  closePark: () => undefined,
  park: () => undefined,
  send: () => undefined,
  startNow: () => undefined,
  finishEarly: () => undefined,
  keepGoing: () => undefined,
  passBurst: () => undefined,
  passMoment: () => undefined,
  passTreat: () => undefined,
  passThoughts: () => undefined,
  sendFinish: () => Promise.resolve(),
  passCaught: () => undefined,
  resolveThought: () => undefined,
  developerEnd: () => undefined,
};

/** A second monster, as one caught earlier in the month looks on the sticker page. */
export function mateMonster(seed: string): MonsterRow {
  return { ...MONSTER, id: `registry-mate-${seed}`, spec: specFromSeed('tooth', seed) };
}

/** A line from the offline pack, as the store would show it with no connection. */
export function packLine(
  language: Language,
  slot: Extract<OfflineSlot, ShownLine['slot']>,
): ShownLine {
  return { slot, text: offlineLine(language, 'cheeky', slot) };
}

/** The plain words a serious task is kept company with. */
export function plainLine(language: Language, slot: 'working' | 'done'): ShownLine {
  const pack = offlinePacks[language].plain;
  return slot === 'done'
    ? { slot: 'done', text: pack.done }
    : { slot: 'working', text: pack.working[0] };
}

export function typed(language: Language) {
  return TYPED[language];
}

export function thoughtsOf(language: Language): ParkedThought[] {
  return TYPED[language].thoughts.map((text, index) => ({
    text,
    parkedAt: PARKED_AT + index * 4 * MINUTE_MS,
  }));
}

/** A ten-minute session with seven minutes left, in one language. A state changes what it needs. */
export function fixtureModel(
  language: Language,
  view: SessionView,
  changes: Partial<SessionModel> = {},
): SessionModel {
  return {
    view,
    quiet: false,
    taskText: TYPED[language].task,
    monster: MONSTER,
    workMode: 'email',
    attitude: 'cheeky',
    plannedMinutes: 10,
    minutesLeft: 7,
    fraction: 0.7,
    line: null,
    tinyNextStep: offlineLine(language, 'cheeky', 'tinyNextStep'),
    treatLine: null,
    thoughtsLine: null,
    // A capture is a still: nothing is mid-flight when the picture is taken.
    reducedMotion: true,
    parkOpen: false,
    parkedNote: null,
    catch: null,
    haptics: false,
    developerEnd: false,
    timeOf: (thought) => {
      const at = new Date(thought.parkedAt);
      return `${at.getUTCHours()}:${String(at.getUTCMinutes()).padStart(2, '0')}`;
    },
    ...changes,
  };
}
