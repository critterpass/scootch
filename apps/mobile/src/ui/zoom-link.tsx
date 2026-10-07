import { Link, type Href } from 'expo-router';
import type { ReactElement } from 'react';
import { Platform, type GestureResponderEvent } from 'react-native';

import { systemZoom } from './motion/stack-transitions';
import { useMayMove } from './motion/use-feel';

type Press = (event: GestureResponderEvent) => void;

export interface ZoomLinkProps {
  /** The screen the control opens. */
  readonly to: Href;
  /** How the control opens it where there is no zoom: the same screen, pushed. */
  readonly onPress: (() => void) | undefined;
  /** Draws the control around the press it is handed. Its outermost view is what zooms. */
  readonly children: (press: Press | undefined) => ReactElement;
}

/** Takes the link's press out of the props the link hands its child. */
function LinkPress({
  onPress,
  children,
}: {
  readonly onPress?: Press;
  readonly children: (press: Press | undefined) => ReactElement;
}) {
  return <Link.AppleZoom>{children(onPress)}</Link.AppleZoom>;
}

/**
 * A control that opens a screen with the system's zoom: the screen grows out of the control, and
 * shrinks back into it when it is closed or swiped away. The system needs to know the destination
 * before the press, so here the press goes through the router's link to `to`. Where there is no
 * zoom (before iOS 18, another platform, or nothing may move) the control is pressed as it always
 * was, through `onPress`.
 */
export function ZoomLink({ to, onPress, children }: ZoomLinkProps) {
  const mayMove = useMayMove();
  if (!systemZoom(Platform.OS, Platform.Version, mayMove)) return children(onPress);
  return (
    <Link href={to} push asChild>
      <LinkPress>{children}</LinkPress>
    </Link>
  );
}
