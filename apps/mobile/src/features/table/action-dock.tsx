import { CapsuleButton, GlassDock, type CapsuleButtonProps } from '../../ui/buttons';
import { ChoiceDock } from '../dump/dump-panels';

type Choice = Pick<CapsuleButtonProps, 'label' | 'hint' | 'onPress' | 'testID' | 'disabled'>;

export interface ActionDockProps {
  /** The one action, in ink. */
  readonly action?: (Choice & Pick<CapsuleButtonProps, 'icon'>) | undefined;
  /** The quiet way beside it, or the only control when there is no action. */
  readonly quiet?: Choice | undefined;
}

/**
 * The glass dock at the foot of a table or haunt screen, as the boards draw it: one action, a
 * quiet choice beside it, or the quiet choice alone. With neither, nothing is drawn.
 */
export function ActionDock({ action, quiet }: ActionDockProps) {
  if (action !== undefined && quiet !== undefined) {
    return <ChoiceDock quiet={quiet} action={action} />;
  }
  const only = action ?? quiet;
  if (only === undefined) return null;
  return (
    <GlassDock>
      <CapsuleButton {...only} tone={action === undefined ? 'quiet' : 'ink'} />
    </GlassDock>
  );
}
