import { useState } from 'react';

import { createChooser } from '@phusclass/voice/class';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { boardDateLine, boardRows } from '../board/board-rows';
import { ComposerBar } from '../composer/composer-bar';
import type { ComposerState } from '../composer/composer-machine';
import { useKeyboardHeight } from '../composer/use-keyboard-height';
import { clockText } from '../session/session-model';
import { SlipSheet } from '../slip/slip-sheet';

import { fixtureSnapshot, FIXTURE_NAME, HEARD, TYPED, type FixtureOptions } from './class-fixtures';
import { deskModel, withSlipOut } from './desk-model';
import { DeskView } from './desk-view';

/** The desk states the registry captures, each as a board names it. */
export type DeskCase =
  | 'calm'
  | 'waiting'
  | 'pressure-two'
  | 'hot'
  | 'glare'
  | 'front-row'
  | 'listening'
  | 'typing'
  | 'late-slip'
  | 'offline'
  | 'empty'
  | 'serious'
  | 'still-yours'
  | 'recess'
  | 'pop-quiz'
  | 'plain';

const SETUPS: Record<DeskCase, Omit<FixtureOptions, 'language'>> = {
  // Pressure is the waiting time's steps (2, 5, 10, 20, 40 minutes) plus one per two tallies.
  calm: { waited: 0.5, burnt: 30, slips: 0 },
  waiting: { waited: 1, burnt: 30, slips: 3 },
  'pressure-two': { waited: 2, burnt: 50, slips: 3 },
  hot: { waited: 10, burnt: 90, slips: 3 },
  glare: { waited: 45, burnt: 120, slips: 3 },
  'front-row': { waited: 2, burnt: 70, slips: 5 },
  listening: { waited: 0.5, burnt: 10 },
  typing: { waited: 0.5, burnt: 10 },
  'late-slip': { waited: 2, burnt: 50, slips: 3 },
  offline: { waited: 1, burnt: 30, slips: 3 },
  empty: { empty: true },
  serious: { heavy: true, waited: 30 },
  'still-yours': { waited: 1, burnt: 20, fading: true },
  recess: { recessSeconds: 118, waited: 1 },
  'pop-quiz': { waited: 0.5, burnt: 10, happening: 'pop quiz' },
  // The crisis screen was closed: the hot desk's task, kept in plain company.
  plain: { waited: 10, burnt: 90, slips: 3 },
};

const noop = () => undefined;

/** One desk state, still, for its capture: the real view on a board built with the real rules. */
export function DeskFixture({ which }: { readonly which: DeskCase }) {
  const { language } = useLanguage();
  const t = useT();
  const keyboard = useKeyboardHeight();
  const [draft, setDraft] = useState(TYPED[language]);
  const snapshot = fixtureSnapshot({ language, ...SETUPS[which] });
  const drawn = deskModel({
    snapshot,
    language,
    name: FIXTURE_NAME,
    care: which === 'plain' ? 'plain' : 'normal',
  });
  const model = which === 'late-slip' ? withSlipOut(drawn, language) : drawn;
  // On iPhone Duo opened out, the board's page shows this state's board, as the wall does.
  const boardPage = {
    rows: boardRows(snapshot.board, snapshot.faded, snapshot.now, language, {
      today: t('board.today'),
    }),
    dateLine: boardDateLine(snapshot.now.day, language),
    remark:
      createChooser(language).say(
        snapshot.board.length === 0 ? 'emptyDesk' : 'boardLong',
        snapshot.now.day,
        {},
      )?.text ?? null,
    mood: model.mood,
  };
  const composerState: ComposerState =
    which === 'listening'
      ? { mode: 'listening', since: 0, words: HEARD[language] }
      : which === 'typing'
        ? { mode: 'typing', draft, note: null }
        : { mode: 'idle', note: null };
  const recess =
    snapshot.recess === null
      ? null
      : {
          left: clockText(snapshot.recess.leftMs),
          gone: 1 - snapshot.recess.leftMs / (5 * 60_000),
          over: false,
        };
  const task = model.task;
  return (
    <DeskView
      model={model}
      passing={null}
      carvings={[{ kind: 'star' }, { kind: 'heart' }, { kind: 'initials', text: 'M.A' }]}
      offline={which === 'offline'}
      now={snapshot.now.at}
      typing={which === 'typing'}
      keyboard={which === 'typing' ? keyboard : 0}
      chosenMinutes={null}
      recess={recess}
      boardPage={boardPage}
      composer={
        <ComposerBar
          state={composerState}
          onPressIn={noop}
          onPressOut={noop}
          onType={noop}
          onEdit={setDraft}
          onSubmit={noop}
          onCancel={noop}
        />
      }
      overlays={
        which === 'late-slip' && task !== null ? (
          <SlipSheet
            taskId={task.id}
            taskTitle={task.title}
            initial={{ kind: 'picked', which: 'after lunch' }}
            onHandIn={noop}
            onStart={noop}
            onClose={noop}
          />
        ) : null
      }
      onStart={noop}
      onLength={noop}
      onSlip={noop}
      onNotNow={noop}
      onOpenBoard={noop}
      onOpenTimetable={noop}
      onStillYours={noop}
      onBackToClass={noop}
      onSettings={noop}
    />
  );
}
