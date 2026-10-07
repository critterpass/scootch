import { StyleSheet } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

const MARKER = 22;

/** The drawer sheet's layout, as the design sets it. */
export const drawerStyles = StyleSheet.create({
  shade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28,26,23,0.25)' },
  sheet: {
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 44,
    borderWidth: 0.5,
    paddingTop: 12,
    paddingHorizontal: 18,
    gap: 12,
    overflow: 'hidden',
  },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center' },
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    columnGap: spacing.sm,
    rowGap: 2,
    paddingHorizontal: 4,
  },
  title: { fontFamily: fonts.heading },
  body: { fontFamily: fonts.body },
  wide: { flexBasis: '100%' },
  strong: { fontFamily: fonts.heading },
  list: { flexGrow: 0, flexShrink: 1 },
  listContent: { gap: 12 },
  card: { borderRadius: 22, overflow: 'hidden' },
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
  swap: {
    minHeight: 30,
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noteBox: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  note: { textAlign: 'center' },
  close: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
