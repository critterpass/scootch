// Scootch, monsters and cards, and the pose baker.
export { drawCommands, type Canvas2D } from './backends/canvas2d';
export { toSvg, type SvgOptions } from './backends/svg';
export { buildMonster, MONSTER_BODIES } from './core/build-monster';
export {
  GROUND_Y,
  VIEW_SIZE,
  type DrawCommand,
  type FillRule,
  type Matrix,
  type Path,
  type PathSegment,
} from './core/commands';
export { specFromSeed } from './core/spec-from-seed';
export { buildScootch, SCOOTCH_MOODS } from './scootch/build-scootch';
export type { ScootchMotion } from './scootch/expression';
export {
  WORK_MODE_ATTACHMENTS,
  type ScootchFrame,
  type WorkModeAttachment,
} from './scootch/work-mode-attachment';
