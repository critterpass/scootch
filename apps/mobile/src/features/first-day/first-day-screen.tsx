import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';

import { TIMING, type Framing, type PhuMood } from '@phusclass/art/class';

import { Classroom } from '../../classroom/classroom';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { KeyboardCatcher } from '../../ui/keyboard-away';
import { PressSpring } from '../../ui/motion/press-spring';
import { useForcedVariant } from '../../screens/registry/support/forced-variant';
import { useScreenStyle } from '../../ui/use-screen-style';
import { askForNotes } from '../notes/notes-home';
import { writeNotesSettings } from '../notes/notes-settings';

import { Body, Bubble, ExampleNote, Heading, Sheet } from './first-day-parts';
import { styles } from './first-day-styles';
import { useHisLine } from './his-line';
import { givenNameOf, markFirstDayDone, saveFullName, tidyName, useFirstDay } from './student';

/** The four beats of the first day. */
export type Beat = 'class' | 'roll call' | 'notes home' | 'empty desk';

/** How long his answer stays before the next beat. */
const ANSWER_MS = 2200;
/** In the wide shot he says the class, then "Sit." */
const SIT_AFTER_MS = 1400;

export interface FirstDayScreenProps {
  /** Where to start: the class, unless a registry capture shows a later beat. */
  readonly beat?: Beat;
  /** For a capture: the name typed at roll call. */
  readonly typedName?: string;
}

/**
 * The first day, as one continuous classroom: the wide, empty room and "Sit."; the push-in to the
 * desk; roll call with the full name; notes home with one real example, where "Not now" is as easy
 * as yes; and the empty desk. No paywall, and no permission but his notes, asked only on yes.
 */
export function FirstDayScreen({ beat: start = 'class', typedName = '' }: FirstDayScreenProps) {
  const t = useT();
  const say = useHisLine();
  const db = useSQLiteContext();
  const router = useRouter();
  const { palette, allowFontScaling, size, reducedMotion, captured } = useScreenStyle();
  const { fullName } = useFirstDay();
  const keyboardShown = useForcedVariant()?.condition === 'keyboard-open';
  const [beat, setBeat] = useState<Beat>(start);
  const [framing, setFraming] = useState<Framing>(start === 'class' ? 'firstDay' : 'desk');
  const [line, setLine] = useState(() => openingLine(start));
  const [name, setName] = useState(typedName === '' ? (fullName ?? '') : typedName);
  const [busy, setBusy] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function openingLine(of: Beat): string {
    switch (of) {
      case 'class':
        return say('firstDayClass', 'first-day');
      case 'roll call':
        return say('rollCallAsk', 'first-day');
      case 'notes home':
        return say('notesHomeAsk', 'first-day');
      case 'empty desk':
        return say('firstDayEmptyDesk', 'first-day');
    }
  }

  const later = (ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // In the wide shot: the class on the board, then "Sit."
  useEffect(() => {
    if (beat !== 'class' || captured) return undefined;
    const timer = setTimeout(() => setLine(say('firstDaySit', 'first-day')), SIT_AFTER_MS);
    return () => clearTimeout(timer);
  }, [beat, captured]);

  const goTo = (next: Beat, after = 0) => {
    later(after, () => {
      setBusy(false);
      setBeat(next);
      setLine(openingLine(next));
    });
  };

  const takeSeat = () => {
    setBusy(true);
    setFraming('desk');
    setLine('');
    goTo('roll call', reducedMotion ? 0 : TIMING.cameraMs);
  };

  const present = () => {
    const typed = tidyName(name);
    if (typed === '' || busy) return;
    setBusy(true);
    Keyboard.dismiss();
    void saveFullName(db, typed).then(() => {
      setLine(say('rollCallRepeat', typed, { name: givenNameOf(typed) }));
      goTo('notes home', ANSWER_MS);
    });
  };

  const allowNotes = () => {
    if (busy) return;
    setBusy(true);
    void askForNotes()
      .catch(() => false)
      .then((granted) => writeNotesSettings(db, { enabled: granted }))
      .finally(() => goTo('empty desk'));
  };

  const notNow = () => {
    if (busy) return;
    setBusy(true);
    void writeNotesSettings(db, { enabled: false }).finally(() => {
      setLine(say('notesHomeNotNow', 'first-day'));
      goTo('empty desk', ANSWER_MS);
    });
  };

  const toDesk = () => {
    if (busy) return;
    setBusy(true);
    void markFirstDayDone(db).finally(() => router.replace('/'));
  };

  const mood: PhuMood = beat === 'class' ? 'calm' : 'over';
  const chalk =
    beat === 'class'
      ? {
          chalkTitle: {
            title: t('firstDay.chalk.class'),
            subtitle: t('firstDay.chalk.subtitle'),
          },
        }
      : beat === 'empty desk'
        ? { chalk: [t('firstDay.chalk.nothing')], more: t('firstDay.chalk.tell') }
        : {
            chalk: [
              t('firstDay.chalk.class'),
              t('firstDay.chalk.students'),
              t('firstDay.label.rollCall'),
            ],
          };

  return (
    <View style={[styles.fill, { backgroundColor: palette.page }]} testID="first-day">
      <Classroom
        framing={framing}
        mood={mood}
        {...chalk}
        accessibilityLabel={t('firstDay.room')}
        style={StyleSheet.absoluteFill}
      />
      <Bubble text={line} wide={framing === 'firstDay'} />
      {/* At roll call, a tap on the room puts the keyboard away. */}
      <KeyboardCatcher />
      <KeyboardAvoidingView behavior="padding" style={styles.foot} pointerEvents="box-none">
        {beat === 'class' ? (
          <Sheet label={t('firstDay.label.first')} beat={beat}>
            <Heading>{t('firstDay.started')}</Heading>
            <Body>{t('firstDay.intro')}</Body>
            <CapsuleButton
              label={t('firstDay.takeSeat')}
              hint={t('firstDay.takeSeat.hint')}
              onPress={takeSeat}
              disabled={busy}
              testID="first-day-take-seat"
              style={styles.action}
            />
          </Sheet>
        ) : null}
        {beat === 'roll call' ? (
          <Sheet label={t('firstDay.label.rollCall')} beat={beat}>
            <Heading>{t('firstDay.name.heading')}</Heading>
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.hint, { color: palette.muted, fontSize: size(13) }]}
            >
              {t('firstDay.name.note')}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onSubmitEditing={present}
              accessibilityLabel={t('firstDay.name.heading')}
              accessibilityHint={t('firstDay.name.note')}
              allowFontScaling={allowFontScaling}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              autoCorrect={false}
              returnKeyType="done"
              editable={!busy}
              autoFocus={keyboardShown}
              testID="first-day-name"
              style={[
                styles.input,
                { color: palette.ink, fontSize: size(18), backgroundColor: `${palette.ink}0F` },
              ]}
            />
            <CapsuleButton
              label={t('firstDay.present')}
              hint={t('firstDay.present.hint')}
              onPress={present}
              disabled={busy || tidyName(name) === ''}
              testID="first-day-present"
              style={styles.action}
            />
          </Sheet>
        ) : null}
        {beat === 'notes home' ? (
          <Sheet
            label={t('firstDay.label.notes')}
            beat={beat}
            trailing={
              <PressSpring
                accessibilityRole="button"
                accessibilityLabel={t('firstDay.notes.notNow')}
                accessibilityHint={t('firstDay.notes.notNow.hint')}
                onPress={notNow}
                disabled={busy}
                testID="first-day-not-now"
                style={styles.notNow}
              >
                <Text
                  allowFontScaling={allowFontScaling}
                  style={[styles.notNowText, { color: palette.muted, fontSize: size(15) }]}
                >
                  {t('firstDay.notes.notNow')}
                </Text>
              </PressSpring>
            }
          >
            <Heading>{t('firstDay.notes.heading')}</Heading>
            <ExampleNote
              body={say('notesHomeExample', 'first-day', {
                task: t('firstDay.notes.exampleTask'),
              })}
            />
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.hint, { color: palette.muted, fontSize: size(13) }]}
            >
              {t('firstDay.notes.rules')}
            </Text>
            <PressSpring
              accessibilityRole="button"
              accessibilityLabel={t('firstDay.notes.allow')}
              accessibilityHint={t('firstDay.notes.allow.hint')}
              accessibilityState={{ disabled: busy }}
              onPress={allowNotes}
              disabled={busy}
              feedback="primary"
              testID="first-day-allow-notes"
              style={[styles.red, styles.action]}
            >
              <Text
                allowFontScaling={allowFontScaling}
                style={[styles.redText, { fontSize: size(17) }]}
              >
                {t('firstDay.notes.allow')}
              </Text>
            </PressSpring>
          </Sheet>
        ) : null}
        {beat === 'empty desk' ? (
          <Sheet label={t('firstDay.label.desk')} beat={beat} quietLabel>
            <Heading>{t('firstDay.desk.heading')}</Heading>
            <Body>{t('firstDay.desk.body')}</Body>
            <CapsuleButton
              label={t('firstDay.toDesk')}
              hint={t('firstDay.toDesk.hint')}
              onPress={toDesk}
              disabled={busy}
              testID="first-day-to-desk"
              style={styles.action}
            />
          </Sheet>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
