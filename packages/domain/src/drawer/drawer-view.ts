/** Whether the drawer is showing. It starts closed on every launch and is never stored. */
export interface DrawerView {
  readonly open: boolean;
}

export const DRAWER_CLOSED: DrawerView = { open: false };

/**
 * Everything that can happen around the drawer. Only `pulled` is the user's deliberate act: the
 * pull-down, or their tap on "Peek in the drawer".
 */
export type DrawerEvent =
  | { readonly type: 'pulled' }
  | { readonly type: 'closed' }
  | { readonly type: 'swapped_in' }
  | { readonly type: 'things_parked' }
  | { readonly type: 'deadline_heard' }
  | { readonly type: 'thought_kept' }
  | { readonly type: 'item_returned' }
  | { readonly type: 'items_faded' }
  | { readonly type: 'day_rolled_over' }
  | { readonly type: 'app_opened' };

export type DrawerEffect = { readonly kind: 'show_drawer' } | { readonly kind: 'hide_drawer' };

export interface DrawerStep {
  readonly view: DrawerView;
  readonly effects: readonly DrawerEffect[];
}

/** The drawer opens on the user's pull and on nothing else; parking, fading and returning are silent. */
export function drawerViewReducer(view: DrawerView, event: DrawerEvent): DrawerStep {
  switch (event.type) {
    case 'pulled':
      return view.open
        ? { view, effects: [] }
        : { view: { open: true }, effects: [{ kind: 'show_drawer' }] };
    case 'closed':
    case 'swapped_in':
    case 'day_rolled_over':
    case 'app_opened':
      return view.open
        ? { view: DRAWER_CLOSED, effects: [{ kind: 'hide_drawer' }] }
        : { view, effects: [] };
    case 'things_parked':
    case 'deadline_heard':
    case 'thought_kept':
    case 'item_returned':
    case 'items_faded':
      return { view, effects: [] };
  }
}
