import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * The app's colour scheme, narrowed to the two values it actually has styles for.
 *
 * React Native's own hook widened in 0.83 to include 'unspecified' alongside null, which is
 * correct for the platform but useless as an index into a palette that has exactly a light and a
 * dark entry - and it produced an implicit-any error at every call site. Anything that is not
 * explicitly dark is treated as light, which is the same fallback the callers were already
 * applying with `?? 'light'`.
 */
export type AppColorScheme = 'light' | 'dark';

export function useColorScheme(): AppColorScheme {
  return useRNColorScheme() === 'dark' ? 'dark' : 'light';
}
