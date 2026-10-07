import { StyleSheet, useWindowDimensions } from 'react-native';

import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { RiseIn } from '../../ui/motion/rise-in';
import { Island } from '../world/island';

import { CardStep } from './reveal-card-step';
import { BarStep, DropStep } from './reveal-later-steps';
import {
  skipControl,
  type RevealActions,
  type RevealModel,
  type RevealStepProps,
} from './reveal-model';
import { Dock, KeepFrame } from './ui/keep-frame';
import { RewardEyebrow, RewardHeadline, RewardWords } from './ui/reward-words';

/** The board draws the world 330 points across on this step. */
const WORLD_SIZE = 330;

/**
 * "+1 to your world": the whole world as it now stands, Scootch in the middle of it, with the new
 * piece landing; under it the eyebrow pops in and the monster that moved in is named.
 */
function PieceStep({ model, actions, t }: RevealStepProps) {
  const { width: screen } = useWindowDimensions();
  const { piece, monster, world } = model;
  return (
    <KeepFrame
      testID="reveal-piece"
      close={skipControl(actions, t)}
      closeTestID="reveal-skip"
      footer={
        <Dock
          quiet={{
            label: t('reveal.backToToday'),
            hint: t('reveal.backToToday.hint'),
            testID: 'reveal-back-to-today',
            onPress: actions.backToToday,
          }}
          {...(model.shareOffered
            ? {
                action: {
                  label: t('reveal.showSomeone'),
                  hint: t('reveal.showSomeone.hint'),
                  testID: 'reveal-show-someone',
                  onPress: actions.showSomeone,
                },
              }
            : {})}
        />
      }
    >
      <RiseIn style={styles.world}>
        <Island
          pieces={world.pieces}
          monsters={world.monsters}
          size={Math.min(WORLD_SIZE, screen - spacing.md * 2)}
          mood="pleased"
          attitude={model.attitude}
          still={model.reducedMotion}
          landing={piece?.id ?? null}
          testID="reveal-piece-world"
        />
      </RiseIn>
      <RewardWords>
        <RewardEyebrow tone="tomato" pop>
          {t('reveal.piece.eyebrow')}
        </RewardEyebrow>
        {monster ? (
          <RiseIn index={2}>
            <RewardHeadline size={30} testID="reveal-piece-name">
              {monster.name}
            </RewardHeadline>
          </RiseIn>
        ) : null}
      </RewardWords>
    </KeepFrame>
  );
}

export interface RevealScreenProps {
  readonly model: RevealModel;
  readonly actions: RevealActions;
}

/** The reveal, whichever of its steps the model asks for. Each step enters as it is mounted. */
export function RevealScreen({ model, actions }: RevealScreenProps) {
  const t = useT();
  const props = { model, actions, t };
  switch (model.step) {
    case 'card':
      return <CardStep {...props} />;
    case 'piece':
      return <PieceStep {...props} />;
    case 'bar':
      return <BarStep {...props} />;
    case 'drop':
      return <DropStep {...props} />;
  }
}

const styles = StyleSheet.create({
  // The island runs past the frame's margins, as the board's does.
  world: { alignItems: 'center', marginHorizontal: -spacing.lg, marginTop: spacing.xs },
});
