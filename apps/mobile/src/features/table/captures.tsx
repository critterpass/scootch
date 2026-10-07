import { specFromSeed } from '@scootch/art';
import type { TableSeat } from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';
import { NamePage, SignInCancelledPage, SignInPage } from '../account/account-page';
import { FriendsPage } from '../friends/friends-page';
import { HauntReceivedPage, HauntSendPage } from '../haunt/haunt-pages';
import { PrivacyPage } from '../privacy/privacy-page';

import { InvitePage } from './invite-page';
import { JoinPage, type JoinProblem } from './join-page';
import { LobbyPage } from './lobby-page';
import { SeatSheet } from './seat-sheet';
import { TableMenuSheet } from './table-menu-sheet';
import { TablePage, tableSummary, type TablePageProps } from './table-page';
import { TABLE_SETTINGS_CAPTURES } from './settings-captures';
import type { TableNotice } from './table-store';
import { TableStripView } from './table-strip';

// The together screens as the screen registry shows them: the real views with fixed state and no
// server behind them. Names and labels are what the server would send, not anyone's task.

const nothing = () => undefined;
const YOU = 'aaaaaaaaaaaa';
const seat = (
  userId: string,
  name: string,
  label: string,
  workMode: TableSeat['workMode'],
): TableSeat => ({ userId, name, label, workMode, online: true, nudgesLeft: 3 });
const ALONE = [seat(YOU, 'Priya', 'admin', 'paperwork')];
const FULL = [
  ...ALONE,
  seat('bbbbbbbbbbbb', 'Dana', 'writing', 'writing'),
  seat('cccccccccccc', 'Kofi', 'admin', 'paperwork'),
  seat('dddddddddddd', 'Mei', 'tidying', 'decluttering'),
];
const FRIENDS = [
  { accountId: 'bbbbbbbbbbbb', displayName: 'Dana', canBeHaunted: true },
  { accountId: 'cccccccccccc', displayName: 'Kofi', canBeHaunted: true },
];
/** A friend's open table, as the server lists it. */
const KOFIS_TABLE = {
  tableId: 'abcdefghijklmnop',
  openSeats: 2,
  friends: [{ accountId: 'cccccccccccc', displayName: 'Kofi' }],
};
/** Someone with a start waiting: the way on starts it alone. */
const ALONE_INSTEAD = { startsAlone: true, onPress: nothing };

interface TableShown {
  readonly seats?: readonly TableSeat[];
  readonly notice?: TableNotice;
  readonly status?: TablePageProps['table']['status'];
  readonly nudgesLeft?: number;
  readonly hidden?: boolean;
  readonly sheet?: 'seat' | 'report' | 'menu';
  readonly done?: boolean;
}

function Table({
  seats = FULL,
  notice,
  status,
  nudgesLeft = 3,
  hidden = false,
  sheet,
  done = false,
}: TableShown) {
  const t = useT();
  const mine = hidden
    ? seats.map((one) => (one.userId === YOU ? { ...one, label: 'busy', workMode: null } : one))
    : seats;
  return (
    <>
      <TablePage
        table={{
          status: status ?? 'online',
          you: YOU,
          seats: mine,
          capacity: 4,
          nudgesLeft,
          hidden,
          notice: notice ?? null,
        }}
        workMode="paperwork"
        chosen={seats[2]?.userId ?? null}
        timer={done ? { kind: 'need_task' } : { kind: 'start', minutes: 10 }}
        done={done ? { minutes: 25 } : null}
        onMenu={nothing}
        onNext={nothing}
        onChoose={nothing}
        onSeatSheet={nothing}
        onNudge={nothing}
        onInvite={nothing}
        onTimer={nothing}
        onDismiss={nothing}
        onLeave={nothing}
        onClose={nothing}
      />
      <TableMenuSheet
        open={sheet === 'menu'}
        summary={tableSummary({ you: YOU, seats: mine }, t)}
        hidden={hidden}
        nudgesMuted={false}
        onInvite={nothing}
        onHidden={nothing}
        onMuteNudges={nothing}
        onLeave={nothing}
        onClose={nothing}
      />
      <SeatSheet
        seat={sheet === 'seat' || sheet === 'report' ? (seats[1] ?? null) : null}
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

function Lobby({ plus, quiet = false }: { readonly plus: boolean; readonly quiet?: boolean }) {
  return (
    <LobbyPage
      plus={plus}
      seated={false}
      tables={quiet ? [] : [KOFIS_TABLE]}
      busy={false}
      notice={null}
      onSit={nothing}
      onAlone={quiet ? nothing : undefined}
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
      atTable={['cccccccccccc']}
      pending={empty ? [] : [{ id: 'a'.repeat(64), days: 2 }]}
      onCancelInvite={nothing}
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
  'lobby-quiet': () => <Lobby plus={false} quiet />,
  'invite-landing': () => (
    <InvitePage
      hostName="Kofi"
      hostLabel="admin"
      taskText={null}
      busy={false}
      onSit={nothing}
      onNotNow={nothing}
      onClose={nothing}
    />
  ),
  'table-menu': () => <Table seats={FULL.slice(0, 2)} sheet="menu" />,
  'friend-sat': () => (
    <Table
      seats={FULL.slice(0, 3)}
      notice={{ kind: 'sat', userId: 'cccccccccccc', name: 'Kofi' }}
    />
  ),
  'done-at-table': () => <Table done />,
  ...TABLE_SETTINGS_CAPTURES,
  'waiting-alone': () => <Table seats={ALONE} />,
  'full-table': () => <Table />,
  'nudge-received': () => <Table notice={{ kind: 'nudged', from: 'cccccccccccc' }} />,
  'someone-left': () => (
    <Table seats={FULL.slice(0, 3)} notice={{ kind: 'left', name: 'Mei', done: true }} />
  ),
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
  'sign-in': () => (
    <SignInPage
      busy={false}
      failed={false}
      onSignIn={nothing}
      wayOn={ALONE_INSTEAD}
      onClose={nothing}
    />
  ),
  'sign-in-cancelled': () => (
    <SignInCancelledPage
      taskText={null}
      onAgain={nothing}
      wayOn={ALONE_INSTEAD}
      onClose={nothing}
    />
  ),
  name: () => (
    <NamePage
      busy={false}
      problem={null}
      suggested="Priya"
      showLabel
      onShowLabel={nothing}
      onSave={nothing}
      onClose={nothing}
    />
  ),
  'name-refused': () => (
    <NamePage busy={false} problem="refused" onSave={nothing} onClose={nothing} />
  ),
  friends: () => <Friends empty={false} />,
  'friends-empty': () => <Friends empty />,
  'haunt-send': () => (
    <HauntSendPage
      monster={{
        spec: specFromSeed('receipt', '0f3a9c2e7b1d'),
        name: 'The Receipt Hydra',
        line: 'Watching your taxes. Silently. Judgingly.',
      }}
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
      onPassOn={nothing}
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
