import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * Fixed accents, used in both schemes.
 *
 * Each phase gets its own so the screen tells you where you are before you have read anything -
 * a warm-up looks different from a cool-down at arm's length, which is the distance a phone
 * actually sits at mid-exercise.
 */
export const palette = {
  amber: '#f59e0b',
  violet: '#7c3aed',
  teal: '#0d9488',
  rose: '#e11d48',
  slate: '#64748b',
} as const;

export interface AppTheme {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  /** For a pressed or selected row, where a full card colour would be too heavy. */
  subtle: string;
}

const light: AppTheme = {
  background: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  subtle: '#f1f5f9',
};

const dark: AppTheme = {
  background: '#0b1120',
  card: '#111827',
  text: '#f8fafc',
  muted: '#94a3b8',
  border: '#1f2937',
  subtle: '#161f2e',
};

export function useTheme(): AppTheme {
  return useColorScheme() === 'dark' ? dark : light;
}
