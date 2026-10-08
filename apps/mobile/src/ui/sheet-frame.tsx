import type { ViewProps } from 'react-native';

import { useRouteSheet } from './native-bar';
import { SafeFrame } from './safe-frame';

/** A sheet's own top: the room the system leaves for a grabber, above the first control. */
export const SHEET_TOP = 14;
const IN_A_SHEET = ['bottom', 'left', 'right'] as const;

/**
 * The frame of a screen that is opened as a sheet. In a sheet it keeps clear of the sheet's own
 * top edge and of the home bar; the status bar is already above it, so the window's top inset is
 * not applied a second time. Drawn anywhere else (a capture, a deep link) it is a full screen and
 * keeps clear of all four edges.
 */
export function SheetFrame({ style, ...rest }: ViewProps) {
  const sheet = useRouteSheet();
  if (!sheet) return <SafeFrame {...rest} style={style} />;
  return <SafeFrame {...rest} edges={IN_A_SHEET} minTop={SHEET_TOP} style={style} />;
}
