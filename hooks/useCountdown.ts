import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * A countdown measured against the clock, not against ticks.
 *
 * The original timer was `setInterval(() => setTimeRemaining(t => t - 1), 1000)`. That is wrong in
 * two ways that both matter for a workout:
 *
 *   1. It counts intervals, and intervals are not seconds. Every one arrives a little late, the
 *      error accumulates, and a 60-second exercise runs measurably long.
 *   2. Timers are throttled or stopped entirely when the app is backgrounded - which is exactly
 *      what happens when someone puts the phone down to do the exercise. The countdown freezes,
 *      and the app claims time remains that has already passed.
 *
 * Storing the moment the interval ENDS fixes both. Every tick, and every return to the
 * foreground, is a subtraction from the clock rather than a running total, so time that passed
 * while the app was asleep is simply gone - which is what actually happened.
 */
export interface Countdown {
  /** Whole seconds left, never below zero. */
  remaining: number;
  running: boolean;
  /** True once the interval has elapsed; latched so a caller cannot miss it between renders. */
  finished: boolean;
  start: (seconds?: number) => void;
  pause: () => void;
  resume: () => void;
  /** Stops and loads a new duration without running it. */
  reset: (seconds: number) => void;
  /** Adds (or with a negative value removes) time while running or paused. */
  adjust: (seconds: number) => void;
}

export function useCountdown(initialSeconds: number, onFinish?: () => void): Countdown {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  /** Epoch ms when the current interval ends. Null whenever the countdown is not running. */
  const endsAtRef = useRef<number | null>(null);
  /** Seconds left at the moment of pausing, so resuming does not lose the remainder. */
  const pausedAtRef = useRef<number>(initialSeconds);

  // Held in a ref so changing the callback does not restart the interval - passing an inline
  // arrow (which every caller does) would otherwise re-create the timer on every render.
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const settle = useCallback(() => {
    if (endsAtRef.current === null) return;

    const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
    setRemaining(left);

    if (left === 0) {
      endsAtRef.current = null;
      pausedAtRef.current = 0;
      setRunning(false);
      setFinished(true);
      onFinishRef.current?.();
    }
  }, []);

  useEffect(() => {
    if (!running) return;

    // 250ms, not 1000ms: the displayed second changes on a clock boundary that has nothing to do
    // with when the interval started, so polling four times a second keeps the number honest
    // without the cost of a tighter loop.
    const id = setInterval(settle, 250);
    return () => clearInterval(id);
  }, [running, settle]);

  // Coming back from the background is the case the old timer got wrong, so it is corrected
  // explicitly rather than waiting for the next tick.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') settle();
    });
    return () => subscription.remove();
  }, [settle]);

  const start = useCallback((seconds?: number) => {
    const duration = seconds ?? pausedAtRef.current;
    if (duration <= 0) return;

    endsAtRef.current = Date.now() + duration * 1000;
    pausedAtRef.current = duration;
    setRemaining(duration);
    setFinished(false);
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (endsAtRef.current === null) return;
    pausedAtRef.current = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
    endsAtRef.current = null;
    setRemaining(pausedAtRef.current);
    setRunning(false);
  }, []);

  const resume = useCallback(() => {
    if (pausedAtRef.current <= 0) return;
    endsAtRef.current = Date.now() + pausedAtRef.current * 1000;
    setFinished(false);
    setRunning(true);
  }, []);

  const reset = useCallback((seconds: number) => {
    endsAtRef.current = null;
    pausedAtRef.current = seconds;
    setRemaining(seconds);
    setRunning(false);
    setFinished(false);
  }, []);

  const adjust = useCallback((seconds: number) => {
    if (endsAtRef.current !== null) {
      endsAtRef.current = Math.max(Date.now(), endsAtRef.current + seconds * 1000);
      setRemaining(Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000)));
      return;
    }
    pausedAtRef.current = Math.max(0, pausedAtRef.current + seconds);
    setRemaining(pausedAtRef.current);
  }, []);

  return { remaining, running, finished, start, pause, resume, reset, adjust };
}

/** mm:ss, and h:mm:ss once a session passes an hour. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
  const ss = String(seconds).padStart(2, '0');

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
