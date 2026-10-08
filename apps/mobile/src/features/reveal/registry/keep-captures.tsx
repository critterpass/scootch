import type { ReactNode } from 'react';

import type { Language } from '@scootch/i18n';
import { offlineLine } from '@scootch/voice';

import type { KeepTab } from '../../keep/keep-motion';
import { KeepScreen } from '../../keep/keep-screen';
import { RecordPane } from '../../record/record-pane';
import { ARM_REST_DEG } from '../../record/record-audio';
import { weekView } from '../../record/record-week';
import { lighthousePiece } from '../../world/landmarks';
import { WorldPane } from '../../world/world-pane';
import { monthPages, pageOfToday, shelfCards } from '../../zoo/binder';
import { CardScreen } from '../../zoo/card-screen';
import { PagesScreen } from '../../zoo/pages-screen';
import { cardDataFor } from '../../zoo/zoo-cards';
import { ZooPane } from '../../zoo/zoo-pane';
import type { RevealModel } from '../reveal-model';
import { RevealScreen } from '../reveal-screen';
import type { RevealStep } from '../reveal-steps';

import {
  asRows,
  FIXTURE_MONDAY,
  fixtureBars,
  fixtureMonster,
  fixtureMonsters,
  fixturePieces,
  fixtureTask,
} from './keep-fixtures';
import type { KeepCapture } from './keep-state';
import { capturedShare } from './share-captures';

/** Actions that do nothing: a capture is looked at, not used. */
const nothing = () => undefined;

const NO_REVEAL_ACTIONS = {
  next: nothing,
  skip: nothing,
  backToToday: nothing,
  showSomeone: nothing,
  playBar: nothing,
  chooseDrop: nothing,
};

/** One step of the reveal, for the catch of the first fixture monster on a Tuesday. */
function capturedReveal(step: RevealStep, language: Language) {
  const monster = fixtureMonster(1);
  const model: RevealModel = {
    step,
    language,
    attitude: 'cheeky',
    reducedMotion: true,
    tilting: false,
    card: cardDataFor(monster, fixtureTask(1, language)),
    monster,
    // The offline pack's own caught line stands in for the task's.
    line: offlineLine(language, 'cheeky', 'caught', 0),
    piece: fixturePieces(2)[1] ?? null,
    world: { pieces: fixturePieces(2), monsters: fixtureMonsters(2) },
    bar: { position: 2, instruments: ['keys', 'bassline'], playing: false },
    shareOffered: true,
  };
  return <RevealScreen model={model} actions={NO_REVEAL_ACTIONS} />;
}

/** One tab of the keeping place, at rest in its frame: the close control above, the tabs below. */
function kept(tab: KeepTab, pane: ReactNode) {
  return <KeepScreen tab={tab} onTab={nothing} close={nothing} calm panes={{ [tab]: pane }} />;
}

function capturedWorld(count: number, lighthouse = false) {
  const pieces = fixturePieces(count);
  return kept(
    'world',
    <WorldPane
      model={{
        pieces: lighthouse ? [...pieces, lighthousePiece(FIXTURE_MONDAY)] : pieces,
        monsters: asRows(fixtureMonsters(count)),
      }}
      actions={{ sendPostcard: nothing }}
    />,
  );
}

/** The day every binder capture is taken on: the Thursday of the fixtures' week. */
const BINDER_TODAY = '2026-10-08';

function capturedZoo(
  language: Language,
  options: { count: number; plus: boolean; open?: boolean },
) {
  const monsters = asRows(fixtureMonsters(options.count));
  const cards = shelfCards(monsters, 'newest', options.plus);
  const first = cards[0];
  if (options.open && first) {
    return (
      <CardScreen
        model={{
          cards,
          index: 0,
          taskLine: fixtureTask(0, language).text,
          language,
          shareOffered: true,
        }}
        actions={{ close: nothing, show: nothing, share: nothing }}
      />
    );
  }
  // With cards on the shelf, two monsters are still wild, as the board draws them.
  const wild =
    options.count === 0
      ? []
      : [3, 12].map((day, index) => ({
          monster: { ...fixtureMonster(40 + index), caughtOn: null, caughtAt: null, number: null },
          day,
        }));
  return kept(
    'caught',
    <ZooPane
      model={{
        cards,
        wild,
        language,
        plus: options.plus,
        sort: 'newest',
        month: pageOfToday(monsters, BINDER_TODAY),
        lastLooked: first?.id ?? null,
      }}
      actions={{
        openCard: nothing,
        sort: nothing,
        openPages: nothing,
        openPlus: nothing,
        sharePage: nothing,
      }}
    />,
  );
}

/** The month pages on a month that filled its nine pockets, so the stamp shows. */
function capturedPages(language: Language) {
  const full = Array.from({ length: 11 }, (_, index) => ({
    ...fixtureMonster(index),
    caughtOn: '2026-09-12' as const,
  }));
  const pages = monthPages([...asRows(full), ...asRows(fixtureMonsters(4))], BINDER_TODAY);
  return (
    <PagesScreen
      model={{ pages, shown: { month: '2026-09', leaf: 0 }, current: '2026-10', language }}
      actions={{ close: nothing, show: nothing, openCard: nothing, sharePage: nothing }}
    />
  );
}

function capturedRecord(language: Language, barCount: number) {
  const monsters = fixtureMonsters(7);
  const week = weekView({
    week: '2026-W41',
    bars: fixtureBars(barCount),
    monsters,
    tasks: new Map(
      monsters.map((monster, index) => [monster.taskId, fixtureTask(index, language)]),
    ),
    weekRecords: [],
    todayPosition: Math.min(7, barCount + 1),
  });
  return kept(
    'song',
    <RecordPane
      model={{
        week,
        language,
        plus: false,
        playback: { playing: false, lit: [], progress: 0, armDeg: ARM_REST_DEG },
        reducedMotion: true,
      }}
      actions={{ togglePlay: nothing, shareWeek: nothing }}
    />,
  );
}

/** The keeping screen a registry state asks for. */
export function Captured({ capture, language }: { capture: KeepCapture; language: Language }) {
  switch (capture.screen) {
    case 'reveal':
      return capturedReveal(capture.step, language);
    case 'world':
      return capturedWorld(capture.pieces, capture.lighthouse);
    case 'zoo':
      return capturedZoo(language, {
        count: capture.cards,
        plus: capture.plus,
        open: capture.open === true,
      });
    case 'pages':
      return capturedPages(language);
    case 'record':
      return capturedRecord(language, capture.bars);
    case 'share':
      return capturedShare(language, capture.format);
  }
}
