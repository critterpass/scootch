import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CAMERA_MODES, isSentMode, type CameraMode } from '@scootch/domain';
import type { StringKey } from '@scootch/i18n';
import { radius, spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, GlassTag, RoundButton } from '../../ui/buttons';
import { CloseIcon } from '../../ui/icons';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Lock } from '../plus/ui/parts';
import { SessionText } from '../session/ui/session-text';

import type { CameraRead } from './camera-read';
import { ReadPanel } from './camera-read-panel';
import type { CameraScreenProps } from './camera-screen-props';
import { PhotoOverlay } from './photo-overlays';

export type { CameraScreenProps, CameraShown } from './camera-screen-props';

const MODE_NAMES = {
  desk: 'camera.mode.desk',
  paper: 'camera.mode.paper',
  screen: 'camera.mode.screen',
  room: 'camera.mode.room',
} as const satisfies Record<CameraMode, StringKey>;

/**
 * The camera, drawn from what it is told: the viewfinder with its four modes, a photo with one
 * place to start marked on it, or a plain sentence when nothing came of the photo. It reads no
 * photo and calls nothing itself.
 */
export function CameraScreen(props: CameraScreenProps) {
  const { mode, shown, picture, onClose } = props;
  const t = useT();
  const { palette } = useScreenStyle();
  const screen = useWindowDimensions();
  const read = shown.kind === 'read' ? shown.read : null;

  return (
    <View style={styles.root} testID="camera-screen">
      <View style={StyleSheet.absoluteFill}>{picture}</View>
      {read ? <PhotoOverlay read={read} screen={screen} tag={tagFor(read, t)} /> : null}
      <SafeFrame style={styles.frame} pointerEvents="box-none">
        <View style={styles.top} pointerEvents="box-none">
          <RoundButton
            label={t('camera.close')}
            hint={t('camera.close.hint')}
            onPress={onClose}
            testID="camera-close"
          >
            <CloseIcon color={palette.ink} />
          </RoundButton>
          {shown.kind === 'permission' ? null : (
            <GlassTag testID="camera-private">
              <SessionText face="chip" color={palette.ink}>
                {t(isSentMode(mode) ? 'camera.private.words' : 'camera.private.phone')}
              </SessionText>
            </GlassTag>
          )}
        </View>
        <View style={styles.bottom} pointerEvents="box-none">
          <Peek {...props} />
          <View style={[styles.panel, { backgroundColor: palette.surface }]} testID="camera-panel">
            <PanelBody {...props} />
          </View>
        </View>
      </SafeFrame>
    </View>
  );
}

type Translate = ReturnType<typeof useT>;

function tagFor(read: CameraRead, t: Translate): string | null {
  if (read.kind === 'desk') return t('camera.startHere');
  if (read.kind === 'paper') return t('camera.paper.boxOnly', { number: read.pick.number });
  if (read.kind === 'screen') return t('camera.screen.thisOne');
  return null;
}

/** Scootch looks on from the corner. On a heavy page he is not drawn at all. */
function Peek({ shown, attitude }: CameraScreenProps) {
  if (shown.kind === 'permission') return null;
  if (shown.kind === 'read' && shown.read.kind === 'heavy') return null;
  const mood = shown.kind === 'reading' ? 'thinking' : 'waiting';
  return (
    <View style={styles.peek} pointerEvents="none">
      <Scootch mood={mood} attitude={attitude} />
    </View>
  );
}

function PanelBody(props: CameraScreenProps) {
  const { shown } = props;
  const t = useT();
  const { palette } = useScreenStyle();

  if (shown.kind === 'permission') {
    return (
      <>
        <SessionText face="step" color={palette.ink} accessibilityRole="header">
          {t('camera.permission.title')}
        </SessionText>
        <SessionText face="body" color={palette.muted}>
          {t(shown.canAsk ? 'camera.permission.body' : 'camera.permission.refused')}
        </SessionText>
        <CapsuleButton
          label={t(shown.canAsk ? 'camera.permission.allow' : 'camera.permission.settings')}
          hint={t(
            shown.canAsk ? 'camera.permission.allow.hint' : 'camera.permission.settings.hint',
          )}
          onPress={shown.canAsk ? props.onAllow : props.onSettings}
          testID={shown.canAsk ? 'camera-allow' : 'camera-settings'}
        />
      </>
    );
  }

  if (shown.kind === 'looking' || shown.kind === 'reading') {
    const reading = shown.kind === 'reading';
    return (
      <>
        {reading ? null : (
          <SessionText face="thought" color={palette.ink} testID="camera-line">
            {props.openingLine}
          </SessionText>
        )}
        <ModeChips {...props} disabled={reading} />
        {reading ? (
          <SessionText face="dock" color={palette.muted} style={styles.centred}>
            {t('camera.reading')}
          </SessionText>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('camera.shutter')}
            accessibilityHint={t('camera.shutter.hint')}
            onPress={props.onShutter}
            testID="camera-shutter"
            style={[styles.shutter, { borderColor: palette.ink }]}
          >
            <View style={[styles.shutterCore, { backgroundColor: palette.ink }]} />
          </Pressable>
        )}
      </>
    );
  }

  return <ReadPanel {...props} read={shown.read} />;
}

function ModeChips({
  mode,
  access,
  onMode,
  disabled,
}: CameraScreenProps & { readonly disabled: boolean }) {
  const t = useT();
  const { palette } = useScreenStyle();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      {CAMERA_MODES.map((each) => {
        const chosen = each === mode;
        const state = access[each];
        const name = t(MODE_NAMES[each]);
        return (
          <Pressable
            key={each}
            accessibilityRole="button"
            accessibilityLabel={
              state === 'free_try' ? `${name}. ${t('camera.mode.freeTry')}` : name
            }
            accessibilityHint={t(
              state === 'locked' ? 'camera.mode.locked.hint' : 'camera.mode.hint',
            )}
            accessibilityState={{ selected: chosen, disabled }}
            disabled={disabled}
            onPress={() => onMode(each)}
            testID={`camera-mode-${each}`}
            style={[
              styles.chip,
              { backgroundColor: chosen ? palette.ink : `${palette.ink}0F` },
              disabled && styles.faint,
            ]}
          >
            {state === 'locked' ? <Lock color={palette.muted} /> : null}
            <SessionText face="pill" color={chosen ? palette.page : palette.ink}>
              {name}
            </SessionText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const SHUTTER = 72;
const PEEK = 96;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  frame: { flex: 1, justifyContent: 'space-between' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  bottom: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  peek: { width: PEEK, height: PEEK, marginBottom: -spacing.md, marginLeft: spacing.sm },
  panel: {
    borderRadius: radius.lg + 4,
    padding: spacing.lg,
    gap: spacing.md,
  },
  centred: { textAlign: 'center', minHeight: SHUTTER, textAlignVertical: 'center' },
  chips: { gap: spacing.sm, alignItems: 'center' },
  chip: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  faint: { opacity: 0.45 },
  shutter: {
    alignSelf: 'center',
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: { width: SHUTTER - 16, height: SHUTTER - 16, borderRadius: (SHUTTER - 16) / 2 },
});
