import { Canvas, Group } from '@shopify/react-native-skia';
import { useMemo, useState, type ReactElement } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, makeMutable } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildPhu, phuPose } from '@phusclass/art/class';

import { LayerView } from '../../classroom/layer-view';
import { useHandFont } from '../../classroom/use-hand-font';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { CloseIcon } from '../../ui/icons';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

import { CARD_HEIGHTS, CARD_WIDTH, type CardShape } from './cards/card-parts';
import { initialsOf, ShareCard } from './cards/share-card';
import { exportCard, saveToPhotos, shareImage } from './export-card';
import { cardCopy } from './share-copy';
import type { ShareOffer } from './share-offer';
import type { ShareFormat } from './share-rules';
import { ActionGlyph, CHIP, INK, styles } from './share-sheet-parts';
import { useCardFonts } from './use-card-fonts';

const PREVIEW_WIDTH = 230;

const FORMAT_KEYS = {
  paper: 'share.format.paper',
  certificate: 'share.format.certificate',
  note: 'share.format.note',
  desk: 'share.format.desk',
} as const;

const phuFigure = buildPhu(phuPose('approve'));
const stillClock = makeMutable(0);
const NOTHING_RUNS: ReadonlySet<string> = new Set();

type Status = 'idle' | 'busy' | 'saved' | 'not allowed';

/**
 * The share sheet (ShareSheet board): the card, the four formats, white-out, and Story, Save and
 * Share. The board's light sheet in both appearances: the cards are paper either way. Nothing is
 * shown while the offer is loading, and a blocked offer shows one plain line.
 */
export function ShareSheet({
  offer,
  onClose,
  initialFormat,
  initialHide = false,
  framed = true,
}: {
  readonly offer: ShareOffer | null;
  readonly onClose: () => void;
  readonly initialFormat?: ShareFormat;
  readonly initialHide?: boolean;
  /**
   * Draws the board's own backdrop and rising sheet, for a capture shown full screen. The route
   * sets it off: there the system's page sheet is the frame, and this fills it.
   */
  readonly framed?: boolean;
}): ReactElement {
  const t = useT();
  const { language } = useLanguage();
  const style = useScreenStyle();
  const insets = useSafeAreaInsets();
  const hand = useHandFont();
  const { fonts } = useCardFonts();
  const [picked, setPicked] = useState<ShareFormat | undefined>(initialFormat);
  const [hide, setHide] = useState(initialHide);
  const [status, setStatus] = useState<Status>('idle');

  const ready = offer?.kind === 'ready' ? offer : null;
  const format: ShareFormat | undefined =
    ready === null
      ? undefined
      : picked !== undefined && ready.formats.includes(picked)
        ? picked
        : ready.formats[0];
  const copy = useMemo(
    () => (ready === null ? null : cardCopy(ready.subject, language, hide)),
    [ready, language, hide],
  );
  const phu = useMemo(
    () => (
      <LayerView
        layer={phuFigure.root}
        ctx={{
          defs: phuFigure.defs,
          clock: stillClock,
          running: NOTHING_RUNS,
          overrides: {},
          hand,
        }}
      />
    ),
    [hand],
  );

  const cardFor = (shape: CardShape): ReactElement | null =>
    ready === null || copy === null || format === undefined ? null : (
      <ShareCard
        format={format}
        copy={copy}
        fonts={fonts}
        height={CARD_HEIGHTS[shape]}
        phu={phu}
        carvings={ready.subject.carvings}
        initials={initialsOf(ready.subject.name)}
      />
    );

  const run = async (shape: CardShape, then: (uri: string) => Promise<Status>) => {
    const card = cardFor(shape);
    if (card === null || status === 'busy' || ready === null) return;
    setStatus('busy');
    try {
      const uri = await exportCard(card, shape, `${format ?? 'card'}-${ready.subject.taskId}`);
      setStatus(await then(uri));
    } catch {
      setStatus('idle');
    }
  };
  const title = t('share.title');
  const story = () => run('story', async (uri) => (await shareImage(uri, title), 'idle'));
  const share = () => run('post', async (uri) => (await shareImage(uri, title), 'idle'));
  const save = () => run('post', saveToPhotos);

  const text = (size: number) => ({
    fontSize: style.size(size),
    allowFontScaling: style.allowFontScaling,
  });
  const scale = PREVIEW_WIDTH / CARD_WIDTH;
  const preview = cardFor('post');

  return (
    <View style={framed ? styles.fill : styles.page}>
      {framed ? (
        <PressSpring
          accessibilityRole="button"
          accessibilityLabel={t('share.close')}
          onPress={onClose}
          style={styles.backdrop}
          testID="share-backdrop"
        />
      ) : null}
      <Animated.View
        {...(style.reducedMotion || !framed ? {} : { entering: SlideInDown.duration(320) })}
        style={[framed ? styles.sheet : styles.page, { paddingBottom: insets.bottom + 16 }]}
        testID="share-sheet"
      >
        <View style={styles.grabber} />
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <View style={styles.header}>
            <Text
              accessibilityRole="header"
              allowFontScaling={style.allowFontScaling}
              style={[styles.title, { fontSize: style.size(24) }]}
            >
              {title}
            </Text>
            <PressSpring
              accessibilityRole="button"
              accessibilityLabel={t('share.close')}
              onPress={onClose}
              style={styles.close}
              testID="share-close"
            >
              <CloseIcon color={INK} />
            </PressSpring>
          </View>

          {ready === null ? (
            offer === null ? null : (
              <Text style={[styles.plain, text(17)]} testID="share-nothing">
                {t('share.nothing')}
              </Text>
            )
          ) : (
            <>
              <Animated.View
                key={`${format}-${String(hide)}`}
                {...(style.reducedMotion ? {} : { entering: FadeIn.duration(320) })}
                style={styles.previewWrap}
                accessible
                accessibilityRole="image"
                accessibilityLabel={t('share.preview', {
                  format: t(FORMAT_KEYS[format ?? 'paper']),
                })}
                testID={`share-preview-${format}`}
              >
                <Canvas
                  style={[
                    styles.preview,
                    { width: PREVIEW_WIDTH, height: CARD_HEIGHTS.post * scale },
                  ]}
                >
                  <Group transform={[{ scale }]}>{preview}</Group>
                </Canvas>
              </Animated.View>

              <View
                accessibilityRole="radiogroup"
                accessibilityLabel={t('share.formats')}
                style={styles.chips}
              >
                {ready.formats.map((one) => {
                  const on = one === format;
                  return (
                    <PressSpring
                      key={one}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={t(FORMAT_KEYS[one])}
                      onPress={() => setPicked(one)}
                      style={[styles.chip, { backgroundColor: on ? INK : CHIP }]}
                      testID={`share-format-${one}`}
                    >
                      <Text style={[styles.chipLabel, text(14), { color: on ? '#FFFFFF' : INK }]}>
                        {t(FORMAT_KEYS[one])}
                      </Text>
                    </PressSpring>
                  );
                })}
              </View>

              <View style={styles.hideRow}>
                <View style={styles.tapeIcon} />
                <View style={styles.hideWords}>
                  <Text style={[styles.hideTitle, text(15)]}>{t('share.hide.title')}</Text>
                  <Text style={[styles.hideDetail, text(12)]}>{t('share.hide.detail')}</Text>
                </View>
                <Switch
                  value={hide}
                  onValueChange={setHide}
                  accessibilityLabel={t('share.hide.title')}
                  trackColor={{ true: '#34A867', false: 'rgba(120,120,128,0.24)' }}
                  testID="share-hide"
                />
              </View>

              <View style={[styles.actions, style.largeText ? styles.actionsStacked : null]}>
                {(
                  [
                    ['story', t('share.action.story'), story, '#E1306C'],
                    ['save', t('share.action.save'), save, CHIP],
                    ['share', t('share.action.share'), share, CHIP],
                  ] as const
                ).map(([id, label, onPress, tint]) => (
                  <PressSpring
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ busy: status === 'busy' }}
                    onPress={() => void onPress()}
                    style={styles.action}
                    testID={`share-${id}`}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: tint }]}>
                      <ActionGlyph kind={id} />
                    </View>
                    <Text style={[styles.actionLabel, text(11.5)]}>{label}</Text>
                  </PressSpring>
                ))}
              </View>
              {status === 'saved' || status === 'not allowed' ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[styles.status, text(13)]}
                  testID="share-status"
                >
                  {status === 'saved' ? t('share.saved') : t('share.saveOff')}
                </Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
