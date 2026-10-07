import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Scootch } from '../../../art/Scootch';
import { GlassTag, RoundButton as GlassRound } from '../../../ui/buttons';
import { MoreIcon } from '../../../ui/icons';
import { useKeyboardOpen } from '../../../ui/use-keyboard-open';
import { companyLine, scootchShare } from '../session-view';
import { RoundButton } from '../ui/controls';
import type { ParkComposerHandle } from '../ui/park-composer';
import { PillDot } from '../ui/pill-marks';
import { ParkedToast } from '../ui/parked-toast';
import { SessionFrame } from '../ui/session-frame';
import { SessionMenu } from '../ui/session-menu';
import { SessionText } from '../ui/session-text';
import { RING_SIZE, SMALL_RING_SIZE, TimeDisc } from '../ui/time-disc';

import type { ScreenProps } from './screen-props';
import { WorkingFooter } from './working-footer';
import { workingMenu } from './working-menu';

/** The board's phone is 393 points wide and the ring 330: this much stays clear at the sides. */
const RING_MARGIN = 63;
/** The most of the screen's height the ring may take, so the time and the task stay on it. */
const RING_SHARE = 0.39;
/** The ring while the keyboard is up under the park field. */
const RING_BESIDE_KEYBOARD = 190;

/**
 * The session at work, as the board draws it: the monster's pill and one corner control, a ring
 * with the tomato disc shrinking inside it and a paper Scootch sitting on the disc, the time and
 * the task under it, and one glass pill at the foot. Stuck help, the park field and the
 * two-minute warning all happen here, and a serious task's whole session does, in ink-grey.
 */
export function WorkingScreen(props: ScreenProps) {
  const { model, actions, inks, t } = props;
  const { width, height } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const keyboardOpen = useKeyboardOpen();
  const park = useRef<ParkComposerHandle | null>(null);
  if (model.view.kind !== 'working') return null;
  const { quiet, stuck, timeUp, twoMinutesLeft } = model.view;

  // The board's ring is 330 across, and 280 for a serious task and beside the stuck card.
  const drawnRing = quiet || stuck ? SMALL_RING_SIZE : RING_SIZE;
  const ring = Math.min(
    model.parkOpen && keyboardOpen ? RING_BESIDE_KEYBOARD : drawnRing,
    width - RING_MARGIN,
    height * RING_SHARE,
  );
  // Scootch keeps his size against the ring he was drawn in, whatever the phone.
  const scootchSize = Math.round(
    stuck ? (180 / SMALL_RING_SIZE) * ring : scootchShare(model.fraction) * ring,
  );
  const name = model.monster?.name;
  const spoken = timeUp
    ? t('session.timeUpSpoken')
    : t('session.minutesLeftSpoken', { count: model.minutesLeft });
  const line = companyLine(model.line);
  // He acts the moment: stuck with you, a small wave for a parked thought, shocked at the clock.
  // A serious task has him asleep on the disc: there, and asking nothing.
  const mood = quiet
    ? 'asleep'
    : stuck
      ? 'stuck'
      : model.parkedNote
        ? 'nudge'
        : twoMinutesLeft
          ? 'shocked'
          : 'working';
  // Under the time there is one line, as every running frame draws it: the task. Scootch's words
  // take its place for the last two minutes, for a serious task, and while the task has no
  // monster yet (he says when it will hatch). His passing lines are for the Live Activity.
  const said = quiet || twoMinutesLeft || model.monster === null ? line : null;
  // A serious task has no menu: its two ways on are the dock, and its corner simply closes.
  const menu = quiet ? null : workingMenu(props);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.fill}
    >
      <SessionFrame
        inks={inks}
        page={quiet ? inks.quietPage : inks.page}
        align="drawn"
        footerInset={quiet || stuck || model.parkOpen ? 14 : 0}
        testID={quiet ? 'session-quiet' : 'session-running'}
        footer={<WorkingFooter {...props} park={park} />}
        behindFooter={
          model.parkOpen ? (
            // A touch anywhere above the dock closes it. Words already there are parked.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('session.park.close')}
              accessibilityHint={t('session.park.close.hint')}
              testID="session-park-cancel"
              onPress={() => (park.current ? park.current.close() : actions.closePark())}
              style={StyleSheet.absoluteFill}
            />
          ) : null
        }
        over={
          <>
            {model.parkedNote ? (
              <ParkedToast
                thought={model.parkedNote}
                title={t('session.park.parked')}
                detail={t('session.park.seeItAfter', { thought: model.parkedNote })}
                inks={inks}
              />
            ) : null}
            {menu && menuOpen ? (
              <SessionMenu
                items={menu}
                inks={inks}
                closeLabel={t('session.menu.close')}
                onClose={() => setMenuOpen(false)}
              />
            ) : null}
          </>
        }
        top={
          <>
            {quiet ? (
              <View />
            ) : (
              <GlassTag testID="session-pill" style={styles.pill}>
                <PillDot inks={inks} />
                <SessionText face="pill" color={inks.ink} numberOfLines={1} style={styles.fit}>
                  {name
                    ? t('session.pill', { name, minutes: model.plannedMinutes })
                    : t('session.pillPlain', { minutes: model.plannedMinutes })}
                </SessionText>
              </GlassTag>
            )}
            {menu ? (
              <GlassRound
                label={t('session.menu')}
                hint={t('session.menu.hint')}
                testID="session-menu"
                onPress={() => setMenuOpen((open) => !open)}
              >
                <MoreIcon color={inks.ink} />
              </GlassRound>
            ) : (
              <RoundButton
                label={t('session.leave')}
                hint={t('session.leave.hint')}
                testID="session-leave"
                inks={inks}
                onPress={actions.leave}
              />
            )}
          </>
        }
      >
        <View style={quiet ? styles.quietRing : stuck ? styles.stuckRing : styles.ring}>
          <TimeDisc
            fraction={model.fraction}
            quiet={quiet}
            size={ring}
            inks={inks}
            reducedMotion={model.reducedMotion}
            spokenLabel={spoken}
            hint={t('session.discHint')}
          >
            <Scootch
              mood={mood}
              tone="paper"
              attitude={model.attitude}
              workMode={model.workMode}
              reducedMotion={model.reducedMotion}
              care={quiet ? 'serious' : 'none'}
              squashOnChange
              size={scootchSize}
              testID="session-scootch"
            />
          </TimeDisc>
        </View>
        {stuck ? null : (
          <View style={quiet ? styles.quietWords : styles.words}>
            <SessionText
              face={quiet ? 'quietTime' : 'time'}
              color={inks.ink}
              testID="session-minutes"
              accessible={false}
            >
              {t('session.minutesLeft', { count: model.minutesLeft })}
            </SessionText>
            {said ? (
              <SessionText
                face="task"
                color={inks.muted}
                accessibilityLiveRegion="polite"
                testID="session-line"
                style={styles.text}
              >
                {said}
              </SessionText>
            ) : quiet ? null : (
              <SessionText face="task" color={inks.muted} testID="session-task" style={styles.text}>
                {model.taskText}
              </SessionText>
            )}
          </View>
        )}
      </SessionFrame>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  // The board's gaps under its 52-point top row, less the four points the corner row lacks.
  ring: {
    marginTop: 34,
  },
  stuckRing: {
    marginTop: 18,
  },
  quietRing: {
    marginTop: 44,
  },
  words: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginTop: 28,
    gap: 6,
    paddingBottom: 8,
  },
  quietWords: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginTop: 24,
    gap: 6,
    paddingBottom: 8,
  },
  text: {
    textAlign: 'center',
  },
  // The board's pill: 16 points in from each end, and it gives way before the corner control does.
  pill: {
    flexShrink: 1,
    paddingHorizontal: 16,
  },
  fit: {
    flexShrink: 1,
  },
});
