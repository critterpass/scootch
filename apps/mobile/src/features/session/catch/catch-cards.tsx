import { StyleSheet, View } from 'react-native';

import { Scootch } from '../../../art/Scootch';
import { CapsuleButton } from '../../../ui/buttons';
import { RiseIn } from '../../../ui/motion/rise-in';
import type { ScreenProps } from '../screens/screen-props';
import { SessionText } from '../ui/session-text';

import { taskAsTyped } from './catch-words';
import { taskPhrase } from './task-phrase';

/**
 * How catching works, shown before the very first catch: do the real thing, the trap sets itself,
 * say you are done and then catch him. Its button starts the session.
 */
export function CoachCard({
  model,
  actions,
  inks,
  t,
  top,
}: ScreenProps & { readonly top: number }) {
  const steps = [
    [
      'session.catch.coach.one',
      t('session.catch.coach.one.sub', { task: taskAsTyped(model.taskText) }),
    ],
    [
      'session.catch.coach.two',
      t('session.catch.coach.two.sub', { name: model.monster?.name ?? '' }),
    ],
    ['session.catch.coach.three', t('session.catch.coach.three.sub')],
  ] as const;
  return (
    <RiseIn testID="session-catch-coach" style={[styles.coach, { top }]}>
      <View style={[styles.panel, styles.coachPanel, { backgroundColor: inks.surface }]}>
        <SessionText face="eyebrow" color={inks.muted}>
          {t('session.catch.coach.title')}
        </SessionText>
        {steps.map(([title, detail], index) => (
          <View key={title} style={styles.step}>
            <View
              style={[styles.number, { backgroundColor: index === 0 ? inks.tomato : inks.ink }]}
            >
              <SessionText face="chip" color={index === 0 ? inks.onTomato : inks.page}>
                {index + 1}
              </SessionText>
            </View>
            <View style={styles.stepWords}>
              <SessionText face="thought" color={inks.ink}>
                {t(title)}
              </SessionText>
              <SessionText face="chip" color={inks.muted} style={styles.plain}>
                {detail}
              </SessionText>
            </View>
          </View>
        ))}
        <CapsuleButton
          tone="ink"
          label={t('session.catch.coach.start', { count: model.plannedMinutes })}
          hint={t('session.catch.coach.start.hint')}
          testID="session-catch-start"
          onPress={actions.startNow}
        />
      </View>
    </RiseIn>
  );
}

/**
 * Time is up: Scootch asks whether the thing was really done. Only a yes unlocks the catch, and
 * "Not yet" gives more time. The drawing behind it is dimmed and takes no touch.
 */
export function AskSheet({
  model,
  inks,
  t,
  bottom,
  onYes,
  onNotYet,
}: ScreenProps & {
  readonly bottom: number;
  readonly onYes: () => void;
  readonly onNotYet: () => void;
}) {
  return (
    <>
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
      <RiseIn testID="session-catch-ask" style={[styles.sheet, { bottom }]}>
        <View style={[styles.panel, styles.sheetPanel, { backgroundColor: inks.surface }]}>
          <Scootch
            mood="nudge"
            attitude={model.attitude}
            reducedMotion={model.reducedMotion}
            size={130}
          />
          <SessionText
            face="step"
            color={inks.ink}
            accessibilityLiveRegion="polite"
            testID="session-catch-question"
            style={styles.centred}
          >
            {t('session.catch.ask', { task: taskPhrase(model.taskText) })}
          </SessionText>
          <SessionText face="caption" color={inks.muted} style={styles.centred}>
            {t('session.catch.ask.sub')}
          </SessionText>
          <View style={styles.answers}>
            <CapsuleButton
              tone="ink"
              label={t('session.catch.yes')}
              hint={t('session.catch.yes.hint')}
              testID="session-catch-yes"
              onPress={onYes}
            />
            <CapsuleButton
              tone="quiet"
              label={t('session.catch.notYet')}
              hint={t('session.catch.notYet.hint')}
              testID="session-catch-not-yet"
              onPress={onNotYet}
            />
          </View>
        </View>
      </RiseIn>
    </>
  );
}

const styles = StyleSheet.create({
  panel: { boxShadow: '0 24px 50px -20px rgba(28,26,23,0.35)' },
  coach: { position: 'absolute', left: 14, right: 14 },
  coachPanel: {
    borderRadius: 34,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 16,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepWords: { flex: 1, gap: 3 },
  plain: { fontWeight: '400' },
  centred: { textAlign: 'center' },
  dim: { backgroundColor: 'rgba(28,26,23,0.28)' },
  sheet: { position: 'absolute', left: 8, right: 8 },
  sheetPanel: {
    borderRadius: 44,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 10,
  },
  answers: { alignSelf: 'stretch', gap: 8, marginTop: 6 },
});
