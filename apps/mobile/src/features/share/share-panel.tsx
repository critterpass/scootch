import { StyleSheet, Switch, useWindowDimensions, View } from 'react-native';
import { useMemo } from 'react';

import type { CardData } from '@scootch/domain';
import type { Language } from '@scootch/i18n';
import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { CommandCanvas } from '../reveal/ui/command-canvas';
import { Dock, KeepFrame } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';

import { PressSpring } from '../../ui/motion/press-spring';

import { composeShareImage, type ShareDress, type ShareFormat } from './share-image';

export interface ShareModel {
  readonly card: CardData;
  /** The picture in view, and the ones that can be made right now. */
  readonly format: ShareFormat;
  readonly formats: readonly ShareFormat[];
  /** What the pictures wear and carry: the worn finish and ink, the day's log, last month. */
  readonly dress: ShareDress;
  readonly language: Language;
  readonly hideTask: boolean;
  /** What the last press came to, said in the interface's own words. */
  readonly notice:
    'saved' | 'refused' | 'failed' | 'sending' | 'shared' | 'pictureOnly' | 'unshared' | null;
  /** Whether this catch has a page on the website now, which can be taken down from here. */
  readonly pageUp: boolean;
  /**
   * False for a monster whose words carry no signature from the server (one hatched before
   * words were signed): its picture is shared and saved as ever, and the panel says it has no page.
   */
  readonly pageOffered: boolean;
}

export interface ShareActions {
  readonly close: () => void;
  readonly setFormat: (format: ShareFormat) => void;
  readonly setHideTask: (hide: boolean) => void;
  readonly share: () => void;
  /** Takes the catch's page off the website. */
  readonly unshare: () => void;
  readonly save: () => void;
}

const NOTICE = {
  saved: 'share.saved',
  refused: 'share.refused',
  failed: 'share.failed',
  sending: 'share.sending',
  shared: 'share.shared',
  pictureOnly: 'share.pictureOnly',
  unshared: 'share.unshared',
} as const;

/** The formats whose picture or page can carry the task's words, so the switch means something. */
const CAN_SHOW_TASK: readonly ShareFormat[] = ['story', 'card', 'receipt'];

/**
 * The share panel: the picture as it will be sent, the formats it can be sent as, the switch that
 * takes the task's words off it, and the two ways out. It is only ever opened for a task that may
 * be shared.
 */
export function SharePanel({ model, actions }: { model: ShareModel; actions: ShareActions }) {
  const t = useT();
  const { palette } = useScreenStyle();
  const { width } = useWindowDimensions();
  const image = useMemo(
    () => composeShareImage(model.format, model.card, model, model.dress),
    [model.format, model.card, model.hideTask, model.language, model.dress],
  );
  return (
    <KeepFrame
      testID="share"
      close={{ label: t('keep.close'), hint: t('keep.close.hint'), onPress: actions.close }}
      closeTestID="share-close"
      footer={
        <Dock
          quiet={{
            label: t('share.save'),
            hint: t('share.save.hint'),
            testID: 'share-save',
            onPress: actions.save,
          }}
          action={{
            label: t('share.share'),
            hint: t('share.share.hint'),
            testID: 'share-send',
            onPress: actions.share,
          }}
        />
      }
    >
      <View style={styles.centre}>
        <CommandCanvas
          commands={image.commands}
          space={image}
          width={Math.min(300, width - spacing.lg * 2)}
          testID="share-preview"
        />
      </View>
      <View accessibilityRole="radiogroup" style={styles.formats}>
        {model.formats.map((format) => {
          const chosen = format === model.format;
          return (
            <PressSpring
              key={format}
              accessibilityRole="radio"
              accessibilityState={{ selected: chosen, checked: chosen }}
              accessibilityLabel={t(`share.format.${format}`)}
              accessibilityHint={t('share.format.hint')}
              onPress={() => actions.setFormat(format)}
              feedback="choice"
              testID={`share-format-${format}`}
              style={[
                styles.format,
                { backgroundColor: chosen ? palette.ink : `${palette.ink}0F` },
              ]}
            >
              <SessionText face="caption" color={chosen ? palette.page : palette.ink}>
                {t(`share.format.${format}`)}
              </SessionText>
            </PressSpring>
          );
        })}
      </View>
      {CAN_SHOW_TASK.includes(model.format) ? (
        <View style={styles.toggle}>
          <SessionText face="body" color={palette.ink} style={styles.grow}>
            {t('share.hideTask')}
          </SessionText>
          <Switch
            accessibilityLabel={t('share.hideTask')}
            accessibilityHint={t('share.hideTask.hint')}
            testID="share-hide-task"
            value={model.hideTask}
            onValueChange={actions.setHideTask}
            trackColor={{ true: palette.tomato }}
          />
        </View>
      ) : null}
      {model.pageOffered ? null : (
        <SessionText face="caption" color={palette.muted} testID="share-no-page">
          {t('share.noPage')}
        </SessionText>
      )}
      {model.pageUp ? (
        <CapsuleButton
          tone="quiet"
          label={t('share.unshare')}
          hint={t('share.unshare.hint')}
          testID="share-unshare"
          onPress={actions.unshare}
        />
      ) : null}
      {model.notice ? (
        <SessionText
          face="caption"
          color={palette.muted}
          accessibilityLiveRegion="polite"
          testID="share-notice"
        >
          {t(NOTICE[model.notice])}
        </SessionText>
      ) : null}
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center' },
  formats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  format: { minHeight: 36, justifyContent: 'center', borderRadius: 18, paddingHorizontal: 14 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1 },
});
