import { useRef } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated from 'react-native-reanimated';

import type { AnimatedViewStyle } from '../../../ui/motion/animated-style';
import type { CatchModel, ScreenProps } from '../screens/screen-props';

import { gestureUnlocked, trapProgress, type CatchStage } from './catch-flow';
import type { BoardFit } from './fit-board';
import { STAGE } from './math';
import type { SceneHost, SceneTouch } from './rig';
import { SCENES } from './scenes';

export interface CatchBoardProps extends Pick<ScreenProps, 'model' | 'inks' | 't'> {
  readonly catching: CatchModel;
  readonly stage: CatchStage;
  /** The board as fitted to this phone; `null` until the screen is laid out. */
  readonly fit: BoardFit | null;
  /** The catch is on the screen, or on its way on or off it. */
  readonly drawn: boolean;
  /** Already caught when the screen was first drawn: the scene shows how the catch ends. */
  readonly ended: boolean;
  readonly host: SceneHost;
  /** Moves the whole drawing while a slam jolts it. */
  readonly jolt: AnimatedViewStyle;
  /** How the catch comes and goes as the two change places. */
  readonly layer: AnimatedViewStyle;
  /** The drawing is there to be touched at all; with Scootch on the screen it is not. */
  readonly inReach: boolean;
  /** There is a catch to try: never under a card or a sheet. */
  readonly touchable: boolean;
}

/**
 * The catch itself: the task's rolled scene, fitted to the phone, and over the whole screen the
 * layer that hands a touch to the scene in the board's points.
 */
export function CatchBoard(props: CatchBoardProps) {
  const { model, inks, t, catching, stage, fit } = props;
  const touch = useRef<SceneTouch | null>(null);
  const toBoard = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const { scale: by, left, top } = fit ?? { scale: 1, left: 0, top: 0 };
    return [(locationX - left) / by, (locationY - top) / by] as const;
  };
  const Scene = SCENES[catching.kind];
  const monster = model.monster;
  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, props.layer]}>
        <Animated.View style={[StyleSheet.absoluteFill, props.jolt]}>
          {fit && monster && props.drawn ? (
            <View
              style={[
                styles.board,
                {
                  // A view is scaled about its middle, so its corner is set back by half the change.
                  left: fit.left - (STAGE.width * (1 - fit.scale)) / 2,
                  top: fit.top - (STAGE.height * (1 - fit.scale)) / 2,
                  transform: [{ scale: fit.scale }],
                },
              ]}
            >
              <Scene
                kind={catching.kind}
                monster={monster}
                inks={inks}
                t={t}
                progress={trapProgress(stage, model.fraction)}
                ready={gestureUnlocked(stage)}
                ended={props.ended}
                still={model.reducedMotion}
                caughtCount={catching.caughtCount}
                monthMates={catching.monthMates}
                monthName={catching.monthName}
                host={props.host}
                touch={touch}
              />
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
      <View
        style={StyleSheet.absoluteFill}
        testID="session-catch-scene"
        pointerEvents={props.inReach ? 'auto' : 'none'}
        accessibilityHint={t('session.catch.scene.hint')}
        onStartShouldSetResponder={() => props.touchable}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => touch.current?.down(...toBoard(event))}
        onResponderMove={(event) => touch.current?.move(...toBoard(event))}
        onResponderRelease={(event) => touch.current?.up(...toBoard(event))}
        onResponderTerminate={(event) => touch.current?.up(...toBoard(event))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  board: { position: 'absolute', width: STAGE.width, height: STAGE.height },
});
