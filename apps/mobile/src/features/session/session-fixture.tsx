import type { PhuMood } from '@phusclass/art/class';

import { useLanguage } from '../../i18n/i18n-provider';
import { fixtureSnapshot } from '../desk/class-fixtures';
import { fixedLine, lineFor } from '../desk/his-line';

import { HAPPENINGS } from './happening-scene';
import { sessionClock } from './session-model';
import { SessionView, type SessionPanel } from './session-view';
import { useSessionChalk } from './use-session-chalk';

/** The period states the registry captures. */
export type SessionCase =
  'running' | 'time-up' | 'partial' | 'finish' | 'finish-ten' | 'cat' | 'serious';

const noop = () => undefined;

/** One period state, still, for its capture. */
export function SessionFixture({ which }: { readonly which: SessionCase }) {
  const { language } = useLanguage();
  const seconds = which === 'running' || which === 'cat' || which === 'serious' ? 168 : 600;
  const snapshot = fixtureSnapshot({
    language,
    running: seconds,
    heavy: which === 'serious',
    ...(which === 'cat' ? { happening: 'cat on the desk' as const } : {}),
  });
  const clock = sessionClock(snapshot);
  const chalkboard = useSessionChalk(snapshot);
  const title = snapshot.desk?.task.text ?? '';
  const finishing = which === 'finish' || which === 'finish-ten';
  const panel: SessionPanel = finishing ? 'finish' : which === 'partial' ? 'partial' : 'working';
  let mood: PhuMood = 'grading';
  let line: string | null = null;
  if (which === 'time-up') {
    mood = 'calm';
    line = fixedLine(language, 'timeUp');
  } else if (which === 'partial') {
    mood = 'calm';
    line = lineFor(language, 'partialCredit', 'partial')?.text ?? null;
  } else if (finishing) {
    mood = 'clap';
    line = fixedLine(language, 'next');
  } else if (which === 'cat') {
    mood = HAPPENINGS['cat on the desk'].mood;
    line = lineFor(language, 'happeningCat', 'cat')?.text ?? null;
  } else if (which === 'serious') {
    mood = 'serious';
    line = lineFor(language, 'seriousCompany', 'serious')?.text ?? null;
  }
  return (
    <SessionView
      framing={finishing ? 'desk' : 'session'}
      mood={mood}
      pace={false}
      line={line}
      title={title}
      chalkboard={chalkboard}
      heavy={which === 'serious'}
      clock={clock}
      panel={panel}
      finish={
        finishing
          ? {
              title,
              comment: which === 'finish-ten' ? 'ten' : 'good',
              waitedDays: 9,
              tookMinutes: 11,
              recessOffered: true,
            }
          : null
      }
      carvings={[{ kind: 'star' }, { kind: 'heart' }, { kind: 'initials', text: 'M.A' }]}
      happening={which === 'cat' ? 'cat on the desk' : null}
      drum={false}
      stray={null}
      note=""
      onNote={noop}
      onRaiseHand={noop}
      onStray={noop}
      onDone={noop}
      onNotYet={noop}
      onAnother={noop}
      onBackOnBoard={noop}
      onSaveNote={noop}
      onErase={noop}
      onClosePartial={noop}
      onNext={noop}
      onRecess={noop}
    />
  );
}
