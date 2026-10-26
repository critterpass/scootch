import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@phusclass/tokens';

import { Classroom } from '../../classroom/classroom';
import { useT } from '../../i18n/i18n-provider';
import { PressSpring } from '../../ui/motion/press-spring';
import { FeelProvider } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

/** The Serious board's quiet grey, laid over the classroom so its colour drains. */
const GREY_VEIL = 'rgba(236,234,230,0.55)';
const DARK_GREY_VEIL = 'rgba(23,21,19,0.45)';
const QUIET_BUTTON = '#3A3530';
/** The most of a task the chalkboard has room for, as the board writes it. */
const CHALK_CHARACTERS = 22;

/** The task on the chalkboard: whole words up to its width, then an ellipsis. */
export function chalkLine(task: string): string {
  if (task.length <= CHALK_CHARACTERS) return task;
  const cut = task.slice(0, CHALK_CHARACTERS + 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 8 ? cut.slice(0, space) : cut.slice(0, CHALK_CHARACTERS)).trimEnd()}…`;
}

export interface SeriousScreenProps {
  /** The heavy task, in the person's own words. */
  readonly task: string;
  /** His plain company (`seriousCompany`), or what he says after "be funny". */
  readonly line: string;
  /** Offered only for a task the screen judged serious; never for a crisis or an unscreened one. */
  readonly beFunnyOffered: boolean;
  readonly onSit: () => void;
  readonly onNotNow: () => void;
  readonly onBeFunny: () => void;
}

/**
 * Serious mode: no act, no joke, no grade, no fuse, no share, no happening. The classroom is grey
 * and still, he has taken off his glasses, and he keeps plain company.
 */
export function SeriousScreen({
  task,
  line,
  beFunnyOffered,
  onSit,
  onNotNow,
  onBeFunny,
}: SeriousScreenProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const light = palette.ink === '#1C1A17';
  return (
    <FeelProvider motion="calm" care="serious" haptics={false}>
      <View style={[styles.fill, { backgroundColor: palette.page }]} testID="care-serious">
        <View style={styles.room}>
          <Classroom
            framing="desk"
            mood="serious"
            chalk={[chalkLine(task)]}
            more={t('care.serious.chalkMore')}
            accessibilityLabel={t('care.serious.room')}
            style={styles.fill}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: light ? GREY_VEIL : DARK_GREY_VEIL },
            ]}
          />
        </View>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: light ? 'rgba(255,253,249,0.97)' : palette.surface,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <Text
            accessibilityRole="header"
            allowFontScaling={allowFontScaling}
            {...(largeText ? {} : { numberOfLines: 3 })}
            style={[styles.task, { color: palette.ink, fontSize: size(22) }]}
          >
            {task}
          </Text>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.line, { color: light ? '#4A443E' : palette.ink, fontSize: size(18) }]}
            testID="care-serious-line"
          >
            {line}
          </Text>
          <View style={styles.actions}>
            <PressSpring
              accessibilityRole="button"
              accessibilityLabel={t('care.serious.sit')}
              accessibilityHint={t('care.serious.sit.hint')}
              onPress={onSit}
              testID="care-serious-sit"
              style={[styles.button, { backgroundColor: light ? QUIET_BUTTON : palette.ink }]}
            >
              <Text
                allowFontScaling={allowFontScaling}
                style={[
                  styles.buttonText,
                  { color: light ? '#FFFFFF' : palette.page, fontSize: size(17) },
                ]}
              >
                {t('care.serious.sit')}
              </Text>
            </PressSpring>
            <PressSpring
              accessibilityRole="button"
              accessibilityLabel={t('care.serious.notNow')}
              accessibilityHint={t('care.serious.notNow.hint')}
              onPress={onNotNow}
              testID="care-serious-not-now"
              style={styles.quiet}
            >
              <Text
                allowFontScaling={allowFontScaling}
                style={[styles.quietText, { color: palette.ink, fontSize: size(17) }]}
              >
                {t('care.serious.notNow')}
              </Text>
            </PressSpring>
            {beFunnyOffered ? (
              <PressSpring
                accessibilityRole="button"
                accessibilityLabel={t('settings.beFunny')}
                accessibilityHint={t('care.serious.beFunny.hint')}
                onPress={onBeFunny}
                testID="care-serious-be-funny"
                style={styles.quiet}
              >
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[styles.funnyText, { color: palette.muted, fontSize: size(15) }]}
                >
                  {t('settings.beFunny')}
                </Text>
              </PressSpring>
            ) : null}
          </View>
        </View>
      </View>
    </FeelProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  room: { flex: 1, minHeight: 180 },
  sheet: {
    marginTop: -34,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingTop: 28,
    paddingHorizontal: 20,
    gap: 10,
    boxShadow: '0 -8px 30px rgba(60,40,20,0.12)',
  },
  task: { fontWeight: '700', letterSpacing: -0.3 },
  line: { fontFamily: fonts.heading, fontWeight: '700' },
  actions: { marginTop: 16, gap: 6 },
  button: {
    minHeight: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontWeight: '700', textAlign: 'center' },
  quiet: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  quietText: { fontWeight: '600', textAlign: 'center' },
  funnyText: { fontWeight: '600', textAlign: 'center' },
});
