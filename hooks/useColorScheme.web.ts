import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import type { AppColorScheme } from '@/hooks/useColorScheme';

/**
 * The web build renders statically first, so the scheme has to be recalculated on the client:
 * the server has no way to know the visitor's preference, and rendering dark markup that the
 * browser then corrects produces a visible flash.
 */
export function useColorScheme(): AppColorScheme {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (!hasHydrated) {
    return 'light';
  }

  return colorScheme === 'dark' ? 'dark' : 'light';
}
