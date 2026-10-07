import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Attitude } from '@scootch/domain';
import { fonts, radius, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { Tick, WaveIcon } from '../../ui/icons';
import { ScootchSays } from '../../ui/scootch-says';
import { useScreenStyle } from '../../ui/use-screen-style';

import { FAVOURS, type Favour } from './launch-machine';
import { LaunchPage } from './launch-page';

const ROW_SIZE = 17;
const REASON_SIZE = 15;
const CELEBRATION_MS = 2400;
/** How big the design draws Scootch on these two screens. */
const HELLO_SCOOTCH = 320;
const PERMISSIONS_SCOOTCH = 230;

export interface HelloViewProps {
  /** Scootch's hello and what he is for, from the offline pack. */
  readonly line: string;
  readonly more: string;
  readonly attitude: Attitude;
  readonly onSqueak: () => void;
  readonly onNext: () => void;
}

/** The first thing a new person sees: Scootch, his hello and one button. No sign-up. */
export function HelloView({ line, more, attitude, onSqueak, onNext }: HelloViewProps) {
  const t = useT();
  // The celebration is an entrance: it plays, then Scootch settles and waits.
  const [celebrating, setCelebrating] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setCelebrating(false), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <LaunchPage
      step={1}
      testID="launch-hello"
      footer={
        <CapsuleButton
          label={t('launch.hello.action')}
          hint={t('launch.hello.hint')}
          onPress={onNext}
          testID="launch-hello-next"
        />
      }
    >
      <ScootchSays
        mood={celebrating ? 'celebrating' : 'waiting'}
        attitude={attitude}
        line={line}
        more={more}
        figureSize={HELLO_SCOOTCH}
        onPress={onSqueak}
      />
    </LaunchPage>
  );
}

export interface PermissionsViewProps {
  /** Scootch's ask and his reason for each favour, from the offline pack. */
  readonly line: string;
  readonly reasons: Readonly<Record<Favour, string>>;
  readonly attitude: Attitude;
  /** The favour the buttons answer for. */
  readonly asking: Favour;
  readonly accepted: readonly Favour[];
  /** The system's own prompt is on show, so the buttons wait. */
  readonly prompting: boolean;
  readonly onAnswer: (accepted: boolean) => void;
}

/**
 * The two favours, asked in character one at a time before the system asks anything. "Not now"
 * skips the favour on show, and the system is then never asked for it.
 */
export function PermissionsView({
  line,
  reasons,
  attitude,
  asking,
  accepted,
  prompting,
  onAnswer,
}: PermissionsViewProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  const askingIndex = FAVOURS.indexOf(asking);

  return (
    <LaunchPage
      step={3}
      testID="launch-permissions"
      footer={
        <GlassSurface style={[styles.dock, largeText && styles.dockStacked]}>
          <CapsuleButton
            tone="quiet"
            label={t('session.notNow')}
            hint={t('launch.permissions.skip.hint')}
            disabled={prompting}
            onPress={() => onAnswer(false)}
            testID="launch-permission-skip"
            style={[styles.answer, styles.clear]}
          />
          <CapsuleButton
            label={t('launch.permissions.accept')}
            hint={t('launch.permissions.accept.hint')}
            disabled={prompting}
            onPress={() => onAnswer(true)}
            testID="launch-permission-accept"
            style={styles.answer}
          />
        </GlassSurface>
      }
    >
      <ScootchSays
        mood="bargaining"
        attitude={attitude}
        line={line}
        figureSize={PERMISSIONS_SCOOTCH}
      />
      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        {FAVOURS.map((favour, index) => {
          const current = favour === asking && !prompting;
          const answered = index < askingIndex || prompting;
          return (
            <View
              key={favour}
              accessible
              accessibilityState={{ selected: current }}
              testID={`launch-permission-${favour}`}
              style={[
                styles.row,
                largeText && styles.rowStacked,
                index > 0 && { borderTopColor: `${palette.ink}14`, borderTopWidth: 1 },
                { opacity: current ? 1 : 0.5 },
              ]}
            >
              <View
                style={[
                  styles.badge,
                  { backgroundColor: favour === 'notifications' ? palette.tomato : palette.ink },
                ]}
              >
                {answered && accepted.includes(favour) ? (
                  <Tick color={favour === 'notifications' ? palette.onTomato : palette.page} />
                ) : favour === 'microphone' ? (
                  <WaveIcon color={palette.page} />
                ) : null}
              </View>
              <Text
                allowFontScaling={allowFontScaling}
                style={[styles.name, { color: palette.ink, fontSize: size(ROW_SIZE) }]}
              >
                {t(`launch.permissions.${favour}`)}
              </Text>
              <Text
                allowFontScaling={allowFontScaling}
                style={[
                  styles.reason,
                  largeText && styles.reasonStacked,
                  { color: palette.muted, fontSize: size(REASON_SIZE) },
                ]}
              >
                {reasons[favour]}
              </Text>
            </View>
          );
        })}
      </View>
    </LaunchPage>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 7,
    borderRadius: 34,
    overflow: 'hidden',
  },
  dockStacked: {
    flexDirection: 'column-reverse',
    alignItems: 'stretch',
  },
  answer: {
    flexGrow: 1,
    flexBasis: 0,
  },
  clear: {
    backgroundColor: 'transparent',
  },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 3,
  },
  rowStacked: {
    flexWrap: 'wrap',
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.body,
  },
  reason: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.body,
  },
  reasonStacked: {
    flexBasis: '100%',
    textAlign: 'left',
  },
});
