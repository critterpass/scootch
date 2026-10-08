import { useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import type { StringKey } from '@scootch/i18n';

import type { MonsterProps } from '../../../art/Monster';
import type { ScootchProps } from '../../../art/Scootch';
import { useCue } from '../../../state/day-store-provider';
import type { HoldCaption } from '../hold-control';
import { useHoldControl, type HoldControlHandle } from '../use-hold-control';
import { HoldButton } from '../ui/hold-button';
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

/** The hold to finish as a screen runs it: the control, and how the two of them take it. */
export interface HoldFinish {
  readonly hold: HoldControlHandle;
  /** The finish was taken: the burst is up and the button reads "Done". */
  readonly caught: boolean;
  readonly screenReader: boolean;
  /** He listens for the end while it is held, and bargains when it is let go too soon. */
  readonly scootchMood: ScootchProps['mood'];
  /** The monster knows what a hold means. */
  readonly monsterMood: NonNullable<MonsterProps['mood']>;
  /** VoiceOver's double-tap, which stands in for the hold and asks for a second one. */
  readonly tap: () => void;
  /** The button, for the burst to go up from. */
  readonly controlRef: RefObject<ComponentRef<typeof View> | null>;
}

/**
 * Runs the hold to finish for a screen. Holding fills the ring and letting go drains it with a
 * kind word and a small falling "aww". A hold that is still down when its screen goes is let go
 * of, so the session is never left held.
 */
export function useHoldFinish({ model, actions, t }: ScreenProps): HoldFinish {
  const caught = model.view.kind === 'caught';
  const hold = useHoldControl('hold', actions.sendFinish, model.holdStartsAt, caught);
  const screenReader = useScreenReader();
  const playCue = useCue();
  const letGoEarly = hold.caption === 'nearly';
  const finishing = model.view.kind === 'finish';
  useEffect(() => {
    if (letGoEarly && finishing && model.holdStartsAt === 0) playCue('aww');
  }, [letGoEarly, playCue, finishing, model.holdStartsAt]);

  const holding = hold.caption === 'holding';
  const down = useRef(false);
  down.current = holding;
  const send = useRef(actions.send);
  send.current = actions.send;
  useEffect(
    () => () => {
      if (down.current) send.current({ type: 'hold_released' });
    },
    [],
  );

  return {
    hold,
    caught,
    screenReader,
    scootchMood: caught
      ? 'celebrating'
      : holding
        ? 'listening'
        : letGoEarly
          ? 'bargaining'
          : 'waiting',
    monsterMood: caught ? 'caught' : holding ? 'nervous' : 'idle',
    tap: () => {
      hold.input({ type: 'tapped', at: Date.now() });
      if (hold.caption !== 'confirm') {
        AccessibilityInfo.announceForAccessibility(t('session.finish.tapConfirm'));
      }
    },
    controlRef: useRef<ComponentRef<typeof View>>(null),
  };
}

/** The board's hold block: the button in its ring, and the caption 22 points under it. */
export function HoldFinishBlock({
  finish,
  inks,
  t,
}: Pick<ScreenProps, 'inks' | 't'> & { readonly finish: HoldFinish }) {
  const { hold, caught, screenReader } = finish;
  return (
    <View style={styles.block}>
      <View ref={finish.controlRef} collapsable={false} style={styles.control}>
        <HoldButton
          progress={hold.progress}
          label={t(caught ? 'session.finish.done' : 'session.finish.hold')}
          spokenLabel={t('session.finish.holdIdle')}
          hint={t('session.finish.hold.hint')}
          inks={inks}
          onPressIn={() => hold.input({ type: 'pressed' })}
          onPressOut={() => hold.input({ type: 'released' })}
          onActivate={finish.tap}
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
            : t(CAPTIONS[hold.caption === 'confirm' && !screenReader ? 'idle' : hold.caption])
        }
      </SessionText>
    </View>
  );
}

/** Where the burst goes up from: the middle of the finish control, found as the catch begins. */
export function useBurstFrom(finish: HoldFinish): { x: number; y: number } | null | undefined {
  const { caught, controlRef } = finish;
  const [from, setFrom] = useState<{ x: number; y: number } | null | undefined>();
  useEffect(() => {
    if (!caught) return setFrom(undefined);
    const control = controlRef.current;
    if (!control) return setFrom(null);
    control.measureInWindow((x: number, y: number, width: number, height: number) =>
      setFrom(width > 0 ? { x: x + width / 2, y: y + height / 2 } : null),
    );
    return undefined;
  }, [caught, controlRef]);
  return from;
}

const styles = StyleSheet.create({
  block: { alignItems: 'stretch', gap: 22 },
  control: { alignSelf: 'center' },
  centred: { textAlign: 'center' },
});
