import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { ShareFrame } from '@scootch/art';
import type { Language } from '@scootch/i18n';
import { fonts, shadows, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { CloseButton, CORNER, CornerBar } from '../../ui/corner-bar';
import { BOUNCE_CURVE } from '../../ui/motion/motion-tokens';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';
import { CommandCanvas } from '../reveal/ui/command-canvas';
import { StudioToast } from '../studio/ui/studio-toast';
import { Segmented } from '../zoo/ui/segmented';

import type { ShareFormat, ShareImage } from './share-image';
import { FrameSwatches } from './ui/frame-swatches';
import { ShareTargets } from './ui/share-targets';

/** What is being shared: a catch, a monster still wild, a month, the world, or a week's song. */
export type ShareMoment = 'caught' | 'monster' | 'month' | 'world' | 'song';

export interface ShareModel {
  readonly moment: ShareMoment;
  /** The picture as it will be sent. */
  readonly image: ShareImage;
  /** The picture in view, and the ones that can be made of this moment. One or none: no control. */
  readonly format: ShareFormat;
  readonly formats: readonly ShareFormat[];
  /** The frame the story is printed on, and the four there are; a locked one needs Plus. */
  readonly frame: ShareFrame;
  readonly frames: readonly { readonly id: ShareFrame; readonly locked: boolean }[];
  /** False for a picture that is its own stock (a sticker sheet, a receipt): the frames then rest. */
  readonly framed: boolean;
  readonly hideTask: boolean;
  /** Whether the picture or its page can carry the task's words, so the switch means something. */
  readonly canHideTask: boolean;
  readonly language: Language;
  /** What the last press came to, said in the interface's own words. */
  readonly notice:
    | 'saved'
    | 'refused'
    | 'failed'
    | 'sending'
    | 'shared'
    | 'pictureOnly'
    | 'unshared'
    | 'linkCopied'
    | null;
  /** Whether this catch has a page on the website now, which can be taken down from here. */
  readonly pageUp: boolean;
  /**
   * False for a monster whose words carry no signature from the server (one hatched before
   * words were signed): its picture is shared and saved as ever, and the composer says it has no
   * page.
   */
  readonly pageOffered: boolean;
  /** Whether a link to a page can be copied. */
  readonly linkOffered: boolean;
}

export interface ShareActions {
  readonly close: () => void;
  readonly setFormat: (format: ShareFormat) => void;
  readonly setFrame: (frame: ShareFrame) => void;
  readonly setHideTask: (hide: boolean) => void;
  readonly share: () => void;
  /** Takes the catch's page off the website. */
  readonly unshare: () => void;
  readonly save: () => void;
  /** Puts the page up and copies its link. Unset where there is no page to link to. */
  readonly copyLink?: () => void;
  /** Sends the week's clip as sound, beside the picture of its sleeve. Unset for anything else. */
  readonly sound?: () => void;
}

const NOTICE = {
  saved: 'share.saved',
  refused: 'share.refused',
  failed: 'share.failed',
  sending: 'share.sending',
  shared: 'share.shared',
  pictureOnly: 'share.pictureOnly',
  unshared: 'share.unshared',
  linkCopied: 'share.linkCopied',
} as const;
/** What sets the picture stamping: something went out, or was kept. */
const WENT: readonly ShareModel['notice'][] = ['saved', 'shared', 'pictureOnly', 'linkCopied'];
/** The board's preview: a story 212 points wide, and less on a narrow or short phone. */
const PREVIEW = { width: 212, side: 90, least: 150 } as const;
/** Everything on the composer that is not the picture, at the default text size. */
const AROUND_PREVIEW = 420;

/**
 * The composer: one sheet for everything shared. The picture as it will be sent, the formats it
 * can be sent as, the four frames a story is printed on, the switch that takes the task's words
 * off, and where it goes. Sharing gives the picture a little stamp before it leaves. It is only
 * ever opened for something that may be shared.
 */
export function SharePanel({ model, actions }: { model: ShareModel; actions: ShareActions }) {
  const t = useT();
  const { palette, reducedMotion, allowFontScaling, size } = useScreenStyle();
  const window = useWindowDimensions();
  const { image, notice } = model;
  const tall = image.height / image.width;
  const width = Math.round(
    Math.max(
      PREVIEW.least,
      Math.min(PREVIEW.width, window.width - PREVIEW.side, (window.height - AROUND_PREVIEW) / tall),
    ),
  );

  // The stamp: the picture dips, jumps a little turned, and settles, once for each thing sent.
  const stamp = useSharedValue(0);
  const before = useRef(notice);
  useEffect(() => {
    const went = notice !== before.current && WENT.includes(notice);
    before.current = notice;
    if (!went || reducedMotion) return;
    stamp.value = 0;
    stamp.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(2, { duration: 200, easing: BOUNCE_CURVE }),
      withTiming(3, { duration: 400, easing: BOUNCE_CURVE }),
    );
  }, [notice, reducedMotion, stamp]);
  const stamped = useAnimatedStyle(() => {
    const k = stamp.value;
    // Down to 0.93, up to 1.05 turned two degrees and lifted ten points, then back to rest.
    const scale = k <= 1 ? 1 - 0.07 * k : k <= 2 ? 0.93 + 0.12 * (k - 1) : 1.05 - 0.05 * (k - 2);
    const lift = k <= 1 ? 0 : k <= 2 ? k - 1 : 3 - k;
    return {
      transform: [{ translateY: -10 * lift }, { rotate: `${-2 * lift}deg` }, { scale }],
    };
  });

  return (
    <SafeFrame testID="share" style={[styles.page, { backgroundColor: palette.page }]}>
      <CornerBar
        leading={<View style={styles.corner} />}
        trailing={
          <CloseButton
            label={t('keep.close')}
            hint={t('keep.close.hint')}
            onPress={actions.close}
            testID="share-close"
          />
        }
      >
        <Text
          accessibilityRole="header"
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={1.4}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.title, { color: palette.ink, fontSize: size(17) }]}
        >
          {t(`share.title.${model.moment}`)}
        </Text>
      </CornerBar>
      <ScrollView contentContainerStyle={styles.middle} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.preview, stamped]}>
          <CommandCanvas
            commands={image.commands}
            space={image}
            width={width}
            label={t(`share.title.${model.moment}`)}
            testID="share-preview"
          />
        </Animated.View>
        {model.formats.length > 1 ? (
          <Segmented
            label={t('share.format.hint')}
            chosen={model.format}
            onChoose={actions.setFormat}
            segments={model.formats.map((format) => ({
              value: format,
              label: t(`share.format.${format}`),
              testID: `share-format-${format}`,
            }))}
          />
        ) : null}
        {model.frames.length > 0 ? (
          <FrameSwatches
            frames={model.frames}
            chosen={model.frame}
            resting={!model.framed}
            onChoose={actions.setFrame}
          />
        ) : null}
        {model.canHideTask ? (
          <View style={[styles.card, { backgroundColor: palette.surface }]}>
            <View style={styles.words}>
              <Text
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={1.6}
                style={[styles.hide, { color: palette.ink, fontSize: size(17) }]}
              >
                {t('share.hideTask')}
              </Text>
              <Text
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={1.8}
                style={[styles.hideNote, { color: palette.muted, fontSize: size(13) }]}
              >
                {t('share.hideTask.note')}
              </Text>
            </View>
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
        <ShareTargets
          onShare={actions.share}
          onSave={actions.save}
          {...(model.linkOffered && actions.copyLink ? { onLink: actions.copyLink } : {})}
          {...(actions.sound ? { onSound: actions.sound } : {})}
        />
        {model.pageOffered ? null : (
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.small, { color: palette.muted, fontSize: size(13) }]}
            testID="share-no-page"
          >
            {t('share.noPage')}
          </Text>
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
      </ScrollView>
      <StudioToast text={notice ? t(NOTICE[notice]) : null} />
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  // An empty corner the size of the close control, so the title sits in the middle.
  corner: { width: CORNER.size, height: CORNER.size },
  title: {
    flex: 1,
    alignSelf: 'center',
    textAlign: 'center',
    fontFamily: fonts.body,
    fontWeight: '600',
  },
  middle: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: 14,
  },
  preview: {
    alignSelf: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 24px 40px -22px rgba(28,26,23,0.5)',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    boxShadow: shadows.card,
  },
  words: { flex: 1, gap: 1 },
  hide: { fontFamily: fonts.body, fontWeight: '500' },
  hideNote: { fontFamily: fonts.body },
  small: { fontFamily: fonts.body, textAlign: 'center' },
});
