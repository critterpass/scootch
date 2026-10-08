import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { specFromSeed } from '@scootch/art';
import type { MonsterRow } from '@scootch/domain';

import { Monster } from '../../art/Monster';
import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { DRAWN_IN } from '../session/catch/catch-kinds';
import { fitBoard } from '../session/catch/fit-board';
import { STAGE } from '../session/catch/math';
import type { SceneHost, SceneTouch } from '../session/catch/rig';
import { SCENES } from '../session/catch/scenes';
import { scootchShare } from '../session/session-view';
import { HoldButton } from '../session/ui/hold-button';
import type { SessionInks } from '../session/ui/session-inks';
import { TimeDisc } from '../session/ui/time-disc';

/** A preview is a small session screen: this tall, with whoever waits in its corner this big. */
export const PREVIEW_HEIGHT = 208;
const SEAT = 28;
/** Where the preview's session stands: a little over half way through. */
const PREVIEW_LEFT = 0.6;
/** The hold button, drawn small and part-filled. */
const HOLD_SCALE = 0.3;
const HOLD_DRAWN = 148;
const HOLD_FILLED = 0.62;

/** The monster drawn where the phone has none of its own to show. */
export const STAND_IN: MonsterRow = {
  id: 'catch-with-preview',
  taskId: 'catch-with-preview',
  origin: 'task',
  spec: specFromSeed('tooth', 'tooth'),
  name: '',
  title: '',
  flavourText: '',
  hatchedAt: '2026-10-06T09:00:00.000Z',
  caughtAt: null,
  caughtOn: null,
  number: null,
  rarity: null,
  daysLurked: null,
  catchMinutes: null,
  dread: null,
  finish: 'paper',
};

/** A preview only shows: its catch says nothing, plays nothing and finishes nothing. */
const SILENT: SceneHost = {
  status: () => undefined,
  react: () => undefined,
  early: () => undefined,
  cue: () => undefined,
  shake: () => undefined,
  landed: () => undefined,
  won: () => undefined,
  sendFinish: () => Promise.resolve(),
};

/** The small session screen a preview is drawn on: the page, and nothing in it to press or read. */
export function Preview({
  inks,
  style,
  children,
}: {
  readonly inks: SessionInks;
  readonly style?: ViewProps['style'];
  readonly children: (width: number) => ReactNode;
}) {
  const [width, setWidth] = useState(0);
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={({ nativeEvent }) => setWidth(Math.round(nativeEvent.layout.width))}
      style={[styles.preview, { backgroundColor: inks.page }, style]}
    >
      {width > 0 ? children(width) : null}
    </View>
  );
}

export interface PreviewProps {
  readonly width: number;
  readonly monster: MonsterRow;
  readonly inks: SessionInks;
}

/** The pill beside whoever waits in the corner, with nothing written on it. */
function PillStub({ inks }: { readonly inks: SessionInks }) {
  return <View style={[styles.pillStub, { backgroundColor: inks.track }]} />;
}

/** Rolled: one of the catches as the session draws it, part-set, with Scootch in the corner. */
export function RolledPreview({ width, monster, inks }: PreviewProps) {
  const t = useT();
  const touch = useRef<SceneTouch | null>(null);
  const fit = fitBoard({ width, height: PREVIEW_HEIGHT }, DRAWN_IN.jar, {
    top: SEAT + 16,
    bottom: PREVIEW_HEIGHT - 10,
  });
  const Scene = SCENES.jar;
  return (
    <>
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
          kind="jar"
          monster={monster}
          inks={inks}
          t={t}
          progress={1 - PREVIEW_LEFT}
          ready={false}
          ended={false}
          still
          caughtCount={null}
          monthMates={[]}
          monthName=""
          host={SILENT}
          touch={touch}
        />
      </View>
      <View style={styles.corner}>
        <Scootch mood="working" reducedMotion size={SEAT} />
        <PillStub inks={inks} />
      </View>
    </>
  );
}

/** Hold: Scootch on his disc, the monster in the corner, and the hold button part-filled. */
export function HoldPreview({ width, monster, inks }: PreviewProps) {
  const filled = useSharedValue(HOLD_FILLED);
  const nothing = () => undefined;
  const hold = HOLD_DRAWN * HOLD_SCALE;
  const ring = Math.min(width - 44, PREVIEW_HEIGHT - SEAT - hold - 44);
  return (
    <>
      <View style={styles.corner}>
        <Monster spec={monster.spec} idle={false} reducedMotion size={SEAT} />
        <PillStub inks={inks} />
      </View>
      <View style={[styles.disc, { top: SEAT + 18 }]}>
        <TimeDisc
          fraction={PREVIEW_LEFT}
          quiet={false}
          size={ring}
          inks={inks}
          reducedMotion
          spokenLabel=""
          hint=""
        >
          <Scootch
            mood="working"
            tone="paper"
            reducedMotion
            size={Math.round(scootchShare(PREVIEW_LEFT) * ring)}
          />
        </TimeDisc>
      </View>
      <View style={[styles.hold, { width: hold, height: hold, left: (width - hold) / 2 }]}>
        <View style={{ transform: [{ scale: HOLD_SCALE }] }}>
          <HoldButton
            progress={filled}
            label=""
            spokenLabel=""
            hint=""
            inks={inks}
            onPressIn={nothing}
            onPressOut={nothing}
            onActivate={nothing}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  preview: { height: PREVIEW_HEIGHT, overflow: 'hidden' },
  board: { position: 'absolute', width: STAGE.width, height: STAGE.height },
  corner: {
    position: 'absolute',
    left: 8,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pillStub: { width: 54, height: 16, borderRadius: 8 },
  disc: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  // The button keeps its drawn size and is scaled about its middle, so its box is the small one.
  hold: { position: 'absolute', bottom: 10, alignItems: 'center', justifyContent: 'center' },
});
