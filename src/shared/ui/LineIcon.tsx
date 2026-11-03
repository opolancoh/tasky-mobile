import Svg, { Path } from 'react-native-svg';

/** Icons Feather lacks, drawn with desktop's Lucide paths so both apps show the same shape. */
const PATHS = {
  listChecks: ['M13 5h8', 'M13 12h8', 'M13 19h8', 'm3 17 2 2 4-4', 'm3 7 2 2 4-4'],
  arrowUpDown: ['m21 16-4 4-4-4', 'M17 20V4', 'm3 8 4-4 4 4', 'M7 4v16'],
  circleCheck: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'm16 9-5.5 5.5L8 12'],
} as const;

export type LineIconName = keyof typeof PATHS;

export function LineIcon({ name, size = 20, color }: { name: LineIconName; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name].map((d) => <Path key={d} d={d} />)}
    </Svg>
  );
}
