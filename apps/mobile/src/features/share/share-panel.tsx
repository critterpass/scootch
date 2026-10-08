import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ShareFrame } from '@scootch/art';
import type { Language } from '@scootch/i18n';
import { fonts, shadows, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CloseButton, CORNER, CornerBar } from '../../ui/corner-bar';
import { BOUNCE_CURVE } from '../../ui/motion/motion-tokens';
import { SheetFrame } from '../../ui/sheet-frame';
import { useScreenStyle } from '../../ui/use-screen-style';
import { QuietLink } from '../dump/dump-panels';
import { CommandCanvas } from '../reveal/ui/command-canvas';
import { StudioToast } from '../studio/ui/studio-toast';
import { Segmented } from '../zoo/ui/segmented';

import type { ShareFormat, ShareImage } from './share-image';
import { FrameSwatches } from './ui/frame-swatches';
import { ShareDock } from './ui/share-dock';

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
  /** Whether a locked frame answers a tap. False where nothing may be sold. */
  readonly framesOpen: boolean;
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
/** From the bottom of the screen up to the dock, as the boards draw it. */
const DOCK_BOTTOM = 30;
/** What sets the picture stamping: something went out, or was kept. */
const WENT: readonly ShareModel['notice'][] = ['saved', 'shared', 'pictureOnly', 'linkCopied'];
/** The picture's room: the least it is drawn at, the most, and the air kept round it. */
const PREVIEW = { least: 132, most: 300, side: 56, air: 14, scrolled: 190 } as const;

/**
 * The composer: one sheet for everything shared, laid out one way whatever it holds. The picture
 * as it will be sent fills the room there is; under it sit the choices this picture has (what it
 * can be sent as, the frame it is printed on, the switch that takes the task's words off); and
 * at the foot, one dock with where it goes. Sharing gives the picture a little stamp before it
 * leaves. It is only ever opened for something that may be shared.
 */
export function SharePanel({ model, actions }: { model: ShareModel; actions: ShareActions }) {
  const t = useT();
  const { palette, reducedMotion, allowFontScaling, size, largeText } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const { image, notice } = model;
  const tall = image.height / image.width;
  // The picture is as large as the room left for it, measured once the choices have taken theirs.
  const [room, setRoom] = useState<{ width: number; height: number } | null>(null);
  const fitted = room
    ? Math.min(PREVIEW.most, room.width - PREVIEW.side, (room.height - PREVIEW.air * 2) / tall)
    : 0;
  const width = Math.round(Math.max(PREVIEW.least, fitted));

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

  const picture = (shownWidth: number) => (
    <Animated.View style={[styles.preview, stamped]}>
      <CommandCanvas
        commands={image.commands}
        space={image}
        width={shownWidth}
        label={t(`share.title.${model.moment}`)}
        testID="share-preview"
      />
    </Animated.View>
  );
  const choices = (
    <View style={styles.choices}>
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
          open={model.framesOpen}
          onChoose={actions.setFrame}
        />
      ) : null}
      {model.canHideTask ? (
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <View style={styles.words}>
            <Text
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={1.6}
              style={[styles.hide, { color: palette.ink, fontSize: size(16) }]}
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
        <View style={styles.middle}>
          <QuietLink
            label={t('share.unshare')}
            hint={t('share.unshare.hint')}
            testID="share-unshare"
            onPress={actions.unshare}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <SheetFrame testID="share" style={[styles.page, { backgroundColor: palette.page }]}>
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
      {largeText ? (
        // At the large text sizes the choices are taller than the screen: the picture keeps one
        // size and everything above the dock scrolls.
        <ScrollView contentContainerStyle={styles.scrolled} showsVerticalScrollIndicator={false}>
          <View style={styles.middle}>
            {picture(Math.min(PREVIEW.scrolled, window.width - PREVIEW.side))}
          </View>
          {choices}
        </ScrollView>
      ) : (
        <>
          <View
            style={styles.stage}
            onLayout={({ nativeEvent }) =>
              setRoom({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })
            }
          >
            {room ? picture(width) : null}
          </View>
          {choices}
        </>
      )}
      <View
        style={[
          styles.foot,
          { paddingBottom: Math.max(insets.bottom, DOCK_BOTTOM) - insets.bottom },
        ]}
      >
        <ShareDock
          onShare={actions.share}
          onSave={actions.save}
          {...(model.linkOffered && actions.copyLink ? { onLink: actions.copyLink } : {})}
          {...(actions.sound ? { onSound: actions.sound } : {})}
        />
      </View>
      <StudioToast text={notice ? t(NOTICE[notice]) : null} />
    </SheetFrame>
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
  // The picture's room: all the height the choices and the dock leave.
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrolled: { paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md },
  middle: { flexDirection: 'row', justifyContent: 'center' },
  choices: { paddingHorizontal: 18, gap: 14 },
  foot: { paddingHorizontal: 14, paddingTop: spacing.md },
  preview: {
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 24px 40px -22px rgba(28,26,23,0.5)',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 16,
    boxShadow: shadows.card,
  },
  words: { flex: 1, gap: 1 },
  hide: { fontFamily: fonts.body, fontWeight: '500' },
  hideNote: { fontFamily: fonts.body },
  small: { fontFamily: fonts.body, textAlign: 'center' },
});
