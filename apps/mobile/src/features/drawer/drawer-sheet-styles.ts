import { StyleSheet } from 'react-native';

import { fonts } from '@scootch/tokens';

const MARKER = 22;
const CLOSE = 32;

/** The drawer sheet's layout, as the design sets it. */
export const drawerStyles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 4,
  },
  headWords: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 10,
    rowGap: 2,
  },
  stacked: { flexDirection: 'column', alignItems: 'flex-start' },
  closeButton: {
    width: CLOSE,
    height: CLOSE,
    borderRadius: CLOSE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.heading },
  body: { fontFamily: fonts.body },
  strong: { fontFamily: fonts.heading },
  list: { flexGrow: 0, flexShrink: 1 },
  listContent: { gap: 8 },
  card: { borderRadius: 22, overflow: 'hidden' },
  rowClip: { overflow: 'hidden' },
  waiting: { borderWidth: 1.5, marginBottom: 8 },
  waitingDot: { width: 8, height: 8, borderRadius: 4 },
  lane: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  marker: {
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { fontFamily: fonts.heading, fontWeight: '800', fontSize: 13, lineHeight: 15 },
  words: { flex: 1, gap: 2 },
  struck: { textDecorationLine: 'line-through' },
  field: { paddingVertical: 4, borderBottomWidth: 1.5 },
  swap: {
    minHeight: 30,
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noteBox: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  note: { textAlign: 'center' },
  cap: { paddingBottom: 10 },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 6,
    minHeight: 44,
  },
  undoWords: { flex: 1 },
  undoButton: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
});
