import { TABLES_AROUND, togetherState } from '../../features/table/registry/together-state';

/** The table's menu: hide the label, mute nudges here, invite a friend, leave. */
export const tableMenu = togetherState({
  id: 'table-menu',
  design: { ...TABLES_AROUND, screen: 'Table menu' },
  capture: 'table-menu',
});
