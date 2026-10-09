import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ClockTime, DayMoment, StartCue } from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';
import { HelperChip } from '../one-screen/helper-chip';
import { cueOpening, WhenSheet } from '../one-screen/when-sheet';

import { SeriousDock } from './serious-panel';

export interface SeriousFooterProps {
  /** The cue kept with the thing; `null` while it is for now. */
  readonly cue: StartCue | null;
  readonly moments: Readonly<Record<DayMoment, ClockTime>>;
  /** A cue picked on the sheet, kept at once, or `null` for "Now". */
  readonly onCue: (cue: StartCue | null) => void;
  readonly onNotToday: () => void;
  readonly onSit: () => void;
  /** The When sheet drawn open, for the screen registry. */
  readonly opened?: boolean;
}

/**
 * The foot of the serious screen: the When chip over the quiet choices. Only When is offered here,
 * in the interface's plain words: a heavy thing gets no guess, no bites and no "in the way". Its
 * message, when the time comes, is the plain line that no monster signs. A cue picked is kept at
 * once: there is no "Save for later" beside "Sit with it" to choose between.
 */
export function SeriousFooter({
  cue,
  moments,
  onCue,
  onNotToday,
  onSit,
  opened = false,
}: SeriousFooterProps) {
  const t = useT();
  const [open, setOpen] = useState(opened);
  return (
    <View style={styles.foot}>
      <View style={styles.helpers} testID="serious-helpers">
        <HelperChip
          label={cue === null ? t('when.chip') : cueOpening(t, cue)}
          spokenLabel={cue === null ? t('when.chip') : `${t('when.chip')}: ${cueOpening(t, cue)}`}
          hint={cue === null ? t('when.chip.hint') : t('when.chip.set.hint')}
          set={cue !== null}
          onPress={() => setOpen(true)}
          testID="serious-when"
        />
      </View>
      <SeriousDock onNotToday={onNotToday} onSit={onSit} />
      <WhenSheet
        open={open}
        cue={cue}
        moments={moments}
        onCue={onCue}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  foot: { gap: 10 },
  helpers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 6 },
});
