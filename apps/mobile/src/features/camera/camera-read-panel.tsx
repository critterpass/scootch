import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { biggerZone, type CameraMode } from '@scootch/domain';
import type { StringKey } from '@scootch/i18n';
import { radius, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, GlassPill } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SessionText } from '../session/ui/session-text';

import type { CameraRead } from './camera-read';
import type { CameraScreenProps } from './camera-screen-props';

const NOTHING = {
  desk: 'camera.nothing.desk',
  room: 'camera.nothing.room',
  paper: 'camera.nothing.paper',
  screen: 'camera.nothing.screen',
} as const satisfies Record<CameraMode, StringKey>;

const POOR = {
  blurry: 'camera.poor.blurry',
  glare: 'camera.poor.glare',
  cut_off: 'camera.poor.cut_off',
  crumpled: 'camera.poor.crumpled',
} as const satisfies Record<string, StringKey>;

/** The row under a result: the quiet ways out as chips, then the one action. */
function Actions({
  retake,
  extra,
  main,
}: {
  readonly retake: ReactNode;
  readonly extra?: ReactNode;
  readonly main?: ReactNode;
}) {
  const { largeText } = useScreenStyle();
  return (
    <View style={largeText ? styles.actionsStacked : styles.actions}>
      <View style={styles.quiet}>
        {retake}
        {extra}
      </View>
      {main ? <View style={largeText ? null : styles.main}>{main}</View> : null}
    </View>
  );
}

/**
 * The panel under a photo that has been read: Scootch's line and the one action, or a plain
 * sentence and a retake when nothing came of it.
 */
export function ReadPanel(props: CameraScreenProps & { readonly read: CameraRead }) {
  const { read, plainLine, moreShown, copied } = props;
  const t = useT();
  const { palette } = useScreenStyle();

  const retake = (
    <GlassPill
      label={t('camera.retake')}
      hint={t('camera.retake.hint')}
      onPress={props.onRetake}
      testID="camera-retake"
    >
      <SessionText face="pill" color={palette.ink}>
        {t('camera.retake')}
      </SessionText>
    </GlassPill>
  );
  const step = (label: string, task: string) => (
    <CapsuleButton
      label={label}
      hint={t('camera.step.hint')}
      onPress={() => props.onStep(task)}
      testID="camera-step"
    />
  );
  const title = (text: string) => (
    <SessionText face="eyebrow" color={palette.muted} accessibilityRole="header">
      {text}
    </SessionText>
  );
  const line = (text: string) => (
    <SessionText face="step" color={palette.ink} testID="camera-line">
      {text}
    </SessionText>
  );
  const plain = (text: string) => (
    <>
      <SessionText face="body" color={palette.ink} testID="camera-plain">
        {text}
      </SessionText>
      <Actions retake={retake} />
    </>
  );

  switch (read.kind) {
    case 'desk':
      return (
        <>
          {title(t('camera.mode.desk'))}
          {line(read.words.line)}
          <Actions
            retake={retake}
            main={step(
              read.words.action ?? t('camera.desk.action'),
              read.words.task ?? t('camera.desk.task'),
            )}
          />
        </>
      );
    case 'room': {
      const bigger = biggerZone(read.order, read.letter) !== null;
      return (
        <>
          {title(t('camera.room.title', { count: read.order.length }))}
          {line(read.words.line)}
          <Actions
            retake={retake}
            extra={
              bigger ? (
                <GlassPill
                  label={t('camera.room.bigger')}
                  hint={t('camera.room.bigger.hint')}
                  onPress={props.onBigger}
                  testID="camera-bigger"
                >
                  <SessionText face="pill" color={palette.ink}>
                    {t('camera.room.bigger')}
                  </SessionText>
                </GlassPill>
              ) : null
            }
            main={step(
              t('camera.room.action', { letter: read.letter }),
              read.words.task ?? t('camera.room.task'),
            )}
          />
        </>
      );
    }
    case 'paper':
      return (
        <>
          {title(
            read.document
              ? t('camera.paper.titleNamed', { document: read.document })
              : t('camera.paper.title'),
          )}
          {line(read.words.line)}
          {read.jargon ? (
            <View style={[styles.card, { backgroundColor: `${palette.ink}0A` }]}>
              <SessionText face="body" color={palette.ink}>
                <SessionText face="thought" color={palette.ink}>
                  “{read.jargon.term}”
                </SessionText>{' '}
                {read.jargon.meaning}
              </SessionText>
              {moreShown && read.jargon.more ? (
                <SessionText face="caption" color={palette.muted}>
                  {read.jargon.more}
                </SessionText>
              ) : null}
            </View>
          ) : null}
          <Actions
            retake={retake}
            extra={
              read.jargon?.more && !moreShown ? (
                <GlassPill
                  label={t('camera.paper.more')}
                  hint={t('camera.paper.more.hint')}
                  onPress={props.onMore}
                  testID="camera-more"
                >
                  <SessionText face="pill" color={palette.ink}>
                    {t('camera.paper.more')}
                  </SessionText>
                </GlassPill>
              ) : null
            }
            main={step(
              t('camera.paper.action', { number: read.pick.number }),
              read.words.task ?? t('camera.paper.task'),
            )}
          />
        </>
      );
    case 'screen': {
      const { draft } = read;
      return (
        <>
          {title(t('camera.screen.title', { count: read.linesRead }))}
          {line(read.words.line)}
          {draft ? (
            <View style={[styles.card, { backgroundColor: `${palette.ink}0A` }]}>
              <SessionText face="eyebrow" color={palette.muted}>
                {t('camera.screen.draft')}
              </SessionText>
              <SessionText face="body" color={palette.ink} selectable>
                {draft}
              </SessionText>
            </View>
          ) : null}
          <Actions
            retake={retake}
            extra={
              draft ? (
                <GlassPill
                  label={t(copied ? 'camera.screen.copied' : 'camera.screen.copy')}
                  hint={t('camera.screen.copy.hint')}
                  onPress={() => props.onCopy(draft)}
                  testID="camera-copy"
                >
                  <SessionText face="pill" color={palette.ink}>
                    {t(copied ? 'camera.screen.copied' : 'camera.screen.copy')}
                  </SessionText>
                </GlassPill>
              ) : null
            }
            main={step(
              read.words.action ?? t('camera.screen.action'),
              read.words.task ?? t('camera.screen.task'),
            )}
          />
        </>
      );
    }
    case 'heavy':
      // Plain company: no joke, no monster, and no step made from the page.
      return (
        <>
          <SessionText face="body" color={palette.ink} testID="camera-plain">
            {plainLine}
          </SessionText>
          <Actions
            retake={
              read.crisis ? (
                <GlassPill
                  label={t('camera.heavy.helplines')}
                  hint={t('camera.heavy.helplines.hint')}
                  onPress={props.onHelplines}
                  testID="camera-helplines"
                >
                  <SessionText face="pill" color={palette.ink}>
                    {t('camera.heavy.helplines')}
                  </SessionText>
                </GlassPill>
              ) : null
            }
            main={
              <CapsuleButton
                tone="quiet"
                label={t('camera.heavy.typeIt')}
                hint={t('camera.heavy.typeIt.hint')}
                onPress={props.onClose}
                testID="camera-type-it"
              />
            }
          />
        </>
      );
    case 'nothing':
      return plain(t(NOTHING[read.mode]));
    case 'no_step':
      return plain(t('camera.nothing.step'));
    case 'dark':
      return plain(t('camera.dark'));
    case 'poor':
      return plain(t(POOR[read.issue]));
    case 'needs_connection':
      return plain(t('camera.needsConnection'));
    case 'failed':
      return plain(t('camera.failed'));
  }
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  actionsStacked: { gap: spacing.sm },
  quiet: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  main: { flexGrow: 1, flexShrink: 1, minWidth: 140 },
});
