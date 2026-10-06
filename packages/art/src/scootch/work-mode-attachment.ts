import type { WorkMode } from '@scootch/domain';

import * as modes from '../work-modes/index.generated';
import type { WorkModeAttachment } from './work-mode-kit';

export type { LoopValues, ScootchFrame, WorkModeAttachment } from './work-mode-kit';

/**
 * Every work mode of the contract, one file each in the work-modes folder. A mode missing from
 * the folder fails the typecheck; at run time an unknown mode draws the plain working pose.
 */
export const WORK_MODE_ATTACHMENTS: Readonly<Record<WorkMode, WorkModeAttachment>> = modes;
