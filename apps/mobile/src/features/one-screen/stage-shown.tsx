import type { ReactNode } from 'react';

import type { Attitude, Energy, Id, IsoDate } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import type { ScootchProps } from '../../art/Scootch';
import type { Translate } from '../../i18n/i18n-provider';
import { lineFor } from '../../state/lines';
import { dayWords } from '../drawer/day-words';
import {
  ChoiceDock,
  DeadlineCard,
  EnergyRead,
  Headed,
  QuietLink,
  Stack,
} from '../dump/dump-panels';
import { Choosing } from '../dump/choosing';
import { choosingScript, revealCapMs } from '../dump/choosing-script';
import { restInDrawerLine } from '../dump/rest-in-drawer';
import { RevealGate } from '../dump/reveal-gate';

import { hatchShown } from './hatch-shown';
import type { Stage } from './one-screen-stage';
import type { OneScreenShown } from './one-screen-view';

/** What a tap on each control of these states does. The store decides what it means. */
export interface StageActions {
  readonly answerEnergy: (energy: Energy | 'guess') => void;
  readonly another: () => void;
  readonly accept: () => void;
  /** The offered words came out wrong: back to the composer with what was said. */
  readonly edit: () => void;
  readonly peek: () => void;
  readonly answerDeadline: (text: string, choice: 'park' | 'today') => void;
  readonly pickAgain: () => void;
  readonly takePick: (itemId: Id) => void;
  /** The way back from Scootch's pick to where it was asked for. */
  readonly dropPick: () => void;
  readonly tooBig: () => void;
  readonly catchIt: () => void;
  readonly revealDone: () => void;
}

export interface StageEnv {
  readonly t: Translate;
  readonly language: Language;
  readonly attitude: Attitude;
  readonly today: IsoDate;
  /** The reveal has played for this one thing. */
  readonly revealed: boolean;
  /** The words last sent from the composer, which the reveal plays back; `null` once played. */
  readonly sentWords?: string | null;
  /** How many things are parked in the drawer. */
  readonly parked?: number;
  /** Plays one named cue with its haptics, under the person's switches. */
  readonly cue?: (name: string) => void;
  /** A quiet control under the hatched monster's words: "Haunt a friend", when it is offered. */
  readonly hatchExtra?: ReactNode;
  readonly actions: StageActions;
}

export interface StageDrawn {
  readonly mood: ScootchProps['mood'];
  /** Scootch's sentence, from the task's lines or the offline pack. */
  readonly line: string | null;
  readonly shown: OneScreenShown;
}

type Drawable = Extract<Stage, { kind: 'energy' | 'one_thing' | 'picked_for_me' | 'hatch' }>;

/** The states between sending and a set task, as the one screen draws them. */
export function stageShown(stage: Drawable, env: StageEnv): StageDrawn {
  const { t, language, attitude, actions } = env;
  const voice = { language, attitude };
  const peek = (
    <QuietLink
      label={t('drawer.peek')}
      hint={t('drawer.peek.hint')}
      onPress={actions.peek}
      testID="drawer-peek"
    />
  );

  if (stage.kind === 'energy') {
    return {
      mood: 'thinking',
      line: null,
      shown: {
        kind: 'panel',
        name: 'energy',
        body: <EnergyRead onAnswer={actions.answerEnergy} />,
        footer: null,
      },
    };
  }

  if (stage.kind === 'picked_for_me') {
    const { item } = stage;
    const back = {
      label: t('pick.back'),
      hint: t('pick.back.hint'),
      onPress: actions.dropPick,
      testID: 'pick-back',
    };
    return {
      // He has chosen for you, and is pleased with himself about it.
      mood: 'scheming',
      line: null,
      shown: {
        kind: 'panel',
        name: 'picked',
        body: (
          <Stack>
            <Headed label={t('pick.picked')} heading={item.text} testID="picked-thing" />
            {stage.canPickAgain ? <QuietLink {...back} /> : null}
          </Stack>
        ),
        footer: (
          <ChoiceDock
            // With one thing parked there is nothing else to pick: the quiet side is the way back.
            quiet={
              stage.canPickAgain
                ? {
                    label: t('pick.again'),
                    hint: t('pick.again.hint'),
                    onPress: actions.pickAgain,
                    testID: 'pick-again',
                  }
                : back
            }
            action={{
              label: t('pick.accept'),
              hint: t('pick.accept.hint'),
              onPress: () => actions.takePick(item.id),
              testID: 'pick-accept',
            }}
          />
        ),
      },
    };
  }

  if (stage.kind === 'one_thing') {
    const { task, quiet, deadline } = stage;
    // A serious task gets its plain words and no reveal.
    const script = quiet
      ? null
      : choosingScript({
          sent: env.sentWords ?? null,
          heard: stage.reveal,
          oneThing: task.text,
        });
    const playing = script !== null && !env.revealed;
    const back = deadline ? dayWords(deadline.dueDate, env.today, language) : null;
    // What this ramble parked, when it is known; otherwise what the drawer holds.
    const parked = stage.reveal ? stage.reveal.phrases.length - 1 : (env.parked ?? 0);
    return {
      mood: quiet ? 'serious' : playing ? 'thinking' : 'celebrating',
      line: null,
      shown: {
        kind: 'panel',
        name: 'one-thing',
        body: (
          <Choosing key={task.id} script={script} playing={playing} onDone={actions.revealDone}>
            <Stack>
              <Headed
                label={t(quiet ? 'dump.justThis' : 'dump.oneThing')}
                heading={task.text}
                // A serious task gets its plain words; nothing playful is said about it.
                said={quiet ? lineFor('acknowledge', task, voice) : restInDrawerLine(parked, voice)}
                testID="one-thing"
              />
              {deadline && back !== null ? (
                <DeadlineCard
                  said={deadline.line}
                  back={t('deadline.back', { day: back })}
                  keepLabel={t('deadline.keep', { day: back })}
                  onKeep={() => actions.answerDeadline(deadline.text, 'park')}
                  onToday={() => actions.answerDeadline(deadline.text, 'today')}
                />
              ) : null}
              {peek}
              <QuietLink
                label={t('dump.edit')}
                hint={t('dump.edit.hint')}
                onPress={actions.edit}
                testID="one-thing-edit"
              />
            </Stack>
          </Choosing>
        ),
        // The dock waits for the reveal, and never longer than the reveal's own length and a
        // margin: the gate ends a reveal that has not reported its end.
        footer: (
          <RevealGate playing={playing} capMs={revealCapMs(script)} onCap={actions.revealDone}>
            <ChoiceDock
              quiet={{
                label: t('dump.another'),
                hint: t('dump.another.hint'),
                onPress: actions.another,
                disabled: !stage.another,
                testID: 'one-thing-another',
              }}
              action={{
                label: t('dump.accept'),
                hint: t('dump.accept.hint'),
                onPress: actions.accept,
                testID: 'one-thing-accept',
              }}
            />
          </RevealGate>
        ),
      },
    };
  }

  return hatchShown(stage, env);
}
