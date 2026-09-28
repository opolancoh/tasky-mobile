import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from './theme';
import type { Colors, TypeVariant } from './tokens';

type TextColor = 'heading' | 'ink' | 'ink2' | 'ink3' | 'accent' | 'danger' | 'success' | 'onAccent';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
}

const defaultColor: Partial<Record<TypeVariant, TextColor>> = { largeTitle: 'heading', title: 'heading' };

export function Text({ variant = 'body', color, align, style, ...rest }: TextProps) {
  const { colors, type } = useTheme();
  const c = color ?? defaultColor[variant] ?? 'ink';
  return <RNText {...rest} style={[type[variant], { color: colors[c as keyof Colors] as string, textAlign: align }, style]} />;
}
