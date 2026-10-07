import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Attitude } from '@scootch/domain';
import { radius, spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, GlassPill, RoundButton } from '../../ui/buttons';
import { CloseIcon } from '../../ui/icons';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SessionText } from '../session/ui/session-text';

import { Compare } from './after-compare';

/** The second photo is being asked for, or the two are side by side. */
export type AfterShown =
  | { readonly kind: 'asking' }
  | { readonly kind: 'reading' }
  | {
      readonly kind: 'card';
      readonly beforeUri: string;
      readonly afterUri: string;
      readonly title: string;
      readonly minutes: number | null;
      readonly gone: number | null;
      /** What saving or sharing last came to, in plain words; `null` when nothing has. */
      readonly notice: string | null;
    };

export interface AfterScreenProps {
  readonly shown: AfterShown;
  readonly attitude: Attitude;
  /** The live viewfinder, drawn behind the ask. */
  readonly viewfinder: ReactNode;
  /** Scootch's ask and his line under the card, from the offline pack. Never literals. */
  readonly askLine: string;
  readonly cardLine: string;
  readonly onShutter: () => void;
  readonly onSkip: () => void;
  readonly onKeep: () => void;
  readonly onShare: () => void;
  readonly onDone: () => void;
}

function Figure({ value, name }: { readonly value: number; readonly name: string }) {
  const { palette } = useScreenStyle();
  return (
    <View style={styles.figure}>
      <SessionText face="minutes" color={palette.ink}>
        {String(value)}
      </SessionText>
      <SessionText face="caption" color={palette.muted}>
        {name}
      </SessionText>
    </View>
  );
}

/**
 * Before and after: the ask for one more photo of the same spot, then the two photos to drag
 * between, what the phone can count about them, and the two ways to keep what is otherwise
 * deleted. It takes no photo and saves nothing itself.
 */
export function AfterScreen(props: AfterScreenProps) {
  const { shown, attitude } = props;
  const t = useT();
  const { palette, largeText } = useScreenStyle();

  if (shown.kind !== 'card') {
    const reading = shown.kind === 'reading';
    return (
      <View style={styles.dark} testID="camera-after-ask">
        <View style={StyleSheet.absoluteFill}>{props.viewfinder}</View>
        <SafeFrame style={styles.frame} pointerEvents="box-none">
          <View style={styles.top}>
            <RoundButton
              label={t('camera.close')}
              hint={t('camera.close.hint')}
              onPress={props.onDone}
              testID="camera-after-close"
            >
              <CloseIcon color={palette.ink} />
            </RoundButton>
          </View>
          <View style={styles.bottom}>
            <View style={styles.peek} pointerEvents="none">
              <Scootch mood={reading ? 'thinking' : 'waiting'} attitude={attitude} />
            </View>
            <View style={[styles.panel, { backgroundColor: palette.surface }]}>
              <SessionText face="step" color={palette.ink} testID="camera-after-line">
                {reading ? t('camera.reading') : props.askLine}
              </SessionText>
              {reading ? null : (
                <View style={styles.askRow}>
                  <GlassPill
                    label={t('camera.after.skip')}
                    hint={t('camera.after.skip.hint')}
                    onPress={props.onSkip}
                    testID="camera-after-skip"
                  >
                    <SessionText face="pill" color={palette.ink}>
                      {t('camera.after.skip')}
                    </SessionText>
                  </GlassPill>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('camera.shutter')}
                    accessibilityHint={t('camera.shutter.hint')}
                    onPress={props.onShutter}
                    testID="camera-after-shutter"
                    style={[styles.shutter, { borderColor: palette.ink }]}
                  >
                    <View style={[styles.shutterCore, { backgroundColor: palette.ink }]} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </SafeFrame>
      </View>
    );
  }

  return (
    <SafeFrame style={[styles.page, { backgroundColor: palette.page }]} testID="camera-after-card">
      <View style={styles.top}>
        <SessionText face="action" color={palette.ink} accessibilityRole="header">
          {shown.title}
        </SessionText>
        <RoundButton
          label={t('camera.after.done')}
          hint={t('camera.after.done.hint')}
          onPress={props.onDone}
          testID="camera-after-done"
        >
          <CloseIcon color={palette.ink} />
        </RoundButton>
      </View>
      <View style={styles.cardBody}>
        <Compare
          beforeUri={shown.beforeUri}
          afterUri={shown.afterUri}
          before={t('camera.after.before')}
          after={
            shown.minutes === null
              ? t('camera.after.afterPlain')
              : t('camera.after.after', { count: shown.minutes })
          }
          hint={t('camera.after.drag.hint')}
        />
        <SessionText face="step" color={palette.ink} testID="camera-after-line">
          {props.cardLine}
        </SessionText>
        {shown.minutes !== null || shown.gone !== null ? (
          <View style={styles.figures}>
            {shown.minutes !== null ? (
              <Figure
                value={shown.minutes}
                name={t('camera.after.minutes', { count: shown.minutes })}
              />
            ) : null}
            {shown.gone !== null ? (
              <Figure value={shown.gone} name={t('camera.after.gone', { count: shown.gone })} />
            ) : null}
          </View>
        ) : null}
        {shown.notice ? (
          <SessionText face="caption" color={palette.muted} testID="camera-after-notice">
            {shown.notice}
          </SessionText>
        ) : null}
      </View>
      <View style={largeText ? styles.answersStacked : styles.answers}>
        <CapsuleButton
          tone="quiet"
          label={t('camera.after.keep')}
          hint={t('camera.after.keep.hint')}
          onPress={props.onKeep}
          testID="camera-after-keep"
          style={largeText ? undefined : styles.answer}
        />
        <CapsuleButton
          label={t('camera.after.share')}
          hint={t('camera.after.share.hint')}
          onPress={props.onShare}
          testID="camera-after-share"
          style={largeText ? undefined : styles.answer}
        />
      </View>
    </SafeFrame>
  );
}

const SHUTTER = 72;

const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: '#000000' },
  page: { flex: 1, paddingHorizontal: spacing.md },
  frame: { flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing.md },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  bottom: { paddingBottom: spacing.sm },
  peek: { width: 96, height: 96, marginBottom: -spacing.md, marginLeft: spacing.sm },
  panel: { borderRadius: radius.lg + 4, padding: spacing.lg, gap: spacing.md },
  askRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: { width: SHUTTER - 16, height: SHUTTER - 16, borderRadius: (SHUTTER - 16) / 2 },
  cardBody: { flex: 1, gap: spacing.md, paddingTop: spacing.md },
  figures: { flexDirection: 'row', gap: spacing.xl },
  figure: { gap: 2 },
  answers: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
  answersStacked: { gap: spacing.sm, paddingBottom: spacing.sm },
  answer: { flexGrow: 1, flexBasis: 0 },
});
