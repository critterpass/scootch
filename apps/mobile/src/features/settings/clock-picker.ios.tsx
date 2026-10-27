import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden } from '@expo/ui/swift-ui/modifiers';
import { useMemo } from 'react';

import { useAppearance } from '../../screens/registry/support/forced-variant';

import type { ClockPickerProps } from './clock-picker';

/**
 * The system's compact time picker: the time in a capsule, which opens the system's wheel. It
 * shows the time as the phone writes it (24-hour or with AM and PM) and reads it out by itself.
 */
export function ClockPicker({ label, minute, onChange, testID }: ClockPickerProps) {
  const appearance = useAppearance();
  const selection = useMemo(() => {
    const day = new Date();
    day.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    return day;
  }, [minute]);
  return (
    <Host matchContents colorScheme={appearance} testID={testID}>
      <DatePicker
        title={label}
        selection={selection}
        displayedComponents={['hourAndMinute']}
        onDateChange={(picked) => onChange(picked.getHours() * 60 + picked.getMinutes())}
        modifiers={[labelsHidden(), datePickerStyle('compact')]}
      />
    </Host>
  );
}
