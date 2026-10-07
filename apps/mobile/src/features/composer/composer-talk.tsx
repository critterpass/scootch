import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { CONTROL_HEIGHT } from '../../ui/buttons';

import { CANCEL_SLIDE, type ComposerEvent, type ComposerState } from './composer-machine';
import { recordingTime } from './waveform';

export interface ComposerTalkProps {
  readonly state: ComposerState;
  /** Something is being sent or finished: a new hold must wait. */
  readonly busy: boolean;
  readonly screenReader: boolean;
  /** Told how far the finger has slid, for the live row that follows it. */
  readonly drag: SharedValue<number>;
  readonly onEvent: (event: ComposerEvent) => void;
  /** `over`: laid over the dock's stage, under which the capsule is drawn. `flow`: holds the capsule. */
  readonly shape: 'over' | 'flow';
  readonly children?: ReactNode;
}

/**
 * The part of the dock that takes the hold: finger down starts a recording, a slide to the left
 * arms the cancel, letting go sends. A screen reader is not asked to hold: one double tap starts
 * and the next one sends.
 */
export function ComposerTalk({
  state,
  busy,
  screenReader,
  drag,
  onEvent,
  shape,
  children,
}: ComposerTalkProps) {
  const t = useT();
  const startX = useRef(0);
  const listening = state.phase === 'listening' || state.phase === 'finishing';
  const style = shape === 'over' ? styles.over : styles.flow;

  if (screenReader) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? t('composer.stopAndSend') : t('talk.hold')}
        accessibilityValue={
          listening && state.startedAt !== null
            ? {
                text: t('composer.recording', {
                  time: recordingTime(Date.now() - state.startedAt),
                }),
              }
            : {}
        }
        accessibilityHint={t('composer.toggle.hint')}
        accessibilityState={{ busy, disabled: busy && !listening }}
        disabled={busy && !listening}
        onPress={() => onEvent({ type: 'toggled', at: Date.now() })}
        testID="composer-talk"
        style={style}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={t('talk.hold')}
      accessibilityHint={t('composer.hold.hint')}
      accessibilityState={{ busy }}
      onAccessibilityTap={() => onEvent({ type: 'toggled', at: Date.now() })}
      onStartShouldSetResponder={() => !busy}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        startX.current = event.nativeEvent.pageX;
        drag.value = 0;
        onEvent({ type: 'hold_started', at: Date.now() });
      }}
      onResponderMove={(event) => {
        const dx = event.nativeEvent.pageX - startX.current;
        drag.value = dx;
        if (dx < CANCEL_SLIDE !== state.armed) onEvent({ type: 'slid', dx });
      }}
      onResponderRelease={() => onEvent({ type: 'released', at: Date.now() })}
      onResponderTerminate={() => onEvent({ type: 'released', at: Date.now() })}
      testID="composer-talk"
      style={style}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  over: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  flow: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: CONTROL_HEIGHT,
  },
});
