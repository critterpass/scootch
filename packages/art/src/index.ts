// The drawing model, its backends and the surface baker.
export {
  CANVAS_FONT_FAMILIES,
  canvasFont,
  drawCommands,
  type Canvas2D,
  type CanvasGradient2D,
} from './backends/canvas2d';
export { toSvg, type SvgOptions } from './backends/svg';
export {
  BOIL_FRAMES,
  BOIL_PER_SECOND,
  boilFrame,
  INK,
  MAX_JITTER,
  Pen,
  WHITE,
  type BoilFrame,
} from './core/pen';
export * from './core/geometry';
export { hash, strHash } from './core/rng';
export { COMMON_INKS, INKS, type InkId, type InkPair } from './core/inks';
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
export { estimateTextWidth, type MeasureText, type TextStyle } from './core/text';
