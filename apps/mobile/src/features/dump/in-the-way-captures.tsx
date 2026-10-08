import type { InTheWay } from '@scootch/domain';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { OneScreenView } from '../one-screen/one-screen-view';
import { stageShown, type StageActions } from '../one-screen/stage-shown';

// The battery question with "Anything in the way?" under it, as the screen registry shows it: the
// real views drawn with no store behind them. Scootch's reply is the offline pack's.

const nothing = () => undefined;
const NO_ACTIONS: StageActions = {
  answerEnergy: nothing,
  cancel: nothing,
  accept: nothing,
  answerDeadline: nothing,
  pickAgain: nothing,
  takePick: nothing,
  dropPick: nothing,
  tooBig: nothing,
  catchIt: nothing,
  revealDone: nothing,
};

function EnergyWithInTheWay({
  answer,
  offline = false,
}: {
  readonly answer: InTheWay | null;
  readonly offline?: boolean;
}) {
  const { language } = useLanguage();
  const t = useT();
  const drawn = stageShown(
    { kind: 'energy' },
    {
      t,
      language,
      attitude: 'cheeky',
      today: '2026-10-06',
      revealed: true,
      inTheWay: { answer, onAnswer: nothing },
      actions: NO_ACTIONS,
    },
  );
  return <OneScreenView attitude="cheeky" offline={offline} {...drawn} />;
}

/** The battery question, and under it the optional row, nothing picked. */
export function DumpEnergyInTheWay() {
  return <EnergyWithInTheWay answer={null} />;
}

/** "Scary" picked: Scootch answers it, and the battery is still to be read. */
export function DumpEnergyInTheWayAnswered() {
  return <EnergyWithInTheWay answer="scary" />;
}

/** "Too big" picked: the reply points at the bites the pack will bring. */
export function DumpEnergyInTheWayTooBig() {
  return <EnergyWithInTheWay answer="too_big" />;
}

/** No connection: the row and the reply are the phone's own. */
export function DumpEnergyInTheWayOffline() {
  return <EnergyWithInTheWay answer="boring" offline />;
}
