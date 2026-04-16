import { StyleSheet } from 'react-native';

export const Colors = {
  primary: '#0C447C',
  primaryLight: '#E6F1FB',
  primaryBorder: '#185FA5',
  text: '#111827',
  textMuted: '#6B7280',
  textDisabled: '#9CA3AF',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  separator: '#E5E7EB',
  dot: '#0C447C',
  dotEmpty: '#D1D5DB',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
};

export const Typography = {
  labelSm: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 14, lineHeight: 20 },
  body: { fontSize: 15, lineHeight: 22 },
  title: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
};

export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
export const MIN_HIT = 44;

export const hairline = StyleSheet.hairlineWidth;
