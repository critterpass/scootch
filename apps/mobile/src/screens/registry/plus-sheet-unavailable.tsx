import { plusState } from '../../features/plus/registry/plus-state';

/** The sheet on a phone where nothing can be bought. */
export const plusSheetUnavailable = plusState({
  id: 'plus-sheet-unavailable',
  design: null,
  undesignedReason:
    'The board has no state for a phone that cannot reach the store or has purchases switched off; the sheet says so plainly and offers nothing to press but "Not now".',
  capture: { screen: 'sheet', attitude: 'cheeky', plan: 'yearly', phase: 'unavailable' },
});
