import { useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { specFromSeed } from '@scootch/art';
import { fonts, spacing } from '@scootch/tokens';

import type { MonsterPage } from '../../api/monster-page-api';
import { useT } from '../../i18n/i18n-provider';
import { TASK_TEXT_MAX } from '../../state/task-rows';
import { useKeyboardOpen } from '../../ui/use-keyboard-open';
import { useScreenStyle } from '../../ui/use-screen-style';
import { HauntCard } from '../haunt/haunt-card';
import { Page } from '../settings/page';
import { ActionDock } from '../table/action-dock';
import { Words } from '../table/words';

export interface AskPageProps {
  readonly monster: Pick<MonsterPage, 'seed' | 'bodyType' | 'name' | 'flavourText'>;
  /** What the field starts with. */
  readonly typed?: string;
  /**
   * Whether the thing would be today's. On a day that has its thing, or has no start left, it
   * waits in the drawer, and the page says that instead.
   */
  readonly forToday?: boolean;
  readonly onSend: (text: string) => void;
  readonly onClose: () => void;
}

/**
 * A monster whose page hides what it hatched from: its card as the website drew it, and one field
 * for the thing. The card steps aside while the keyboard is up, so the question stays above the
 * field; the return key sends as the dock does.
 */
export function AskPage({ monster, typed = '', forToday = true, onSend, onClose }: AskPageProps) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  const keyboardOpen = useKeyboardOpen();
  const [text, setText] = useState(typed);
  const spec = useMemo(
    () => specFromSeed(monster.bodyType, monster.seed),
    [monster.bodyType, monster.seed],
  );
  const words = text.trim();
  // The dock and the return key are one send: a second tap on the way out sends nothing.
  const sent = useRef(false);
  const send = () => {
    if (words === '' || sent.current) return;
    sent.current = true;
    onSend(words);
  };
  return (
    <Page
      onClose={onClose}
      testID="monster-link-asks"
      footer={
        <ActionDock
          action={{
            label: t(forToday ? 'arrive.ask.send' : 'arrive.ask.send.parked'),
            hint: t(forToday ? 'arrive.ask.send.hint' : 'arrive.ask.send.parked.hint'),
            disabled: words === '',
            onPress: send,
            testID: 'monster-link-send',
          }}
        />
      }
    >
      {keyboardOpen ? null : (
        <HauntCard spec={spec} name={monster.name} line={monster.flavourText} />
      )}
      <View style={styles.said}>
        <Words kind="headline">{t('arrive.ask.title', { name: monster.name })}</Words>
        <Words kind="quiet">{t(forToday ? 'arrive.ask.sub' : 'arrive.ask.sub.parked')}</Words>
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        maxLength={TASK_TEXT_MAX}
        returnKeyType="send"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={send}
        placeholder={t('arrive.ask.placeholder')}
        placeholderTextColor={palette.muted}
        accessibilityLabel={t('arrive.ask.title', { name: monster.name })}
        allowFontScaling={allowFontScaling}
        testID="monster-link-field"
        style={[
          styles.field,
          { color: palette.ink, backgroundColor: palette.surface, fontSize: size(20) },
        ]}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  said: { paddingHorizontal: 12, gap: 10 },
  field: {
    minHeight: 64,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
});
