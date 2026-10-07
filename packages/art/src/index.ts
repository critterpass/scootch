// Scootch, monsters and cards, and the pose baker.
export {
  CANVAS_FONT_FAMILIES,
  canvasFont,
  drawCommands,
  type Canvas2D,
  type CanvasGradient2D,
} from './backends/canvas2d';
export { toSvg, type SvgOptions } from './backends/svg';
export {
  buildCardBack,
  CARD_BACK_CIRCLE,
  CARD_BACK_SCOOTCH,
  type CardBackOptions,
} from './card/card-back';
export {
  buildCard,
  buildCardLayers,
  type CardLayers,
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
export {
  buildCardShadow,
  buildMaterial,
  buildMaterialParts,
  CARD_MATERIALS,
  LEVEL,
  MATERIAL_LIGHT,
  materialShift,
  type CardLean,
  type MaterialParts,
} from './card/build-material';
export type { FinishMaterial, MaterialLayer, Tint } from './card/material';
export { roundRect, type Box } from './card/shapes';
export type { CardTilt } from './card/foil';
export { FOIL_BY_RARITY, FOIL_LIGHT, TILE_SHIMMER, type FoilStrength } from './card/foil-light';
export { CARD_LABELS, type CardLabels, type CardLanguage } from './card/labels';
export { buildMonster, MONSTER_BODIES, type MonsterLife } from './core/build-monster';
export { BOIL_FRAMES, BOIL_PER_SECOND, boilFrame, MAX_JITTER, type BoilFrame } from './core/pen';
export { rgba } from './core/rgba';
export {
  GROUND_Y,
  VIEW_SIZE,
  type BlendMode,
  type DrawCommand,
  type GradientStop,
  type Paint,
  type FillRule,
  type FontRole,
  type Matrix,
  type Path,
  type PathSegment,
  type TextAlign,
  type TextCommand,
} from './core/commands';
export * from './motion';
export { estimateTextWidth, type MeasureText, type TextStyle } from './core/text';
export { specFromSeed } from './core/spec-from-seed';
export { buildScootch, SCOOTCH_MOODS, type ScootchBuildOptions } from './scootch/build-scootch';
export type { ScootchBody, ScootchGround, ScootchTone } from './scootch/palette';
export { GAZE_MOODS, type ScootchLook, type ScootchMotion } from './scootch/expression';
export {
  WORK_MODE_ATTACHMENTS,
  type LoopValues,
  type ScootchFrame,
  type WorkModeAttachment,
} from './scootch/work-mode-attachment';
