import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCue } from '../../../state/day-store-provider';
import { CORNER } from '../../../ui/corner-bar';
import { GlassGroup } from '../../../ui/glass-surface';
import type { ScreenProps } from '../screens/screen-props';
import { WorkingFooter } from '../screens/working-footer';
import { workingMenu } from '../screens/working-menu';
import { BurstMarks } from '../ui/burst-marks';
import type { ParkComposerHandle } from '../ui/park-composer';
import { ParkedToast } from '../ui/parked-toast';
import { SessionMenu, type SessionMenuItem } from '../ui/session-menu';
import { SessionText } from '../ui/session-text';

import { AskSheet, CoachCard } from './catch-cards';
import { catchStage, gestureUnlocked, trapProgress, type CatchAnswer } from './catch-flow';
import { CAPTION_AT } from './catch-kinds';
import { CatchTopRow, ROW } from './catch-top-row';
import { catchWords } from './catch-words';
import { STAGE } from './math';
import type { SceneTouch } from './rig';
import { SCENES } from './scenes';
import { useSceneHost } from './use-scene-host';

/** How long the catch has played before a tap anywhere may pass it. */
const PASS_AFTER_MS = 400;
/** The gap the board leaves under the corner row before the words, and before the coach card. */
const UNDER_ROW = 18;
const COACH_UNDER_ROW = 46;

/**
 * The session of a task whose monster is caught by hand, from the first minute to the catch. The
 * task stays the headline while the timer runs, and the trap setting itself is one quiet line
 * under it. When time is up Scootch asks whether the thing was really done: only a yes unlocks the
 * gesture, and "Not yet" gives more time. The same screen then plays the catch.
 */
export function CatchScreen(props: ScreenProps) {
  const { model, actions, inks, t } = props;
  const { view } = model;
  const insets = useSafeAreaInsets();
  const playCue = useCue();

  const [answer, setAnswer] = useState<CatchAnswer>('none');
  // An answer belongs to one time up: back at work, the next one asks again.
  useEffect(() => {
    if (view.kind === 'working') setAnswer('none');
  }, [view.kind]);
  const stage = catchStage(view, answer);
  const firstStage = useRef(stage).current;
  const scene = useSceneHost({
    stage,
    haptics: model.haptics,
    playCue,
    sendFinish: actions.sendFinish,
  });

  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((before) =>
      before && before.width === width && before.height === height ? before : { width, height },
    );
  }, []);
  // The board's phone, fitted whole into this one.
  const scale = size ? Math.min(size.width / STAGE.width, size.height / STAGE.height) : 1;
  const fitted = useRef({ scale: 1, left: 0, top: 0 });
  fitted.current = {
    scale,
    left: size ? (size.width - STAGE.width * scale) / 2 : 0,
    top: size ? (size.height - STAGE.height * scale) / 2 : 0,
  };

  // A touch on the drawing, handed to the scene in the board's points.
  const touch = useRef<SceneTouch | null>(null);
  const toBoard = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const { scale: by, left, top } = fitted.current;
    return [(locationX - left) / by, (locationY - top) / by] as const;
  };

  // A tap anywhere passes the catch, but not the tail of the gesture that made it.
  const caught = stage === 'caught';
  const [mayPass, setMayPass] = useState(false);
  useEffect(() => {
    if (!caught) return setMayPass(false);
    const timer = setTimeout(() => setMayPass(true), PASS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [caught]);

  const [menuOpen, setMenuOpen] = useState(false);
  const park = useRef<ParkComposerHandle | null>(null);
  const monster = model.monster;
  if (!monster || !model.catch) return null;
  const { kind } = model.catch;

  const working = view.kind === 'working' ? view : null;
  const stuck = working?.stuck === true;
  const timeUp = view.kind === 'finish' && view.timeUp;
  const { headline, sub } = catchWords({ ...scene, stage, model, t });

  // The corner menu. While the trap sets it holds what the working screen's does, and parking a
  // thought with it, since the foot of this screen belongs to the catch. Once time is up it is
  // the way to "Not finished", which is never out of reach.
  const menu: SessionMenuItem[] | null = working
    ? [
        {
          label: t('talk.parkThought'),
          hint: t('session.park.hint'),
          testID: 'session-park',
          onPress: actions.openPark,
        },
        ...workingMenu(props),
      ]
    : timeUp && (stage === 'waiting' || stage === 'ready')
      ? [
          {
            label: t('session.notFinished'),
            hint: t('session.notFinished.hint'),
            testID: 'session-leave',
            onPress: actions.leaveNow,
          },
        ]
      : null;

  const at = CAPTION_AT[kind];
  const footerUp = working !== null && (model.parkOpen || stuck);
  // The drawing takes a touch only while there is a catch to try: never under a card or a sheet.
  const touchable =
    (stage === 'setting' || stage === 'waiting' || stage === 'ready') && !footerUp && !menuOpen;
  const Scene = SCENES[kind];
  const rowTop = insets.top + CORNER.top;
  const foot = Math.max(insets.bottom, 12);

  return (
    <View
      style={[styles.fill, { backgroundColor: inks.page }]}
      testID={`session-catch-${stage}`}
      onLayout={onLayout}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, scene.joltStyle]}>
        {size ? (
          <View
            style={[
              styles.board,
              {
                left: (size.width - STAGE.width) / 2,
                top: (size.height - STAGE.height) / 2,
                transform: [{ scale }],
              },
            ]}
          >
            <Scene
              kind={kind}
              monster={monster}
              inks={inks}
              t={t}
              progress={trapProgress(stage, model.fraction)}
              ready={gestureUnlocked(stage)}
              ended={firstStage === 'caught'}
              still={model.reducedMotion}
              caughtCount={model.catch.caughtCount}
              monthMates={model.catch.monthMates}
              monthName={model.catch.monthName}
              host={scene.host}
              touch={touch}
            />
          </View>
        ) : null}
      </Animated.View>

      <View
        style={StyleSheet.absoluteFill}
        testID="session-catch-scene"
        accessibilityHint={t('session.catch.scene.hint')}
        onStartShouldSetResponder={() => touchable}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => touch.current?.down(...toBoard(event))}
        onResponderMove={(event) => touch.current?.move(...toBoard(event))}
        onResponderRelease={(event) => touch.current?.up(...toBoard(event))}
        onResponderTerminate={(event) => touch.current?.up(...toBoard(event))}
      />

      <GlassGroup style={[styles.row, { top: rowTop, paddingHorizontal: CORNER.side }]}>
        <CatchTopRow
          {...props}
          stage={stage}
          stuck={stuck}
          twoMinutesLeft={working?.twoMinutesLeft === true}
          hasMenu={menu !== null}
          onMenu={() => setMenuOpen((open) => !open)}
          onDidIt={() => setAnswer('yes')}
        />
      </GlassGroup>

      {stage === 'coach' || (footerUp && at === 'bottom') ? null : (
        <View
          pointerEvents="none"
          style={[
            styles.words,
            at === 'top' ? { top: rowTop + ROW + UNDER_ROW } : { bottom: foot + 10 },
          ]}
        >
          {headline ? (
            <SessionText
              face="step"
              color={inks.ink}
              accessibilityLiveRegion="polite"
              testID="session-catch-headline"
              // A long task shrinks a little, then ends in an ellipsis, before it reaches the drawing.
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={styles.centred}
            >
              {headline}
            </SessionText>
          ) : null}
          {sub ? (
            <SessionText
              face="caption"
              color={inks.muted}
              testID="session-catch-line"
              numberOfLines={3}
              style={styles.centred}
            >
              {sub}
            </SessionText>
          ) : null}
        </View>
      )}

      {footerUp ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={StyleSheet.absoluteFill}
        >
          {model.parkOpen ? (
            // A touch anywhere above the dock closes it. Words already there are parked.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('session.park.close')}
              accessibilityHint={t('session.park.close.hint')}
              testID="session-park-cancel"
              onPress={() => (park.current ? park.current.close() : actions.closePark())}
              style={styles.fill}
            />
          ) : (
            <View pointerEvents="none" style={styles.fill} />
          )}
          <View style={[styles.footer, { paddingBottom: foot }]}>
            <WorkingFooter {...props} park={park} />
          </View>
        </KeyboardAvoidingView>
      ) : null}

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

      {stage === 'coach' ? <CoachCard {...props} top={rowTop + ROW + COACH_UNDER_ROW} /> : null}
      {stage === 'asking' ? (
        <AskSheet
          {...props}
          bottom={Math.max(insets.bottom, 8)}
          onYes={() => setAnswer('yes')}
          onNotYet={() => setAnswer('not_yet')}
        />
      ) : null}

      {caught ? (
        <>
          <BurstMarks
            kind="catch"
            inks={inks}
            reducedMotion={model.reducedMotion}
            controlAt={size ? { x: size.width / 2, y: size.height * 0.4 } : null}
          />
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  board: { position: 'absolute', width: STAGE.width, height: STAGE.height },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  words: { position: 'absolute', left: 28, right: 28, alignItems: 'center', gap: 5 },
  centred: { textAlign: 'center' },
  footer: { paddingHorizontal: 14, paddingTop: 8 },
});
