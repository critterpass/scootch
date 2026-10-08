import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { LayoutAnimationConfig } from 'react-native-reanimated';

import { GlassPill, RoundButton as GlassRound } from '../../../ui/buttons';
import { MoreIcon } from '../../../ui/icons';
import { useKeyboardOpen } from '../../../ui/use-keyboard-open';
import { shortName } from '../../monster/monster-name';
import { RoundButton } from '../ui/controls';
import type { ParkComposerHandle } from '../ui/park-composer';
import { PillDot } from '../ui/pill-marks';
import { ParkedToast } from '../ui/parked-toast';
import { SessionFrame } from '../ui/session-frame';
import { SessionMenu } from '../ui/session-menu';
import { SessionText } from '../ui/session-text';

import type { ScreenProps } from './screen-props';
import { deskRing, WorkingDesk } from './working-desk';
import { WorkingFooter } from './working-footer';
import { workingMenu } from './working-menu';

/** How long the pill shows the monster's whole name and title after a tap. */
const FULL_NAME_MS = 4000;
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
  // The pill carries the monster's short name; a tap spells it out in full for a few seconds.
  const [named, setNamed] = useState(false);
  useEffect(() => {
    if (!named) return undefined;
    const timer = setTimeout(() => setNamed(false), FULL_NAME_MS);
    return () => clearTimeout(timer);
  }, [named]);
  const keyboardOpen = useKeyboardOpen();
  const park = useRef<ParkComposerHandle | null>(null);
  if (model.view.kind !== 'working') return null;
  const { quiet, stuck } = model.view;

  const ring = deskRing({
    width,
    height,
    small: quiet || stuck,
    besideKeyboard: model.parkOpen && keyboardOpen,
  });
  const name = model.monster?.name;
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
        footer={
          // What is at the foot when the screen opens is simply there; only a change of it moves.
          <LayoutAnimationConfig skipEntering>
            <WorkingFooter {...props} park={park} />
          </LayoutAnimationConfig>
        }
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
          quiet ? undefined : (
            <GlassPill
              label={name ?? t('session.pillPlain', { minutes: model.plannedMinutes })}
              hint={t('session.pill.hint')}
              testID="session-pill"
              onPress={() => setNamed((shown) => !shown)}
              style={styles.pill}
            >
              <PillDot inks={inks} />
              <SessionText
                face="pill"
                color={inks.ink}
                numberOfLines={named ? 2 : 1}
                style={styles.fit}
              >
                {named && name
                  ? name
                  : name
                    ? t('session.pill', {
                        name: shortName(name),
                        minutes: model.plannedMinutes,
                      })
                    : t('session.pillPlain', { minutes: model.plannedMinutes })}
              </SessionText>
            </GlassPill>
          )
        }
        corner={
          menu ? (
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
          )
        }
      >
        <WorkingDesk {...props} ring={ring} />
      </SessionFrame>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  // The board's pill: 16 points in from each end, and it gives way before the corner control does.
  pill: {
    flexShrink: 1,
  },
  fit: {
    flexShrink: 1,
  },
});
