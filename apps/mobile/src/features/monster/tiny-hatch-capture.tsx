import { useLanguage, useT } from '../../i18n/i18n-provider';
import { fixtures } from '../dump/captures';
import { OneScreenView } from '../one-screen/one-screen-view';
import { stageShown, type StageActions } from '../one-screen/stage-shown';

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

/**
 * The hatch of an odd week, as the screen registry shows it: the real view, drawn from the same
 * fixed task and monster as the ordinary hatch, with the one stored word that makes it tiny.
 */
export function TinyHatchCapture() {
  const { language } = useLanguage();
  const t = useT();
  const data = fixtures(language);
  const drawn = stageShown(
    {
      kind: 'hatch',
      task: data.task,
      monster: { ...data.monster, oddWord: 'tiny' },
      shrunk: false,
      canShrink: true,
    },
    { t, language, attitude: 'cheeky', today: '2026-10-06', revealed: true, actions: NO_ACTIONS },
  );
  return <OneScreenView attitude="cheeky" offline={false} {...drawn} overlay={null} />;
}
