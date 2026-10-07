import { lineWithNoTask } from '../../state/lines';
import { ChoiceDock, Stack } from '../dump/dump-panels';
import { HatchFigure } from '../monster/hatch-figure';
import { HatchWords } from '../monster/hatch-words';
import { nameAndTitle } from '../monster/monster-name';

import { FRAMES, HATCH_MONSTER } from './one-screen-frame';
import type { Stage } from './one-screen-stage';
import type { StageDrawn, StageEnv } from './stage-shown';

/** The hatch, and the same monster after "Too big", as the one screen draws them. */
export function hatchShown(stage: Extract<Stage, { kind: 'hatch' }>, env: StageEnv): StageDrawn {
  const { t, language, attitude, actions } = env;
  const voice = { language, attitude };
  const { task, monster, shrunk } = stage;
  const cue = env.cue ?? (() => undefined);
  // Hatched, Scootch is already bargaining for it; shrunk, he celebrates and the monster is not
  // happy about its new size.
  const mood = shrunk ? 'celebrating' : 'bargaining';
  return {
    mood,
    line: null,
    shown: {
      kind: 'panel',
      name: 'hatch',
      figure: (
        <HatchFigure
          mood={mood}
          attitude={attitude}
          monster={monster}
          monsterMood={shrunk ? 'nervous' : 'idle'}
          hatches={!shrunk}
          scootchSize={FRAMES.hatch.figure}
          monsterSize={HATCH_MONSTER.size}
          overlap={HATCH_MONSTER.overlap}
          outgrown={shrunk}
          onHatch={() => cue('hatch')}
          onSqueak={() => cue('squeak')}
          onGrumble={() => cue('grumble')}
        />
      ),
      body: (
        <Stack>
          <HatchWords
            label={t(shrunk ? 'hatch.shrunk' : 'hatch.label')}
            // Shrunk, the smaller task is the news and Scootch says what became of the monster;
            // hatched, the monster is introduced by name and title, with its own words.
            heading={shrunk ? task.text : monster ? nameAndTitle(monster) : null}
            said={shrunk ? lineWithNoTask('shrunk', voice) : (monster?.flavourText ?? null)}
            shrunk={shrunk}
          />
          {/* Only a monster that has hatched can haunt anyone. */}
          {monster ? env.hatchExtra : null}
        </Stack>
      ),
      footer: (
        <ChoiceDock
          quiet={{
            label: t(shrunk ? 'bargain.smaller' : 'hatch.tooBig'),
            hint: t('hatch.tooBig.hint'),
            onPress: () => {
              // The shrink is heard and felt as the monster drops a size.
              cue('shrink');
              actions.tooBig();
            },
            disabled: !stage.canShrink,
            testID: 'hatch-too-big',
          }}
          action={{
            label: t('hatch.catch'),
            hint: t('hatch.catch.hint'),
            onPress: actions.catchIt,
            testID: 'hatch-catch',
          }}
        />
      ),
    },
  };
}
