// Scootch, monsters and cards, and the pose baker.
export { CANVAS_FONT_FAMILIES, canvasFont, drawCommands, type Canvas2D } from './backends/canvas2d';
export { toSvg, type SvgOptions } from './backends/svg';
export {
  buildCard,
  CARD_BLEED,
  CARD_FINISHES,
  CARD_HEIGHT,
  CARD_WIDTH,
  type CardOptions,
} from './card/build-card';
export {
  buildStory,
  type StoryComposition,
  type StoryFormat,
  type StoryOptions,
} from './card/build-story';
export type { CardFinishInks } from './card/finish';
export type { CardTilt } from './card/foil';
export { CARD_LABELS, type CardLabels, type CardLanguage } from './card/labels';
export { buildMonster, MONSTER_BODIES } from './core/build-monster';
export {
  GROUND_Y,
  VIEW_SIZE,
  type DrawCommand,
  type FillRule,
  type FontRole,
  type Matrix,
  type Path,
  type PathSegment,
  type TextAlign,
  type TextCommand,
} from './core/commands';
export { estimateTextWidth, type MeasureText, type TextStyle } from './core/text';
export { specFromSeed } from './core/spec-from-seed';
export { buildScootch, SCOOTCH_MOODS } from './scootch/build-scootch';
export type { ScootchMotion } from './scootch/expression';
export {
  WORK_MODE_ATTACHMENTS,
  type LoopValues,
  type ScootchFrame,
  type WorkModeAttachment,
} from './scootch/work-mode-attachment';
