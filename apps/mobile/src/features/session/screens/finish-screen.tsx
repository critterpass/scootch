import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import type { StringKey } from '@scootch/i18n';
import { spacing } from '@scootch/tokens';

import { useCue } from '../../../state/day-store-provider';
import type { HoldCaption } from '../hold-control';
import { useHoldControl } from '../use-hold-control';
import { BurstMarks } from '../ui/burst-marks';
import { Characters } from '../ui/characters';
import { Stage, Words } from '../ui/drawn-parts';
import { FilledButton, RoundButton, TextButton } from '../ui/controls';
import { HoldButton } from '../ui/hold-button';
import { SessionFrame } from '../ui/session-frame';
import { SessionText } from '../ui/session-text';

import type { ScreenProps } from './screen-props';

/** How long the catch plays before a tap anywhere may pass it. */
const PASS_AFTER_MS = 400;

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
 *
 * The same screen then plays the catch: the burst goes up from the control, its label reads
 * "Done", Scootch celebrates and the monster is caught. It passes by itself; a tap anywhere passes
 * it sooner. The finish's own sound and tap were played by the finish and are not played again.
 */
export function FinishScreen({ model, actions, inks, t }: ScreenProps) {
  const { view } = model;
  const control = view.kind === 'finish' || view.kind === 'caught' ? view.control : 'hold';
  const timeUp = view.kind === 'finish' && view.timeUp;
  const caught = view.kind === 'caught';
  // The catch plays on the screen the finish was made on: "Not finished" keeps its room under the
  // control, unseen, so nothing moves under the finger as the burst goes up.
  const wasTimeUp = useRef(timeUp);
  if (view.kind === 'finish') wasTimeUp.current = view.timeUp;
  const keepsRow = caught && wasTimeUp.current;
  // A tap anywhere passes the catch, but not the tail of the taps that made the finish.
  const [mayPass, setMayPass] = useState(false);
  useEffect(() => {
    if (!caught) return setMayPass(false);
    const timer = setTimeout(() => setMayPass(true), PASS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [caught]);
  // Where the burst goes up from: the middle of the finish control, found as the catch begins.
  const controlRef = useRef<ComponentRef<typeof View>>(null);
  const [burstFrom, setBurstFrom] = useState<{ x: number; y: number } | null | undefined>();
  useEffect(() => {
    if (!caught) return setBurstFrom(undefined);
    const control = controlRef.current;
    if (!control) return setBurstFrom(null);
    control.measureInWindow((x: number, y: number, width: number, height: number) =>
      setBurstFrom(width > 0 ? { x: x + width / 2, y: y + height / 2 } : null),
    );
    return undefined;
  }, [caught]);
  const hold = useHoldControl(
    control,
    actions.sendFinish,
    model.holdStartsAt,
    view.kind === 'caught',
  );
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
      align="drawn"
      footerInset={control === 'hold' ? 0 : 24}
      top={
        // Nothing to go back to once time is up, or once the thing is caught.
        timeUp || view.kind === 'caught' ? null : (
          <RoundButton
            label={t('session.finish.keepGoing')}
            hint={t('session.finish.keepGoing.hint')}
            testID="session-keep-going"
            inks={inks}
            onPress={actions.keepGoing}
          />
        )
      }
      over={
        caught ? (
          <>
            {burstFrom === undefined ? null : (
              <BurstMarks
                kind="catch"
                inks={inks}
                reducedMotion={model.reducedMotion}
                controlAt={burstFrom}
              />
            )}
            {mayPass ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('session.skip')}
                accessibilityHint={t('session.skip.hint')}
                testID="session-caught-pass"
                onPress={actions.passCaught}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
          </>
        ) : null
      }
      footer={
        <View style={styles.footer}>
          {control === 'hold' ? (
            <>
              <View ref={controlRef} collapsable={false} style={styles.control}>
                <HoldButton
                  progress={hold.progress}
                  label={t(caught ? 'session.finish.done' : 'session.finish.hold')}
                  spokenLabel={t('session.finish.holdIdle')}
                  hint={t('session.finish.hold.hint')}
                  inks={inks}
                  onPressIn={() => hold.input({ type: 'pressed' })}
                  onPressOut={() => hold.input({ type: 'released' })}
                  onActivate={tap}
                />
              </View>
              <SessionText
                face="caption"
                color={hold.caption === 'holding' ? inks.ink : inks.muted}
                accessibilityLiveRegion="polite"
                testID="session-hold-caption"
                style={styles.centred}
              >
                {
                  // The caught line is above, in Scootch's words: the caption keeps its room.
                  caught
                    ? ' '
                    : t(
                        CAPTIONS[
                          hold.caption === 'confirm' && !screenReader ? 'idle' : hold.caption
                        ],
                      )
                }
              </SessionText>
            </>
          ) : (
            <View ref={controlRef} collapsable={false}>
              <FilledButton
                tone="tomato"
                label={t(
                  caught
                    ? 'session.finish.done'
                    : hold.caption === 'confirm'
                      ? 'session.finish.tapConfirm'
                      : 'session.finish.tap',
                )}
                hint={t('session.finish.tap.hint')}
                testID="session-finish-tap-button"
                inks={inks}
                onPress={tap}
              />
            </View>
          )}
          {timeUp || keepsRow ? (
            // Set apart from the finish control, so reaching for one does not land on the other.
            <View
              style={[styles.apart, keepsRow ? styles.unseen : null]}
              pointerEvents={keepsRow ? 'none' : 'auto'}
              accessibilityElementsHidden={keepsRow}
              importantForAccessibility={keepsRow ? 'no-hide-descendants' : 'auto'}
            >
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
      <Stage height={250} top={16}>
        <Characters
          // He listens for the end while it is held, and bargains when it is let go too soon. The
          // monster knows what a hold means.
          mood={
            caught
              ? 'celebrating'
              : hold.caption === 'holding'
                ? 'listening'
                : hold.caption === 'nearly'
                  ? 'bargaining'
                  : 'waiting'
          }
          monsterMood={caught ? 'caught' : control === 'hold' ? 'nervous' : 'idle'}
          attitude={model.attitude}
          monster={model.monster}
          reducedMotion={model.reducedMotion}
        />
      </Stage>
      {model.line ? (
        <Words top={6}>
          <SessionText
            face="line"
            color={inks.ink}
            accessibilityLiveRegion="polite"
            testID="session-finish-line"
          >
            {model.line.text}
          </SessionText>
        </Words>
      ) : null}
    </SessionFrame>
  );
}

const styles = StyleSheet.create({
  // The board's hold block: 22 points between the button and its caption, ending 44 from the foot.
  footer: {
    alignItems: 'stretch',
    gap: 22,
    paddingBottom: 10,
  },
  control: {
    alignSelf: 'center',
  },
  unseen: {
    opacity: 0,
  },
  apart: {
    marginTop: spacing.lg,
  },
  centred: {
    textAlign: 'center',
  },
});
