import type { TaskSetChoicesProps } from './one-screen-panels';
import type { OneScreenShown } from './one-screen-shown';
import { TaskSetDock } from './task-set-dock';

type TaskSetShown = Extract<OneScreenShown, { readonly kind: 'task_set' }>;

/** The length and what goes with it, picked out of a set task for the choices above the dock. */
export function choicesOf(shown: TaskSetShown): TaskSetChoicesProps {
  const { treat, minutes, onTreat, onMinutes, options, endsFrom, cue } = shown;
  return {
    treat,
    minutes,
    onTreat,
    onMinutes,
    ...(options === undefined ? {} : { options }),
    ...(endsFrom === undefined ? {} : { endsFrom }),
    ...(cue === undefined ? {} : { cue }),
  };
}

/** The dock of a set task: the one action, the way to put the task down, and its quiet helpers. */
export function TaskSetFooter({ shown }: { readonly shown: TaskSetShown }) {
  return (
    <TaskSetDock
      startLabel={shown.startLabel}
      startIcon={shown.startIcon}
      minutes={shown.minutes}
      onStart={shown.onStart}
      onDiscard={shown.onDiscard}
      helpers={shown.helpers}
      onSave={shown.onSave}
    />
  );
}
