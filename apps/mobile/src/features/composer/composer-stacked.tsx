import { StyleSheet, Text, View } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, CONTROL_HEIGHT } from '../../ui/buttons';
import { WaveIcon } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Lock } from '../plus/ui/parts';

import { ComposerField, ComposerSend } from './composer-field';
import { gateWords, showsSwitch, switchWords, type ComposerParts } from './composer-parts';
import { ComposerTalk } from './composer-talk';
import { Waveform } from './waveform';

const LABEL_SIZE = 17;
/** The capsule's colour once the cancel is armed. */
const ARMED = '#5A5550';

/**
 * The dock at the large text sizes: its controls stack full width and grow with their words. The
 * capsule is already as wide as the dock, so only its colour and its words change.
 */
export function ComposerStacked({
  state,
  level,
  listening,
  busy,
  screenReader,
  drag,
  gate,
  onEvent,
}: ComposerParts) {
  const { palette, allowFontScaling, size, reducedMotion } = useScreenStyle();
  const t = useT();
  if (gate) {
    // No start is left today: one full-width control, locked or spent, and no way to type.
    const gated = gateWords(gate);
    const spent = gate.kind === 'spent';
    return (
      <CapsuleButton
        label={t(gated.label)}
        hint={t(gated.hint)}
        disabled={spent}
        onPress={gate.onUnlock}
        testID={`composer-${gate.kind}`}
        {...(spent ? {} : { icon: <Lock color={palette.page} /> })}
      />
    );
  }
  const typing = state.mode === 'typing';
  const words = switchWords(typing);
  const labelStyle = [styles.label, { color: palette.page, fontSize: size(LABEL_SIZE) }] as const;

  return (
    <>
      {typing ? (
        <>
          <ComposerField text={state.text} busy={busy} onEvent={onEvent} />
          <ComposerSend text={state.text} busy={busy} onEvent={onEvent} gone />
        </>
      ) : (
        <ComposerTalk
          state={state}
          busy={busy}
          screenReader={screenReader}
          drag={drag}
          onEvent={onEvent}
          shape="flow"
        >
          <View
            style={[
              styles.capsule,
              {
                backgroundColor: !listening ? palette.ink : state.armed ? ARMED : palette.tomato,
              },
            ]}
          >
            {listening && state.armed ? (
              <Text allowFontScaling={allowFontScaling} style={[labelStyle, styles.onArmed]}>
                {t('composer.releaseToCancel')}
              </Text>
            ) : listening && state.startedAt !== null ? (
              <Waveform
                level={level}
                startedAt={state.startedAt}
                moving={!reducedMotion}
                color={palette.onTomato}
                allowFontScaling={allowFontScaling}
                fontSize={size(15)}
              />
            ) : (
              <>
                <WaveIcon color={palette.page} />
                <Text allowFontScaling={allowFontScaling} style={labelStyle}>
                  {t('talk.hold')}
                </Text>
              </>
            )}
          </View>
        </ComposerTalk>
      )}
      {showsSwitch(state) && !listening ? (
        <CapsuleButton
          tone="quiet"
          label={t(words.label)}
          hint={t(words.hint)}
          onPress={() => onEvent({ type: typing ? 'voice_tapped' : 'keyboard_tapped' })}
          testID="composer-switch"
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  capsule: {
    flex: 1,
    minHeight: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  label: {
    fontFamily: fonts.heading,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  onArmed: {
    color: '#FFFFFF',
  },
});
