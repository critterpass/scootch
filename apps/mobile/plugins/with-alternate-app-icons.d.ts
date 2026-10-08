import type { ConfigPlugin } from 'expo/config-plugins';

export interface AlternateIcon {
  /** The name `UIApplication.setAlternateIconName` takes. */
  readonly name: string;
  /** The three drawings, as paths from the project root. */
  readonly light: string;
  readonly dark: string;
  readonly tinted: string;
}

export const withAlternateAppIcons: ConfigPlugin<readonly AlternateIcon[]>;
