import { Pressable, StyleSheet, View } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { CONTROL_HEIGHT } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Lock } from '../plus/ui/parts';

import { ComposerCapsule } from './composer-capsule';
import { ComposerField, ComposerSend, FieldArrives } from './composer-field';
import { DOCK_PADDING } from './composer-fold';
import { gateWords, showsSwitch, switchWords, type ComposerParts } from './composer-parts';
import { ComposerSwitch } from './composer-switch';
import { ComposerTalk } from './composer-talk';

/**
 * The dock as a row: the round switch, then the capsule or the field with its send button. The
 * capsule is always there, drawn over the dock; when the dock becomes a field it fades out under
 * the field, which fades in, and the two icons of the switch change places. With no start left
 * today the dock takes no words: the switch is off, and the capsule is a locked or a spent control.
 */
export function ComposerRow({
  state,
  level,
  listening,
  busy,
  screenReader,
  drag,
  gate,
  onEvent,
}: ComposerParts) {
  const t = useT();
  const { palette } = useScreenStyle();
  const typing = state.mode === 'typing';
  const words = switchWords(typing);
  const hasSwitch = showsSwitch(state);

  if (gate) {
    const gated = gateWords(gate);
    const spent = gate.kind === 'spent';
    return (
      <>
        <ComposerSwitch
          typing={false}
          listening={false}
          disabled
          off
          label={t('composer.typeIt')}
          hint={t(gated.hint)}
          onPress={() => undefined}
        />
        <View style={styles.stage}>
          <ComposerCapsule
            listening={false}
            armed={false}
            startedAt={null}
            level={0}
            slot={CONTROL_HEIGHT + DOCK_PADDING}
            drag={drag}
            label={t(gated.label)}
            icon={spent ? null : <Lock color={palette.page} />}
            faded={spent}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(gated.label)}
            accessibilityHint={t(gated.hint)}
            accessibilityState={{ disabled: spent }}
            disabled={spent}
            onPress={gate.onUnlock}
            testID={`composer-${gate.kind}`}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </>
    );
  }

  return (
    <>
      {hasSwitch ? (
        <ComposerSwitch
          typing={typing}
          listening={listening}
          disabled={listening || busy}
          label={t(words.label)}
          hint={t(words.hint)}
          onPress={() => onEvent({ type: typing ? 'voice_tapped' : 'keyboard_tapped' })}
        />
      ) : null}
      <View style={styles.stage}>
        <ComposerCapsule
          listening={listening}
          armed={state.armed}
          startedAt={state.startedAt}
          level={level}
          slot={hasSwitch ? CONTROL_HEIGHT + DOCK_PADDING : 0}
          drag={drag}
          hidden={typing}
          tooShort={state.notice === 'too_short'}
        />
        {typing ? (
          <>
            <FieldArrives>
              <ComposerField text={state.text} busy={busy} onEvent={onEvent} />
            </FieldArrives>
            <ComposerSend text={state.text} busy={busy} onEvent={onEvent} />
          </>
        ) : (
          <ComposerTalk
            state={state}
            busy={busy}
            screenReader={screenReader}
            drag={drag}
            onEvent={onEvent}
            shape="over"
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stage: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: CONTROL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: DOCK_PADDING,
  },
});
