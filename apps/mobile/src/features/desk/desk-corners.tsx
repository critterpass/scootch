import { Pressable, StyleSheet, Text } from 'react-native';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { DUO } from '../../ui/fold/fold-layout';
import { GlassSurface } from '../../ui/glass-surface';

import { ClassIcon } from './class-icons';
import { ink } from './class-style';

export interface DeskCornersProps {
  /** The settings button in the top corner; on iPhone Duo Settings is with the side controls. */
  readonly settings: boolean;
  readonly offline: boolean;
  /** The Duo's controls are down the left side: the offline pill keeps clear of them. */
  readonly leading: boolean;
  /** Where the room starts on screen. */
  readonly top: number;
  readonly onSettings: () => void;
}

/** The desk's top corners: the settings button, and the offline pill when there is no connection. */
export function DeskCorners(props: DeskCornersProps) {
  const t = useT();
  const sizing = useTextSizing();
  return (
    <>
      {props.settings ? (
        <GlassSurface interactive style={[styles.settings, { top: props.top + 6 }]}>
          <Pressable
            testID="desk-settings"
            accessibilityRole="button"
            accessibilityLabel={t('desk.settings')}
            onPress={props.onSettings}
            style={styles.settingsPress}
          >
            <ClassIcon name="sliders" color={ink.text} />
          </Pressable>
        </GlassSurface>
      ) : null}
      {props.offline ? (
        <GlassSurface
          style={[
            styles.offline,
            { top: props.top + 26 },
            props.leading ? { left: 18 + DUO.column } : null,
          ]}
          testID="desk-offline"
        >
          <ClassIcon name="offline" color="#8A7F74" size={15} weight={2.2} />
          <Text
            accessibilityRole="text"
            allowFontScaling={sizing.allowFontScaling}
            style={[styles.offlineText, { fontSize: sizing.size(13) }]}
          >
            {t('desk.offline')}
          </Text>
        </GlassSurface>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  settings: { position: 'absolute', right: 18, width: 40, height: 40, borderRadius: 20, zIndex: 3 },
  settingsPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  offline: {
    position: 'absolute',
    left: 18,
    minHeight: 32,
    borderRadius: 16,
    paddingLeft: 11,
    paddingRight: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    zIndex: 3,
  },
  offlineText: { color: '#3E3933', fontWeight: '600' },
});
