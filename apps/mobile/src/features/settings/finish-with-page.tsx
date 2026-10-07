import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SettingsRow } from '@scootch/domain';
import { fonts, radius, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';

import { Page } from './page';
import { Note, Row } from './rows';
import { PressSpring } from '../../ui/motion/press-spring';

type FinishWith = SettingsRow['finishWith'];

const METHODS = [
  { id: 'hold', label: 'finishWith.hold', sub: 'finishWith.hold.sub' },
  { id: 'double_tap', label: 'finishWith.tapTwice', sub: 'finishWith.tapTwice.sub' },
  { id: 'voice', label: 'finishWith.sayDone', sub: 'finishWith.sayDone.sub' },
] as const satisfies readonly { id: FinishWith; label: string; sub: string }[];

/** How long the preview keeps "tap again to confirm" up before it starts over. */
const PREVIEW_RESET_MS = 2500;

export interface FinishWithPageProps {
  readonly finishWith: FinishWith;
  readonly onChoose: (finishWith: FinishWith) => void;
  readonly onClose: () => void;
}

/**
 * "Finish with": hold, tap twice, or say "done". Holding is hard for some hands, and the reward is
 * the same whichever is chosen. The control underneath is a preview: it finishes nothing.
 */
export function FinishWithPage({ finishWith, onChoose, onClose }: FinishWithPageProps) {
  const { palette } = useScreenStyle();
  const t = useT();
  return (
    <Page title={t('settings.finishWith')} onClose={onClose} testID="finish-with">
      <View
        accessibilityRole="radiogroup"
        style={[styles.group, { backgroundColor: palette.surface }]}
      >
        {METHODS.map((method, index) => (
          <Row
            key={method.id}
            first={index === 0}
            kind="choice"
            selected={method.id === finishWith}
            label={t(method.label)}
            sub={t(method.sub)}
            hint={t('finishWith.choose.hint')}
            onPress={() => onChoose(method.id)}
            testID={`finish-with-${method.id}`}
          />
        ))}
      </View>
      <Note text={t('finishWith.same')} />
      <FinishPreview finishWith={finishWith} />
    </Page>
  );
}

/** The finish control as the session will show it, with nothing behind it. */
function FinishPreview({ finishWith }: { readonly finishWith: FinishWith }) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const t = useT();
  const [stage, setStage] = useState<'idle' | 'going'>('idle');
  useEffect(() => setStage('idle'), [finishWith]);
  useEffect(() => {
    if (stage === 'idle') return undefined;
    const timer = setTimeout(() => setStage('idle'), PREVIEW_RESET_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  const hold = finishWith === 'hold';
  const label = hold
    ? t(stage === 'going' ? 'session.finish.holdGoing' : 'session.finish.holdIdle')
    : t(stage === 'going' ? 'session.finish.tapConfirm' : 'session.finish.tap');
  return (
    <View style={styles.preview}>
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.previewLabel, { color: palette.muted, fontSize: size(15) }]}
      >
        {t('finishWith.preview')}
      </Text>
      <PressSpring
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={t('finishWith.preview.hint')}
        testID="finish-with-preview"
        {...(hold
          ? { onPressIn: () => setStage('going'), onPressOut: () => setStage('idle') }
          : { onPress: () => setStage(stage === 'idle' ? 'going' : 'idle') })}
        style={[styles.control, { backgroundColor: palette.tomato }]}
      >
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.controlLabel, { color: palette.onTomato, fontSize: size(17) }]}
        >
          {label}
        </Text>
      </PressSpring>
      {finishWith === 'voice' ? <Note text={t('finishWith.sayDone.note')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.lg, overflow: 'hidden' },
  preview: { gap: spacing.sm, marginTop: spacing.lg, alignItems: 'stretch' },
  previewLabel: { fontFamily: fonts.body, textAlign: 'center' },
  control: {
    minHeight: 56,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: { fontFamily: fonts.heading, fontWeight: '700', textAlign: 'center' },
});
