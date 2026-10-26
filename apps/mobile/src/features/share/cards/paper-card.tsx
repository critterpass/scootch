import { Circle, Group, Line, Rect, RoundedRect, Shadow, Text } from '@shopify/react-native-skia';
import type { ReactElement } from 'react';

import { Brand, BLUE_INK, CARD_HEIGHTS, CARD_WIDTH, Check, RED, Signature } from './card-parts';
import { handText, lineCount, Spaced, Words } from './card-text';
import type { CardProps } from './card-props';

const INK = '#4A443E';
const RULE = 'rgba(106,69,184,0.2)';
const ROW = 31;

/**
 * Bài kiểm tra: the graded test paper on your desk (ShareCard board, first card). The task, how
 * long it waited and took, his red check and his comment, or the circled 10 drawn.
 */
export function PaperCard({ copy, fonts, height, phu }: CardProps): ReactElement {
  const paper = copy.paper;
  const top = (height - CARD_HEIGHTS.post) / 2;
  const left = 26;
  const width = CARD_WIDTH - left * 2;
  const inner = width - 36;
  const tapeFont = fonts('hand', 20);
  const taskFont = fonts('sansBold', 13);
  const labelFont = fonts('sans', 13);
  const taskLabelWidth = (labelFont?.getTextWidth(paper.taskLabel) ?? 34) + 6;
  const taskRows = lineCount(paper.task, taskFont, inner - taskLabelWidth, 2);
  const nameLabelWidth = (labelFont?.getTextWidth(paper.nameLabel) ?? 38) + 6;

  const commentFont = (() => {
    if (paper.comment === null) return null;
    const room = inner - 96 - 40;
    const probe = fonts('hand', 40);
    if (probe === null) return null;
    const measured = probe.getTextWidth(handText(paper.comment));
    return measured <= room ? probe : fonts('hand', Math.max(22, (40 * room) / measured));
  })();

  const rows: { readonly key: string; readonly draw: (y: number) => ReactElement }[] = [
    {
      key: 'name',
      draw: (y) => (
        <Group>
          {labelFont ? (
            <Text x={18} y={y + 21} text={paper.nameLabel} font={labelFont} color={INK} />
          ) : null}
          {paper.name !== null ? (
            <Words
              text={handText(paper.name)}
              x={18 + nameLabelWidth}
              y={y + 22}
              width={inner - nameLabelWidth}
              lineHeight={ROW}
              font={fonts('hand', 20)}
              color={BLUE_INK}
              tape={copy.tape}
              tapeFont={tapeFont}
              maxLines={1}
            />
          ) : null}
        </Group>
      ),
    },
    {
      key: 'task',
      draw: (y) => (
        <Group>
          {labelFont ? (
            <Text x={18} y={y + 21} text={paper.taskLabel} font={labelFont} color={INK} />
          ) : null}
          <Words
            text={paper.task}
            x={18 + taskLabelWidth}
            y={y + 21}
            width={inner - taskLabelWidth}
            lineHeight={ROW}
            font={taskFont}
            color="#1C1A18"
            tape={copy.tape}
            tapeFont={tapeFont}
            maxLines={2}
          />
        </Group>
      ),
    },
    ...(taskRows > 1 ? [{ key: 'task-2', draw: () => <Group /> }] : []),
    {
      key: 'work',
      draw: (y) =>
        labelFont ? (
          <Text x={18} y={y + 21} text={paper.workLabel} font={labelFont} color={INK} />
        ) : (
          <Group />
        ),
    },
    ...paper.work.map((line, index) => ({
      key: `work-${index}`,
      draw: (y: number) => (
        <Words
          text={handText(line)}
          x={18}
          y={y + 23}
          width={inner}
          lineHeight={ROW}
          font={fonts('hand', 22)}
          color={BLUE_INK}
          tape={copy.tape}
          tapeFont={tapeFont}
          maxLines={1}
        />
      ),
    })),
  ];

  const paperHeight = Math.max(300, 145 + rows.length * ROW + 24);

  return (
    <Group>
      <Rect x={0} y={0} width={CARD_WIDTH} height={height} color="#C98B55" />
      {Array.from({ length: Math.ceil(height / 64) }, (_, index) => (
        <Rect
          key={index}
          x={0}
          y={index * 64}
          width={CARD_WIDTH}
          height={2}
          color="rgba(0,0,0,0.05)"
        />
      ))}
      <Group
        transform={[{ rotate: (-1.5 * Math.PI) / 180 }]}
        origin={{ x: CARD_WIDTH / 2, y: top + 24 + paperHeight / 2 }}
      >
        <Group transform={[{ translateX: left }, { translateY: top + 24 }]}>
          <RoundedRect x={0} y={0} width={width} height={paperHeight} r={4} color="#FBF5E8">
            <Shadow dx={0} dy={14} blur={15} color="rgba(60,30,10,0.3)" />
          </RoundedRect>
          <Group transform={[{ rotate: (-35 * Math.PI) / 180 }]} origin={{ x: 23, y: 13 }}>
            <RoundedRect x={12} y={10} width={22} height={6} r={2} color="#A9ADB5" />
          </Group>
          <Spaced
            text={paper.heading}
            x={width / 2}
            y={27}
            font={fonts('sansBold', 11)}
            color={INK}
            spacing={0.12}
            center
          />

          <Rect
            x={18}
            y={37}
            width={inner}
            height={96}
            color={INK}
            style="stroke"
            strokeWidth={1.5}
          />
          <Line
            p1={{ x: 18 + 96, y: 37 }}
            p2={{ x: 18 + 96, y: 133 }}
            color={INK}
            strokeWidth={1.5}
          />
          <Text x={24} y={51} text={paper.gradeLabel} font={fonts('sansBold', 10)} color={INK} />
          <Check x={18 + 14} y={37 + 24} width={70} />
          <Text
            x={18 + 96 + 8}
            y={51}
            text={paper.noteLabel}
            font={fonts('sansBold', 10)}
            color={INK}
          />
          {paper.ten ? (
            <Group>
              <Circle
                cx={18 + 96 + 60}
                cy={37 + 58}
                r={27}
                color={RED}
                style="stroke"
                strokeWidth={3}
              />
              {fonts('hand', 32) ? (
                <Text
                  x={18 + 96 + 60 - (fonts('hand', 32)?.getTextWidth('10') ?? 0) / 2}
                  y={37 + 69}
                  text="10"
                  font={fonts('hand', 32)}
                  color={RED}
                />
              ) : null}
            </Group>
          ) : null}
          {paper.comment !== null && commentFont !== null ? (
            <Group
              transform={[{ rotate: (-4 * Math.PI) / 180 }]}
              origin={{ x: 18 + 96 + 14, y: 37 + 70 }}
            >
              <Text
                x={18 + 96 + 14}
                y={37 + 70}
                text={handText(paper.comment)}
                font={commentFont}
                color={RED}
              />
            </Group>
          ) : null}
          <Signature
            x={18 + inner - 8 - 54}
            y={37 + 96 - 6 - 20}
            width={54}
            color={RED}
            stroke={2.4}
          />

          {rows.map((row, index) => {
            const y = 145 + index * ROW;
            return (
              <Group key={row.key}>
                <Line
                  p1={{ x: 18, y: y + ROW }}
                  p2={{ x: 18 + inner, y: y + ROW }}
                  color={RULE}
                  strokeWidth={1}
                />
                {row.draw(y)}
              </Group>
            );
          })}
        </Group>
      </Group>
      {phu ? (
        <Group
          transform={[
            { translateX: CARD_WIDTH - 118 },
            { translateY: top + CARD_HEIGHTS.post - 150 },
            { scale: 0.6 },
          ]}
        >
          {phu}
        </Group>
      ) : null}
      <Brand
        x={22}
        y={height - 22}
        label={copy.brand}
        font={fonts('sansBold', 14)}
        color="#FFFFFF"
      />
    </Group>
  );
}
