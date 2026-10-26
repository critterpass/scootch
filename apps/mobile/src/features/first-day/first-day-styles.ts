import { StyleSheet } from 'react-native';

import { fonts } from '@phusclass/tokens';

/** The boards' red: labels, and the one action that lets his notes in. */
export const CLASS_RED = '#D42A24';

/** The first day's styles, from the App board's sheet. */
export const styles = StyleSheet.create({
  fill: { flex: 1 },
  foot: { flex: 1, justifyContent: 'flex-end' },
  bubble: {
    position: 'absolute',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 6px 16px rgba(30,40,30,0.16)',
  },
  bubbleText: { color: '#1C1A18', fontFamily: fonts.heading, fontWeight: '800' },
  sheet: {
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    boxShadow: '0 -8px 30px rgba(60,40,20,0.12)',
  },
  grabber: {
    alignSelf: 'center',
    marginTop: 10,
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(28,26,24,0.16)',
  },
  sheetScroll: { flexGrow: 1 },
  sheetContent: { flexGrow: 1, paddingTop: 16, paddingHorizontal: 20, gap: 10 },
  sheetHead: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  heading: { fontWeight: '700', letterSpacing: -0.5 },
  body: {},
  hint: {},
  input: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontWeight: '600',
  },
  action: { marginTop: 'auto' },
  notNow: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
  notNowText: { fontWeight: '600' },
  note: {
    marginTop: 4,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    boxShadow: '0 8px 24px rgba(60,40,20,0.10)',
  },
  noteIcon: { width: 34, height: 34, borderRadius: 8 },
  noteText: { flex: 1, gap: 2 },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  noteFrom: { fontWeight: '700' },
  red: {
    minHeight: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CLASS_RED,
    boxShadow: '0 10px 24px rgba(201,36,30,0.28)',
  },
  redText: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
});
