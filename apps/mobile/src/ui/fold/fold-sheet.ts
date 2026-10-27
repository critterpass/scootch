import type { FoldLayout } from './fold-layout';

/** A floating card's corners, as on the Duo board. */
const CARD_RADIUS = 28;

/**
 * Where a screen's bottom sheet sits on iPhone Duo: a card floating in its corner, or the bottom
 * half in the stand. Null on a phone, which keeps the sheet along the bottom edge. `lift` raises
 * it over the keyboard.
 */
export interface FoldSheetStyle {
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly top?: number;
  readonly borderTopLeftRadius: number;
  readonly borderTopRightRadius: number;
  readonly borderBottomLeftRadius: number;
  readonly borderBottomRightRadius: number;
}

export function foldSheetStyle(layout: FoldLayout, lift = 0): FoldSheetStyle | null {
  const sheet = layout.sheet;
  if (sheet === null) return null;
  const radius = sheet.floating ? CARD_RADIUS : 0;
  return {
    left: sheet.left,
    right: layout.width - sheet.left - sheet.width,
    bottom: sheet.bottom + lift,
    ...(sheet.top !== null && lift === 0 ? { top: sheet.top } : {}),
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    borderBottomLeftRadius: radius,
    borderBottomRightRadius: radius,
  };
}

/** The room on iPhone Duo: above the fold in the stand, the whole window otherwise. */
export function foldRoomStyle(
  layout: FoldLayout,
  top: number,
): { readonly top: number; readonly bottom: number } {
  return { top, bottom: layout.height - layout.room.height };
}

/** How far the room's free part ends short of the window's right edge (the controls). */
export function foldRightInset(layout: FoldLayout): number {
  return layout.pose === 'phone' ? 0 : layout.width - (layout.focus.x + layout.focus.width);
}
