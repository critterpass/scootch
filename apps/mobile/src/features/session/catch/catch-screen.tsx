import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCue } from '../../../state/day-store-provider';
import { CORNER } from '../../../ui/corner-bar';
import { GlassGroup } from '../../../ui/glass-surface';
import { useBurstFrom, useHoldFinish } from '../screens/hold-finish';
import type { ScreenProps } from '../screens/screen-props';
import { deskMood } from '../screens/working-desk';
import { workingMenu } from '../screens/working-menu';
import { ParkedToast } from '../ui/parked-toast';
import { SessionMenu, type SessionMenuItem } from '../ui/session-menu';

import { CatchBoard } from './catch-board';
import { AskSheet, CoachCard } from './catch-cards';
import { catchStage, type CatchAnswer } from './catch-flow';
import { CatchFoot } from './catch-foot';
import { CAPTION_AT, DRAWN_IN } from './catch-kinds';
import { CatchTopRow, CORNER_SEAT, ROW, scootchMood, type Seated } from './catch-top-row';
import { catchWords } from './catch-words';
import { CatchWordsBlock } from './catch-words-block';
import { CaughtOver } from './caught-over';
import { SwapFlyers, useFaceSwap, useSwapLayers } from './face-swap';
import { fitBoard, type BoardFit } from './fit-board';
import { MONSTER_SIZE } from './parts';
import { ScootchDesk } from './scootch-desk';
import { useSceneHost } from './use-scene-host';

/** The gap the board leaves under the corner row before the words, and before the coach card. */
const UNDER_ROW = 18;
const COACH_UNDER_ROW = 46;
/** The room the words are given: a headline and one quiet line, as the board sets them. */
const WORDS_ROOM = 58;
/** The room "Park a thought" takes under them: its own height and the gap above it. */
const PARK_ROOM = 54;
/** The air kept between the words and the drawing. */
const WORDS_AIR = 12;
/** The board's footers end 34 points above the screen's edge, and never nearer it than 12. */
const DRAWN_FOOT = 34;
const LEAST_FOOT = 12;
/** How far in from the sides a card or a field sits at the foot. */
const CARD_INSET = 14;

/**
 * The session of a task whose monster can be caught by hand, from the first minute to the catch.
 * It has two faces, and a tap on whoever sits in the corner swaps them.
 *
 * With the monster on the screen the task stays the headline while the timer runs, and the trap
 * setting itself is one quiet line under it. When time is up Scootch asks whether the thing was
 * really done: only a yes unlocks the gesture, and "Not yet" gives more time.
 *
 * With Scootch on the screen he works on his shrinking disc as the board draws him, the monster
 * waits in the corner beside its name, and the finish is the hold: time up, or "I'm done", brings
 * the button to the foot, and holding it until it bursts is the whole answer.
 *
 * Either way the same screen then plays the catch.
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
  // "Yes, it's done": the catch unlocks, and is heard to.
  const sayDone = () => {
    playCue('catch-unlock');
    setAnswer('yes');
  };
  const stage = catchStage(view, answer);
  const firstStage = useRef(stage).current;
  const scene = useSceneHost({
    stage,
    playCue,
    sendFinish: actions.sendFinish,
  });

  const finish = useHoldFinish(props);
  const heldFrom = useBurstFrom(finish);

  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((before) =>
      before && before.width === width && before.height === height ? before : { width, height },
    );
  }, []);
  const fitted = useRef<BoardFit>({ scale: 1, left: 0, top: 0 });
  const kindNow = model.catch?.kind ?? 'jar';
  const rowTop = insets.top + CORNER.top;
  const swap = useFaceSwap({
    opensOn: model.catch?.opensOn ?? 'monster',
    still: model.reducedMotion,
    places: () => {
      if (!size) return null;
      const { scale, top } = fitted.current;
      const drawn = DRAWN_IN[kindNow];
      return {
        corner: {
          x: CORNER.side + CORNER_SEAT / 2,
          y: rowTop + ROW / 2,
          size: CORNER_SEAT,
        },
        // The middle of what the catch draws, and a monster the size the catch draws its own.
        scene: {
          x: size.width / 2,
          y: top + ((drawn.top + drawn.bottom) / 2) * scale,
          size: MONSTER_SIZE * scale,
        },
      };
    },
  });
  // Scootch's own screen ends where the board's does.
  const deskFoot = insets.bottom + Math.max(LEAST_FOOT, DRAWN_FOOT - insets.bottom);
  const layers = useSwapLayers(swap.turn);
  // Who the screen is turning to: the row, the words and the foot follow at once, and the two
  // themselves take the length of the flight.
  const shown = swap.pending ?? swap.face;
  const atWork = shown === 'scootch';
  const swapping = swap.pending !== null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [wordsTall, setWordsTall] = useState(0);
  // Whether the pill is coming back from the field (it settles out of the field's width) or
  // turning up for the first time (it fades in).
  const fieldWasUp = useRef(false);
  if (model.parkOpen) fieldWasUp.current = true;
  const monster = model.monster;
  if (!monster || !model.catch) return null;
  const { kind } = model.catch;

  const working = view.kind === 'working' ? view : null;
  const stuck = working?.stuck === true;
  const timeUp = view.kind === 'finish' && view.timeUp;
  const { headline, sub } = catchWords({ ...scene, stage, model, t });

  // The corner menu. While the trap sets it holds what the working screen's does. Once time is up
  // it is the way to "Not finished", which is never out of reach.
  const menu: SessionMenuItem[] | null = working
    ? workingMenu(props)
    : timeUp && (atWork || stage === 'waiting' || stage === 'ready')
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
  const cardUp = working !== null && (model.parkOpen || stuck);
  // Each face is drawn while it has the screen and for the length of a swap either way.
  const sceneOn = swap.face === 'monster' || swapping;
  const deskOn = swap.face === 'scootch' || swapping;
  // With Scootch at work the foot is his: "Park a thought" sits there, as the board draws it.
  const footerUp = working !== null && (cardUp || deskOn);
  // Over the catch it sits under the two lines for as long as there is quiet work to interrupt:
  // not in the last two minutes, which are for the finish, and not under a card or the field.
  const parkShown =
    working !== null && sceneOn && stage === 'setting' && !cardUp && !working.twoMinutesLeft;
  // The words are given the room they turn out to need, and never less than the board's own: a
  // headline of two lines with the pill under it is taller than one line, and the drawing keeps
  // clear of all of it. The room only ever grows, so the drawing never jumps back mid-catch.
  const wordsRoom = Math.max(WORDS_ROOM + (parkShown ? PARK_ROOM : 0), wordsTall + WORDS_AIR);
  // The drawing takes a touch only while there is a catch to try: never under a card or a sheet.
  const touchable =
    swap.face === 'monster' &&
    !swapping &&
    (stage === 'setting' || stage === 'waiting' || stage === 'ready') &&
    !cardUp &&
    !menuOpen;
  // The two change places while there is work or a finish to swap: not before the start, not once
  // the monster is caught, and not from under a field, a card or a held button.
  const maySwap =
    stage !== 'coach' && stage !== 'caught' && !model.parkOpen && finish.hold.caption !== 'holding';
  // Mid-swap both wait in the corner unseen, so whoever lands there is already drawn.
  const seat = (who: 'monster' | 'scootch'): Seated =>
    swap.face !== who ? (swap.flying ? 'unseen' : 'seen') : swapping ? 'unseen' : 'away';
  const finishing = view.kind === 'finish' || view.kind === 'caught';
  const rootID = !atWork
    ? `session-catch-${stage}`
    : finishing
      ? 'session-finish-hold'
      : 'session-running';
  const foot = Math.max(insets.bottom, 12);
  // The board is fitted to this phone so the catch keeps its size: it stays clear of the top row
  // and of the words, which sit above the drawing or below it.
  const fit = size
    ? fitBoard(size, DRAWN_IN[kind], {
        top: rowTop + ROW + (at === 'top' ? UNDER_ROW + wordsRoom : 0),
        bottom: size.height - foot - (at === 'bottom' ? 10 + wordsRoom : 0),
      })
    : null;
  if (fit) fitted.current = fit;
  const caught = stage === 'caught';

  return (
    <View
      style={[styles.fill, { backgroundColor: inks.page }]}
      ref={swap.rootRef}
      testID={rootID}
      onLayout={onLayout}
    >
      <CatchBoard
        model={model}
        inks={inks}
        t={t}
        catching={model.catch}
        stage={stage}
        fit={fit}
        drawn={sceneOn}
        ended={firstStage === 'caught'}
        host={scene.host}
        jolt={scene.joltStyle}
        layer={layers.scene}
        // With Scootch on the screen there is no drawing to touch, and his own controls are there.
        inReach={swap.face === 'monster' && !swapping}
        touchable={touchable}
      />

      {size && deskOn ? (
        <ScootchDesk
          {...props}
          screen={size}
          top={rowTop + ROW}
          foot={deskFoot}
          finish={finish}
          swapping={swapping}
          scootchAway={swap.flying || swap.pending === 'scootch'}
          scootchRef={swap.deskRef}
          layer={layers.desk}
        />
      ) : null}

      <GlassGroup style={[styles.row, { top: rowTop, paddingHorizontal: CORNER.side }]}>
        <CatchTopRow
          {...props}
          stage={stage}
          face={shown}
          seats={{ scootch: seat('scootch'), monster: seat('monster') }}
          monsterMood={finish.monsterMood}
          onSwap={() => {
            if (!maySwap) return;
            setMenuOpen(false);
            swap.swap();
          }}
          stuck={stuck}
          twoMinutesLeft={working?.twoMinutesLeft === true}
          hasMenu={menu !== null}
          onMenu={() => setMenuOpen((open) => !open)}
          onDidIt={sayDone}
        />
      </GlassGroup>

      {!sceneOn || stage === 'coach' || (cardUp && at === 'bottom') ? null : (
        // The catch's words come and go with its drawing.
        <Animated.View
          pointerEvents={swapping ? 'none' : 'box-none'}
          style={[StyleSheet.absoluteFill, layers.scene]}
        >
          <CatchWordsBlock
            place={at === 'top' ? { top: rowTop + ROW + UNDER_ROW } : { bottom: foot + 10 }}
            headline={headline}
            sub={sub}
            inks={inks}
            t={t}
            park={parkShown ? { onPress: actions.openPark, back: fieldWasUp.current } : null}
            onTall={(tall) => setWordsTall((before) => Math.max(before, Math.ceil(tall)))}
          />
        </Animated.View>
      )}

      {footerUp ? (
        <CatchFoot
          {...props}
          inset={cardUp ? CARD_INSET : 0}
          bottom={deskOn ? deskFoot : foot}
          layer={cardUp ? null : layers.desk}
        />
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
      {stage === 'asking' && !atWork ? (
        <AskSheet
          {...props}
          bottom={Math.max(insets.bottom, 8)}
          onYes={sayDone}
          onNotYet={() => setAnswer('not_yet')}
        />
      ) : null}

      {caught ? (
        <CaughtOver
          {...props}
          // Out of the held button, or out of the middle of the catch.
          burstFrom={atWork ? heldFrom : size ? { x: size.width / 2, y: size.height * 0.4 } : null}
        />
      ) : null}

      {swap.flight ? (
        <SwapFlyers
          flight={swap.flight}
          turn={swap.turn}
          model={model}
          // He flies as he will land: at work on the disc, or as the catch has him in his corner.
          mood={
            swap.pending === 'scootch'
              ? deskMood(model, finishing ? finish : null)
              : scootchMood(stage, stuck, working?.twoMinutesLeft === true)
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
