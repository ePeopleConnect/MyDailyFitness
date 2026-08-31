import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const BEEP = require('../assets/beep.mp3');

/**
 * The end-of-interval sound.
 *
 * Split by platform, because the web is not a stricter version of native here - it is a
 * different rule. A browser only allows audio whose FIRST playback happens inside a user
 * gesture, and every cue in a workout is fired by a timer. So the opening cue is refused and
 * the element stays refused for the life of the page: silent for the whole session, with
 * nothing logged to say why.
 *
 * On web this owns a plain HTMLAudioElement so the unlock is something we can actually
 * perform and verify. Going through the expo-audio player was not reliable: it creates its
 * element lazily and loads asynchronously, so a play() issued during the tap can land before
 * the source is ready and do nothing at all - which is exactly the case that has to work,
 * since that one tap is what buys every later cue.
 */
export function useCue(enabled: boolean) {
  const player = useAudioPlayer(BEEP);
  const webAudio = useRef<HTMLAudioElement | null>(null);
  const unlocked = useRef(false);

  // Created once, up front, so the element is loaded and ready before the tap arrives rather
  // than starting to fetch at the moment it is needed.
  useEffect(() => {
    if (Platform.OS !== 'web' || webAudio.current) return;

    // Metro turns the require into a URL on web; a bundler that hands back a module object
    // keeps the URL on `default` or `uri`.
    const source = BEEP as unknown as string | { default?: string; uri?: string };
    const uri =
      typeof source === 'string' ? source : (source?.uri ?? source?.default ?? '');

    if (!uri) return;

    const element = new Audio(uri);
    element.preload = 'auto';
    element.load();
    webAudio.current = element;
  }, []);

  const play = useCallback(() => {
    try {
      if (Platform.OS === 'web') {
        const element = webAudio.current;
        if (!element) return;
        // Rewound first: replaying an element that already reached the end is a no-op, so
        // without this the cue sounds once and is then silent for the rest of the session.
        element.currentTime = 0;
        // The promise is caught rather than awaited: a refusal is information, not a failure
        // that should propagate into a workout.
        void element.play().catch(() => {});
        return;
      }

      void player.seekTo(0);
      player.play();
    } catch {
      // A busy or missing audio route must never interrupt a workout.
    }
  }, [player]);

  /**
   * Call from a real tap. Plays the cue once, which is what makes every later one audible.
   *
   * Audible on purpose rather than a muted unlock trick: a muted play does not reliably lift
   * the restriction, and a beep when you press Start is a useful "go" signal in its own right.
   */
  const unlock = useCallback(() => {
    if (unlocked.current || !enabled) return;
    unlocked.current = true;
    play();
  }, [enabled, play]);

  const cue = useCallback(() => {
    if (!enabled) return;
    play();
  }, [enabled, play]);

  return { cue, unlock };
}
