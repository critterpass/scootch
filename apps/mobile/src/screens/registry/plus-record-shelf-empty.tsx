import { plusState } from '../../features/plus/registry/plus-state';

/** The record shelf before anything has been kept. */
export const plusRecordShelfEmpty = plusState({
  id: 'plus-record-shelf-empty',
  design: null,
  undesignedReason:
    'The board draws the shelf with records on it; a shelf opened before the first one is kept says what will stand there.',
  capture: { screen: 'record-shelf', records: 0 },
});
