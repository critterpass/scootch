import { useRouter } from 'expo-router';
import { specFromSeed } from '@scootch/art';
import type { DrawerItemRow, MonsterRow, TaskRow } from '@scootch/domain';
import type { Language } from '@scootch/i18n';
import { offlineLine, offlineMonsterName, offlinePacks } from '@scootch/voice';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { DrawerSheet } from '../drawer/drawer-sheet';
import type { Stage } from '../one-screen/one-screen-stage';
import { OneScreenView } from '../one-screen/one-screen-view';
import { stageShown, type StageActions } from '../one-screen/stage-shown';

// The states between a ramble and a set task, as the screen registry shows them: the real views
// drawn from fixed data with no store behind them. Scootch's words come from the offline pack in
// the capture's language; everything else is what a person might have said.

const TODAY = '2026-10-06';
const nothing = () => undefined;
const NO_ACTIONS: StageActions = {
  answerEnergy: nothing,
  another: nothing,
  accept: nothing,
  peek: nothing,
  answerDeadline: nothing,
  pickAgain: nothing,
  takePick: nothing,
  smaller: nothing,
  deal: nothing,
  tooBig: nothing,
  catchIt: nothing,
  revealDone: nothing,
};

/** What the person said, in each language. None of it is anything Scootch says. */
const SAID = {
  en: {
    task: 'Email the dentist about Thursday',
    parked: ['Call mum back', 'Bathroom', 'Start running', 'Reply to Sam'],
    dated: 'Council tax',
    heardAs: 'due on Friday',
    excuse: "I'm wiped",
  },
  vi: {
    task: 'Gửi email cho nha sĩ về lịch thứ Năm',
    parked: ['Gọi lại cho mẹ', 'Dọn nhà tắm', 'Bắt đầu chạy bộ', 'Trả lời Lan'],
    dated: 'Đóng tiền điện',
    heardAs: 'hạn thứ Sáu',
    excuse: 'Mình đuối rồi',
  },
} as const satisfies Record<Language, unknown>;

/** Things parked in the drawer, in each language; the first and third carry a date. */
const PARKED = {
  en: [
    'Council tax',
    'Call mum back',
    'Book the MOT',
    'Bathroom',
    'Start running',
    'Reply to Sam',
    'Renew the passport',
    'Return the parcel',
    'Water the plants',
    'Back up the laptop',
    'Email the landlord',
    'Sort the receipts',
  ],
  vi: [
    'Đóng tiền điện',
    'Gọi lại cho mẹ',
    'Đăng kiểm xe',
    'Dọn nhà tắm',
    'Bắt đầu chạy bộ',
    'Trả lời Lan',
    'Gia hạn hộ chiếu',
    'Trả lại bưu kiện',
    'Tưới cây',
    'Sao lưu laptop',
    'Nhắn chủ nhà',
    'Sắp xếp hoá đơn',
  ],
} as const satisfies Record<Language, readonly string[]>;

/** `count` parked things for the drawer's own states; the second is a heavy one when asked. */
function drawerOf(language: Language, count: number, heavySecond = false): DrawerItemRow[] {
  return PARKED[language].slice(0, count).map((text, index) => {
    const dueDate = index === 0 ? '2026-10-09' : index === 2 ? '2026-10-30' : null;
    return {
      id: `capture-drawer-${index}`,
      text,
      screen: heavySecond && index === 1 ? 'serious' : 'pass',
      dueDate,
      firstMentionedOn: TODAY,
      lastMentionedOn: TODAY,
      returnOn: index === 0 ? '2026-10-08' : index === 2 ? '2026-10-23' : null,
      fadesOn: dueDate === null ? '2026-10-20' : null,
      createdAt: '2026-10-06T09:00:00.000Z',
    };
  });
}

export function fixtures(language: Language) {
  const said = SAID[language];
  const task: TaskRow = {
    id: 'capture-task',
    localDate: TODAY,
    text: said.task,
    originalText: said.task,
    source: 'ramble',
    screen: 'pass',
    seriousOverridden: false,
    status: 'set',
    carriedOver: false,
    firstMentionedOn: TODAY,
    dueDate: null,
    workMode: null,
    fitsTenMinutes: null,
    sharePrivate: null,
    shrinkCount: 0,
    lines: null,
    notifications: [],
    createdAt: '2026-10-06T09:00:00.000Z',
    finishedAt: null,
  };
  const monster: MonsterRow = {
    id: 'capture-monster',
    taskId: task.id,
    origin: 'task',
    spec: specFromSeed('tooth', 'tooth'),
    name: offlineMonsterName(language, 'tooth', 1),
    title: offlinePacks[language].monsterTitles[0],
    flavourText: offlineLine(language, 'cheeky', 'flavourText'),
    hatchedAt: task.createdAt,
    caughtAt: null,
    caughtOn: null,
    number: null,
    rarity: null,
    daysLurked: null,
    catchMinutes: null,
    dread: null,
    finish: 'standard',
  };
  const item = (text: string, index: number, dueDate: string | null): DrawerItemRow => ({
    id: `capture-item-${index}`,
    text,
    screen: 'pass',
    dueDate,
    firstMentionedOn: TODAY,
    lastMentionedOn: TODAY,
    returnOn: dueDate === null ? null : '2026-10-08',
    fadesOn: dueDate === null ? '2026-10-20' : null,
    createdAt: task.createdAt,
  });
  const drawer = [
    item(said.dated, 0, '2026-10-09'),
    ...said.parked.map((text, index) => item(text, index + 1, null)),
  ];
  const deadline = {
    text: said.dated,
    dueDate: '2026-10-09',
    heardAs: said.heardAs,
    line: offlinePacks[language].deadline('cheeky', said.dated, said.heardAs),
  };
  return { said, task, monster, drawer, deadline };
}

type Fixtures = ReturnType<typeof fixtures>;
type Drawable = Parameters<typeof stageShown>[0];

/** One state, drawn from the fixtures of the capture's language. */
function captured(
  stage: (data: Fixtures) => Drawable,
  more: { drawerOpen?: boolean; revealed?: boolean; drawerCount?: number; heavy?: boolean } = {},
) {
  return function Captured() {
    const { language } = useLanguage();
    const router = useRouter();
    const t = useT();
    const data = fixtures(language);
    const drawn = stageShown(stage(data), {
      t,
      language,
      attitude: 'cheeky',
      today: TODAY,
      revealed: more.revealed ?? true,
      actions: NO_ACTIONS,
    });
    return (
      <OneScreenView
        attitude="cheeky"
        offline={false}
        {...drawn}
        overlay={
          more.drawerOpen ? (
            <DrawerSheet
              open
              items={
                more.drawerCount === undefined
                  ? data.drawer
                  : drawerOf(language, more.drawerCount, more.heavy)
              }
              today={TODAY}
              canSwap
              onSwapIn={nothing}
              // The sheet is a window of its own over the registry's way back: it closes the state.
              onClose={() => router.back()}
            />
          ) : null
        }
      />
    );
  };
}

const oneThing = (data: Fixtures, changes: Partial<Extract<Stage, { kind: 'one_thing' }>> = {}) =>
  ({
    kind: 'one_thing',
    task: data.task,
    quiet: false,
    reveal: null,
    deadline: null,
    another: true,
    ...changes,
  }) as const;

export const DumpOneThing = captured((data) => oneThing(data));
export const DumpDeadlineHeard = captured((data) => oneThing(data, { deadline: data.deadline }));
export const DumpSerious = captured((data) =>
  oneThing(data, { quiet: true, task: { ...data.task, screen: 'serious' } }),
);
export const DrawerPeek = captured((data) => oneThing(data), { drawerOpen: true });
export const DrawerEmpty = captured((data) => oneThing(data), { drawerOpen: true, drawerCount: 0 });
export const DrawerThree = captured((data) => oneThing(data), {
  drawerOpen: true,
  drawerCount: 3,
  heavy: true,
});
export const DrawerTwelve = captured((data) => oneThing(data), {
  drawerOpen: true,
  drawerCount: 12,
});
export const DumpEnergyRead = captured(() => ({ kind: 'energy' }));
export const DumpPickForMe = captured((data) => {
  const item = data.drawer.at(-1);
  return item ? { kind: 'picked_for_me', item } : { kind: 'energy' };
});
export const OneScreenBargaining = captured((data) => ({
  kind: 'bargain',
  task: data.task,
  excuse: data.said.excuse,
  ask: { minutes: 5, shrinkCount: 1 },
}));
export const MonsterHatched = captured((data) => ({
  kind: 'hatch',
  task: data.task,
  monster: data.monster,
  shrunk: false,
  canShrink: true,
}));
export const MonsterHatching = captured((data) => ({
  kind: 'hatch',
  task: data.task,
  monster: null,
  shrunk: false,
  canShrink: true,
}));
export const MonsterShrunk = captured((data) => ({
  kind: 'hatch',
  task: { ...data.task, shrinkCount: 3 },
  monster: { ...data.monster, spec: { ...data.monster.spec, size: data.monster.spec.size * 0.46 } },
  shrunk: true,
  canShrink: false,
}));

/** The reveal, held on its first beat: what was said, with the one thing among it. */
export const DumpChoosing = captured(
  (data) =>
    oneThing(data, {
      reveal: {
        phrases: [...data.said.parked.slice(0, 2), data.said.task, data.said.dated],
        chosen: 2,
      },
    }),
  { revealed: false },
);
