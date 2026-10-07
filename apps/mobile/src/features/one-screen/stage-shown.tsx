import type { ReactNode } from 'react';

import type { Attitude, Energy, Id, IsoDate } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import type { ScootchProps } from '../../art/Scootch';
import type { Translate } from '../../i18n/i18n-provider';
import { lineFor } from '../../state/lines';
import { smallerAsk } from '../../state/smaller';
import { dayWords } from '../drawer/day-words';
import {
  ChoiceDock,
  DeadlineCard,
  EnergyRead,
  Headed,
  QuietLink,
  Stack,
} from '../dump/dump-panels';
import { RevealView } from '../dump/reveal';
import { HatchFigure } from '../monster/hatch-figure';

import type { Stage } from './one-screen-stage';
import type { OneScreenShown } from './one-screen-view';

/** What a tap on each control of these states does. The store decides what it means. */
export interface StageActions {
  readonly answerEnergy: (energy: Energy | 'guess') => void;
  readonly another: () => void;
  readonly accept: () => void;
  readonly peek: () => void;
  readonly answerDeadline: (text: string, choice: 'park' | 'today') => void;
  readonly pickAgain: () => void;
  readonly takePick: (itemId: Id) => void;
  /** The way back from Scootch's pick, or from a counter-offer, to where it was asked for. */
  readonly dropPick: () => void;
  readonly smaller: () => void;
  readonly deal: () => void;
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

type Drawable = Extract<
  Stage,
  { kind: 'energy' | 'one_thing' | 'picked_for_me' | 'hatch' | 'bargain' }
>;

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
      mood: 'pleased',
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
    const playing = stage.reveal !== null && !env.revealed;
    const back = deadline ? dayWords(deadline.dueDate, env.today, language) : null;
    return {
      mood: quiet ? 'serious' : playing ? 'thinking' : 'pleased',
      line: null,
      shown: {
        kind: 'panel',
        name: 'one-thing',
        body:
          playing && stage.reveal ? (
            <RevealView reveal={stage.reveal} onDone={actions.revealDone} />
          ) : (
            <Stack>
              <Headed
                label={t(quiet ? 'dump.justThis' : 'dump.oneThing')}
                heading={task.text}
                // A serious task gets its plain words; nothing playful is said about it.
                said={quiet ? lineFor('acknowledge', task, voice) : null}
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
            </Stack>
          ),
        footer: playing ? null : (
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
        ),
      },
    };
  }

  if (stage.kind === 'bargain') {
    const { task, ask } = stage;
    return {
      mood: 'bargaining',
      line: lineFor('checkIn', task, voice),
      shown: {
        kind: 'panel',
        name: 'bargain',
        body: (
          <Stack>
            <Headed
              label={t('bargain.youSaid', { excuse: stage.excuse })}
              heading={null}
              said={lineFor('tinyNextStep', task, voice)}
              testID="bargain"
            />
            <QuietLink
              label={t('pick.back')}
              hint={t('pick.back.hint')}
              onPress={actions.dropPick}
              testID="bargain-back"
            />
          </Stack>
        ),
        footer: (
          <ChoiceDock
            quiet={{
              label: t('bargain.smaller'),
              hint: t('bargain.smaller.hint'),
              onPress: actions.smaller,
              // Nothing is smaller than the smallest ask; the rule is the store's, not this screen's.
              disabled: smallerAsk(ask).minutes === ask.minutes,
              testID: 'bargain-smaller',
            }}
            action={{
              label: t('bargain.deal', { minutes: ask.minutes }),
              hint: t('bargain.deal.hint', { minutes: ask.minutes }),
              onPress: actions.deal,
              testID: 'bargain-deal',
            }}
          />
        ),
      },
    };
  }

  const { task, monster, shrunk } = stage;
  return {
    mood: shrunk ? 'pleased' : 'waiting',
    line: null,
    shown: {
      kind: 'panel',
      name: 'hatch',
      figure: (
        <HatchFigure mood={shrunk ? 'pleased' : 'waiting'} attitude={attitude} monster={monster} />
      ),
      body: (
        <Stack>
          <Headed
            label={t(shrunk ? 'hatch.shrunk' : 'hatch.label')}
            // Shrunk, the smaller task is the news; hatched, the monster's name is.
            heading={shrunk ? task.text : (monster?.name ?? null)}
            said={monster?.flavourText ?? null}
            testID="hatch"
          />
          {/* Only a monster that has hatched can haunt anyone. */}
          {monster ? env.hatchExtra : null}
        </Stack>
      ),
      footer: (
        <ChoiceDock
          quiet={{
            label: t(shrunk ? 'bargain.smaller' : 'hatch.tooBig'),
            hint: t('hatch.tooBig.hint'),
            onPress: actions.tooBig,
            disabled: !stage.canShrink,
            testID: 'hatch-too-big',
          }}
          action={{
            label: t('hatch.catch'),
            hint: t('hatch.catch.hint'),
            onPress: actions.catchIt,
            testID: 'hatch-catch',
          }}
        />
      ),
    },
  };
}
