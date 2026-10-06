import { useLanguage, useT } from '../../i18n/i18n-provider';
import { lineFor, lineWithNoTask } from '../../state/lines';
import { initialComposer } from '../composer/composer-machine';
import { fixtures } from '../dump/captures';
import { HatchFigure } from '../monster/hatch-figure';
import { carriedSizeFactor, RETURN_CHIPS } from '../one-screen/one-screen-stage';
import { OneScreenView } from '../one-screen/one-screen-view';

// Mornings and returns as the screen registry shows them: the one screen's own view, drawn from
// fixed data. Scootch's words come from the offline pack in the capture's language.

const nothing = () => undefined;
const VOICE = 'cheeky';

/** The next morning, with yesterday's task: its monster a size smaller, and two calm choices. */
export function MorningCarriedOver() {
  const { language } = useLanguage();
  const t = useT();
  const { task, monster } = fixtures(language);
  return (
    <OneScreenView
      mood="pleased"
      attitude={VOICE}
      line={lineFor('hatch', task, { language, attitude: VOICE })}
      offline={false}
      shown={{
        kind: 'task_set',
        label: t('morning.fromYesterday'),
        taskText: task.text,
        treat: '',
        minutes: 10,
        onTreat: nothing,
        onMinutes: nothing,
        onStart: nothing,
        startLabel: t('morning.start', { minutes: 10 }),
        figure: (
          <HatchFigure
            mood="pleased"
            attitude={VOICE}
            monster={monster}
            sizeFactor={carriedSizeFactor(task)}
          />
        ),
      }}
    />
  );
}

/** Back after a long while: the usual ask, the three small ways in, and no word about the gap. */
export function MorningReturn() {
  const { language } = useLanguage();
  const t = useT();
  return (
    <OneScreenView
      mood="waiting"
      attitude={VOICE}
      line={lineWithNoTask('waiting', { language, attitude: VOICE })}
      offline={false}
      shown={{
        kind: 'composer',
        warmUp: null,
        notificationsOff: false,
        ways: {
          chips: RETURN_CHIPS.map((chip) => t(chip.label)),
          onChip: nothing,
          hint: t('morning.chip.hint'),
          note: null,
        },
        composer: {
          state: initialComposer('ready'),
          level: 0,
          onEvent: nothing,
          thinking: false,
          notUnderstood: false,
          screenReader: false,
          onOpenSettings: nothing,
        },
      }}
    />
  );
}
