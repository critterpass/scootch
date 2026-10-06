import type { TableSeat } from '@scootch/domain';

import { NamePage, SignInPage } from '../account/account-page';
import { FriendsPage } from '../friends/friends-page';
import { HauntReceivedPage, HauntSendPage } from '../haunt/haunt-pages';
import { PrivacyPage } from '../privacy/privacy-page';

import { JoinPage, LobbyPage, type JoinProblem } from './lobby-page';
import { SeatSheet } from './seat-sheet';
import { TablePage, type TablePageProps } from './table-page';
import type { TableNotice } from './table-store';
import { TableStripView } from './table-strip';

// The together screens as the screen registry shows them: the real views with fixed state and no
// server behind them. Names and labels are what the server would send, not anyone's task.

const nothing = () => undefined;
const YOU = 'aaaaaaaaaaaa';
const seat = (userId: string, name: string, label: string, online = true): TableSeat => ({
  userId,
  name,
  label,
  online,
  nudgesLeft: 3,
});
const ALONE = [seat(YOU, 'Priya', 'admin')];
const FULL = [
  ...ALONE,
  seat('bbbbbbbbbbbb', 'Dana', 'writing'),
  seat('cccccccccccc', 'Kofi', 'admin'),
  seat('dddddddddddd', 'Mei', 'tidying'),
];
const FRIENDS = [
  { accountId: 'bbbbbbbbbbbb', displayName: 'Dana', canBeHaunted: true },
  { accountId: 'cccccccccccc', displayName: 'Kofi', canBeHaunted: true },
];

interface TableShown {
  readonly seats?: readonly TableSeat[];
  readonly notice?: TableNotice;
  readonly status?: TablePageProps['table']['status'];
  readonly nudgesLeft?: number;
  readonly hidden?: boolean;
  readonly sheet?: 'seat' | 'report';
}

function Table({
  seats = FULL,
  notice,
  status,
  nudgesLeft = 3,
  hidden = false,
  sheet,
}: TableShown) {
  const mine = hidden
    ? seats.map((one) => (one.userId === YOU ? { ...one, label: 'busy' } : one))
    : seats;
  return (
    <>
      <TablePage
        table={{
          status: status ?? 'online',
          you: YOU,
          seats: mine,
          nudgesLeft,
          hidden,
          notice: notice ?? null,
        }}
        workMode="paperwork"
        chosen={seats[2]?.userId ?? null}
        timer={{ kind: 'start', minutes: 10 }}
        onChoose={nothing}
        onSeatSheet={nothing}
        onNudge={nothing}
        onInvite={nothing}
        onTimer={nothing}
        onShowLabel={nothing}
        onDismiss={nothing}
        onLeave={nothing}
        onClose={nothing}
      />
      <SeatSheet
        seat={sheet === undefined ? null : (seats[1] ?? null)}
        muted={false}
        reporting={sheet === 'report'}
        result={null}
        onMute={nothing}
        onReport={nothing}
        onBlock={nothing}
        onLeave={nothing}
        onClose={nothing}
      />
    </>
  );
}

function Lobby({ plus }: { readonly plus: boolean }) {
  return (
    <LobbyPage
      plus={plus}
      seated={false}
      busy={false}
      notice={null}
      onOpen={nothing}
      onLocked={nothing}
      onJoin={nothing}
      onBack={nothing}
      onFriends={nothing}
      onClose={nothing}
    />
  );
}

const Join = ({ problem }: { readonly problem: JoinProblem }) => (
  <JoinPage problem={problem} onAgain={nothing} onClose={nothing} />
);

function Friends({ empty }: { readonly empty: boolean }) {
  return (
    <FriendsPage
      friends={empty ? [] : FRIENDS}
      canBeHaunted
      notice={null}
      onCanBeHaunted={nothing}
      onInvite={nothing}
      onRemove={nothing}
      onBlock={nothing}
      onClose={nothing}
    />
  );
}

export const TOGETHER_CAPTURES = {
  'lobby-free': () => <Lobby plus={false} />,
  'lobby-plus': () => <Lobby plus />,
  'waiting-alone': () => <Table seats={ALONE} />,
  'full-table': () => <Table />,
  'nudge-received': () => <Table notice={{ kind: 'nudged', from: 'cccccccccccc' }} />,
  'someone-left': () => <Table seats={FULL.slice(0, 3)} notice={{ kind: 'left', name: 'Mei' }} />,
  'nudge-limit': () => (
    <Table nudgesLeft={0} notice={{ kind: 'nudge_limit', to: 'cccccccccccc' }} />
  ),
  reconnecting: () => <Table status="reconnecting" />,
  replaced: () => <Table status="replaced" />,
  'label-hidden': () => <Table hidden />,
  'seat-sheet': () => <Table sheet="seat" />,
  report: () => <Table sheet="report" />,
  'join-ended': () => <Join problem="link_ended" />,
  'join-full': () => <Join problem="full" />,
  'join-banned': () => <Join problem="banned" />,
  'join-unreachable': () => <Join problem="unreachable" />,
  'sign-in': () => <SignInPage busy={false} failed={false} onSignIn={nothing} onClose={nothing} />,
  name: () => <NamePage busy={false} problem={null} onSave={nothing} onClose={nothing} />,
  'name-refused': () => (
    <NamePage busy={false} problem="refused" onSave={nothing} onClose={nothing} />
  ),
  friends: () => <Friends empty={false} />,
  'friends-empty': () => <Friends empty />,
  'haunt-send': () => (
    <HauntSendPage
      friends={FRIENDS}
      to="cccccccccccc"
      dare="two_minutes"
      anonymous={false}
      busy={false}
      sent={false}
      problem={null}
      onTo={nothing}
      onDare={nothing}
      onAnonymous={nothing}
      onSend={nothing}
      onClose={nothing}
    />
  ),
  'haunt-received': () => (
    <HauntReceivedPage
      bodyType="receipt"
      seed="0f3a9c2e7b1d"
      dare="two_minutes"
      from="Priya"
      busy={false}
      onCatch={nothing}
      onShoo={nothing}
    />
  ),
  'session-strip': () => (
    <TableStripView seats={FULL} you={YOU} workMode="paperwork" reconnecting={false} />
  ),
  'session-strip-reconnecting': () => (
    <TableStripView seats={FULL} you={YOU} workMode="paperwork" reconnecting />
  ),
  'privacy-account': () => (
    <PrivacyPage
      keepTranscripts={false}
      notice={null}
      accountName="Priya"
      onKeepTranscripts={nothing}
      onExport={nothing}
      onAskDelete={nothing}
      onClose={nothing}
    />
  ),
} as const;

export type TogetherCapture = keyof typeof TOGETHER_CAPTURES;
