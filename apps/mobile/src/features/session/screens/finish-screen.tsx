import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import type { StringKey } from '@scootch/i18n';
import { spacing } from '@scootch/tokens';

import { useCue } from '../../../state/day-store-provider';
import type { HoldCaption } from '../hold-control';
import { useHoldControl } from '../use-hold-control';
import { Characters } from '../ui/characters';
import { FilledButton, RoundButton, TextButton } from '../ui/controls';
import { HoldButton } from '../ui/hold-button';
import { SessionFrame } from '../ui/session-frame';
import { SessionText } from '../ui/session-text';

import type { ScreenProps } from './screen-props';

const CAPTIONS = {
  idle: 'session.finish.holdIdle',
  holding: 'session.finish.holdGoing',
  nearly: 'session.finish.holdNearly',
  confirm: 'session.finish.tapConfirm',
} as const satisfies Record<HoldCaption, StringKey>;

function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled()
      .then(setOn)
      .catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => listener.remove();
  }, []);
  return on;
}

/**
 * Time is up, or the person is done early: Scootch's line and the finish control. Holding fills
 * the ring and letting go drains it with a kind word; the tap-twice control asks for a second tap.
 * "Not finished" sits beside finishing once time is up.
 */
export function FinishScreen({ model, actions, inks, t }: ScreenProps) {
  const { view } = model;
  const control = view.kind === 'finish' ? view.control : 'hold';
  const timeUp = view.kind === 'finish' && view.timeUp;
  const hold = useHoldControl(control, actions.sendFinish, model.holdStartsAt);
  const screenReader = useScreenReader();
  // Letting go too soon is answered with a small falling "aww", as the design's hold does.
  const playCue = useCue();
  const letGoEarly = hold.caption === 'nearly';
  useEffect(() => {
    if (letGoEarly && view.kind === 'finish' && model.holdStartsAt === 0) playCue('aww');
  }, [letGoEarly, playCue, view.kind, model.holdStartsAt]);
  const tap = () => {
    hold.input({ type: 'tapped', at: Date.now() });
    if (hold.caption !== 'confirm') {
      AccessibilityInfo.announceForAccessibility(t('session.finish.tapConfirm'));
    }
  };

  return (
    <SessionFrame
      inks={inks}
      testID={control === 'hold' ? 'session-finish-hold' : 'session-finish-tap'}
      top={
        timeUp ? null : (
          <RoundButton
            label={t('session.finish.keepGoing')}
            hint={t('session.finish.keepGoing.hint')}
            testID="session-keep-going"
            inks={inks}
            onPress={actions.keepGoing}
          />
        )
      }
      footer={
        <View style={styles.footer}>
          {control === 'hold' ? (
            <>
              <HoldButton
                progress={hold.progress}
                label={t('session.finish.hold')}
                spokenLabel={t('session.finish.holdIdle')}
                hint={t('session.finish.hold.hint')}
                inks={inks}
                onPressIn={() => hold.input({ type: 'pressed' })}
                onPressOut={() => hold.input({ type: 'released' })}
                onActivate={tap}
              />
              <SessionText
                face="caption"
                color={hold.caption === 'holding' ? inks.ink : inks.muted}
                accessibilityLiveRegion="polite"
                testID="session-hold-caption"
                style={styles.centred}
              >
                {t(CAPTIONS[hold.caption === 'confirm' && !screenReader ? 'idle' : hold.caption])}
              </SessionText>
            </>
          ) : (
            <FilledButton
              tone="tomato"
              label={t(
                hold.caption === 'confirm' ? 'session.finish.tapConfirm' : 'session.finish.tap',
              )}
              hint={t('session.finish.tap.hint')}
              testID="session-finish-tap-button"
              inks={inks}
              onPress={tap}
            />
          )}
          {timeUp ? (
            // Set apart from the finish control, so reaching for one does not land on the other.
            <View style={styles.apart}>
              <TextButton
                label={t('session.notFinished')}
                hint={t('session.notFinished.hint')}
                testID="session-not-finished"
                inks={inks}
                onPress={() => actions.send({ type: 'not_finished' })}
              />
            </View>
          ) : null}
        </View>
      }
    >
      <Characters
        // He listens for the end while it is held, and bargains when it is let go too soon. The
        // monster knows what a hold means.
        mood={
          hold.caption === 'holding'
            ? 'listening'
            : hold.caption === 'nearly'
              ? 'bargaining'
              : 'waiting'
        }
        monsterMood={control === 'hold' ? 'nervous' : 'idle'}
        attitude={model.attitude}
        monster={model.monster}
        reducedMotion={model.reducedMotion}
      />
      {model.line ? (
        <SessionText
          face="headline"
          color={inks.ink}
          accessibilityLiveRegion="polite"
          testID="session-finish-line"
          style={styles.line}
        >
          {model.line.text}
        </SessionText>
      ) : null}
    </SessionFrame>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'stretch',
    gap: spacing.md,
  },
  apart: {
    marginTop: spacing.lg,
  },
  centred: {
    textAlign: 'center',
  },
  line: {
    alignSelf: 'stretch',
  },
});
