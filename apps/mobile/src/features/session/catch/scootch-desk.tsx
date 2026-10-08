import type { ComponentRef, Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';

import type { AnimatedViewStyle } from '../../../ui/motion/animated-style';
import { useKeyboardOpen } from '../../../ui/use-keyboard-open';
import { HoldFinishBlock, type HoldFinish } from '../screens/hold-finish';
import type { ScreenProps } from '../screens/screen-props';
import { deskRing, WorkingDesk } from '../screens/working-desk';

/** With the hold at the foot: the room the ring's gap and his line are given, and the hold's own. */
const LINE_ROOM = 136;
const HOLD_ROOM = 214;
const LEAST_RING = 140;

export interface ScootchDeskProps extends ScreenProps {
  /** The screen's size, and where under the top row the desk begins and above the edge it ends. */
  readonly screen: { readonly width: number; readonly height: number };
  readonly top: number;
  readonly foot: number;
  readonly finish: HoldFinish;
  /** The two are changing places: nothing here takes a touch until they have landed. */
  readonly swapping: boolean;
  /** Scootch is in the air, or on his way here: the flyer is him until it lands. */
  readonly scootchAway: boolean;
  readonly scootchRef: Ref<ComponentRef<typeof View>>;
  /** How the desk comes and goes as the two change places. */
  readonly layer: AnimatedViewStyle;
}

/**
 * Scootch's face of a session whose monster can be caught: he works on his disc over the time and
 * the task, as the working screen draws him. When time is up, or "I'm done" is said, the ring
 * steps down to make room, his line takes the words, and the hold to finish is at the foot.
 */
export function ScootchDesk(props: ScootchDeskProps) {
  const { model, inks, t, screen, top, foot, finish } = props;
  const keyboardOpen = useKeyboardOpen();
  const working = model.view.kind === 'working' ? model.view : null;
  const besideKeyboard = model.parkOpen && keyboardOpen;
  const ring = working
    ? deskRing({ ...screen, small: working.stuck, besideKeyboard })
    : Math.max(
        LEAST_RING,
        Math.min(
          deskRing({ ...screen, small: true, besideKeyboard: false }),
          screen.height - top - LINE_ROOM - HOLD_ROOM - foot,
        ),
      );
  return (
    <Animated.View
      pointerEvents={props.swapping ? 'none' : 'box-none'}
      style={[styles.desk, { top }, props.layer]}
    >
      {/* The work and its finish are two layouts of the same desk: one fades into the other. */}
      <Animated.View
        key={working ? 'work' : 'finish'}
        pointerEvents="box-none"
        entering={FadeIn.duration(240).reduceMotion(ReduceMotion.Never)}
        exiting={FadeOut.duration(140).reduceMotion(ReduceMotion.Never)}
        style={styles.fill}
      >
        <WorkingDesk
          model={model}
          actions={props.actions}
          inks={inks}
          t={t}
          ring={ring}
          finish={working ? null : finish}
          words={!besideKeyboard}
          scootchRef={props.scootchRef}
          scootchStyle={props.scootchAway ? styles.unseen : null}
        />
        {working ? null : (
          <View style={[styles.hold, { paddingBottom: foot + 10 }]}>
            <HoldFinishBlock finish={finish} inks={inks} t={t} />
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  desk: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center' },
  hold: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  unseen: { opacity: 0 },
});
