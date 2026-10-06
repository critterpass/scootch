import { useMemo } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { Id, MonsterRow, WorldPieceRow } from '@scootch/domain';
import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useAppearance } from '../../screens/registry/support/forced-variant';
import { useScreenStyle } from '../../ui/use-screen-style';
import { FirstOffer } from '../plus/first-offer';
import { CommandCanvas } from '../reveal/ui/command-canvas';
import { Dock, KeepFrame } from '../reveal/ui/keep-frame';
import { SessionText } from '../session/ui/session-text';

import { PIECE_NAMES, worldInks, worldRowCommands } from './world-commands';
import { inLandingOrder, layoutWorld, ROW_HEIGHT, WORLD_WIDTH } from './world-layout';

export interface WorldModel {
  readonly pieces: readonly WorldPieceRow[];
  readonly monsters: readonly MonsterRow[];
}

export interface WorldActions {
  readonly close: () => void;
  readonly openZoo: () => void;
  readonly openRecord: () => void;
}

const SPACE = { width: WORLD_WIDTH, height: ROW_HEIGHT };

/**
 * The world: everything finished, as a place. Each piece stands where it landed and the ground
 * grows downwards; the list draws only the rows on screen. The line under the title counts the
 * things that live here and nothing else.
 */
export function WorldScreen({ model, actions }: { model: WorldModel; actions: WorldActions }) {
  const t = useT();
  const { palette } = useScreenStyle();
  const inks = worldInks(useAppearance());
  const { width } = useWindowDimensions();
  const layout = useMemo(
    () => layoutWorld(inLandingOrder(model.pieces, model.monsters), PIECE_NAMES),
    [model.pieces, model.monsters],
  );
  const monsters = useMemo(
    () => new Map<Id, MonsterRow>(model.monsters.map((monster) => [monster.id, monster])),
    [model.monsters],
  );
  const rows = useMemo(() => Array.from({ length: layout.rows }, (_, row) => row), [layout.rows]);
  const count = model.pieces.length;
  return (
    <KeepFrame
      testID="world"
      title={t('oneScreen.world')}
      subtitle={t('world.thingsLiveHere', { count })}
      close={{ label: t('keep.close'), hint: t('keep.close.hint'), onPress: actions.close }}
      closeTestID="world-close"
      scroll={false}
      footer={
        <>
          <FirstOffer />
          <Dock
            quiet={{
              label: t('world.caught'),
              hint: t('world.caught.hint'),
              testID: 'world-open-zoo',
              onPress: actions.openZoo,
            }}
            action={{
              label: t('world.song'),
              hint: t('world.song.hint'),
              testID: 'world-open-record',
              onPress: actions.openRecord,
            }}
          />
        </>
      }
    >
      <FlatList
        data={rows}
        keyExtractor={(row) => String(row)}
        contentContainerStyle={styles.list}
        accessibilityLabel={t('world.thingsLiveHere', { count })}
        renderItem={({ item: row }) => (
          <CommandCanvas
            commands={worldRowCommands(layout, row, monsters, inks)}
            space={SPACE}
            width={width}
            testID={`world-row-${row}`}
          />
        )}
        {...(count === 0
          ? {
              ListFooterComponent: (
                <View style={styles.empty}>
                  <SessionText face="body" color={palette.muted} testID="world-empty">
                    {t('world.empty')}
                  </SessionText>
                </View>
              ),
            }
          : {})}
      />
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: spacing.lg },
  empty: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
});
