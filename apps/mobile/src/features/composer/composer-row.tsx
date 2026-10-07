import { StyleSheet, View } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { CONTROL_HEIGHT } from '../../ui/buttons';

import { ComposerCapsule } from './composer-capsule';
import { ComposerField, ComposerSend, FieldArrives } from './composer-field';
import { DOCK_PADDING } from './composer-fold';
import { showsSwitch, switchWords, type ComposerParts } from './composer-parts';
import { ComposerSwitch } from './composer-switch';
import { ComposerTalk } from './composer-talk';

/**
 * The dock as a row: the round switch, then the capsule or the field with its send button. The
 * capsule is always there, drawn over the dock; when the dock becomes a field it fades out under
 * the field, which fades in, and the two icons of the switch change places.
 */
export function ComposerRow({
  state,
  level,
  listening,
  busy,
  screenReader,
  drag,
  onEvent,
}: ComposerParts) {
  const t = useT();
  const typing = state.mode === 'typing';
  const words = switchWords(typing);
  const hasSwitch = showsSwitch(state);

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
