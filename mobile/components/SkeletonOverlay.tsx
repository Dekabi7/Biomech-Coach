import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Colors } from '@/constants/colors';

const CONNECTIONS: [string, string][] = [
  ['left_shoulder',  'right_shoulder'],
  ['left_shoulder',  'left_elbow'],
  ['left_elbow',     'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow',    'right_wrist'],
  ['left_shoulder',  'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip',       'right_hip'],
  ['left_hip',       'left_knee'],
  ['left_knee',      'left_ankle'],
  ['right_hip',      'right_knee'],
  ['right_knee',     'right_ankle'],
];

const PROBLEM_JOINTS = new Set(['right_elbow', 'left_elbow']);

interface Landmark {
  x: number;
  y: number;
  visibility?: number;
}

interface Props {
  landmarks: Record<string, Landmark>;
  width: number;
  height: number;
  color?: string;
  showProblems?: boolean;
}

export function SkeletonOverlay({
  landmarks,
  width,
  height,
  color = Colors.orange,
  showProblems = true,
}: Props) {
  const px = (name: string) => landmarks[name] ? landmarks[name].x * width : null;
  const py = (name: string) => landmarks[name] ? landmarks[name].y * height : null;

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]}>
      <Svg width={width} height={height}>
        {CONNECTIONS.map(([a, b], i) => {
          const x1 = px(a), y1 = py(a), x2 = px(b), y2 = py(b);
          if (x1 == null || y1 == null || x2 == null || y2 == null) return null;
          return (
            <Line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color}
              strokeWidth={2}
              opacity={0.8}
            />
          );
        })}

        {Object.entries(landmarks).map(([name, lm]) => {
          if ((lm.visibility ?? 1) < 0.3) return null;
          const cx = lm.x * width;
          const cy = lm.y * height;
          const isProblem = showProblems && PROBLEM_JOINTS.has(name);
          return (
            <Circle
              key={name}
              cx={cx} cy={cy}
              r={isProblem ? 7 : 5}
              fill={isProblem ? Colors.red : color}
            />
          );
        })}
      </Svg>
    </View>
  );
}
