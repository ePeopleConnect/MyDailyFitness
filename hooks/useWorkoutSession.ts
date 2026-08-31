import { useCallback, useMemo, useRef, useState } from 'react';

import { useCountdown } from '@/hooks/useCountdown';
import type { CompletedStep, Exercise, Phase, Routine, WorkoutLog } from '@/types/fitness';
import { newId } from '@/storage/fitnessStore';

/**
 * One thing the runner does: an exercise, or a rest. Sets and phases are already expanded.
 *
 * The original screen tracked phase, exercise index, set number, resting flag and remaining time
 * as five pieces of state that had to be advanced in agreement, and "what happens next" was
 * spread across three callbacks that each re-derived it. Flattening the whole session into a list
 * up front means running it is an index, and "step 7 of 32" is free rather than another
 * calculation that can disagree with the others.
 */
export interface PlanEntry {
  key: string;
  kind: 'exercise' | 'rest';
  phase: Phase;
  name: string;
  exerciseId: string | null;
  /** Zero for a rep-based exercise, which waits for the user rather than counting down. */
  durationSec: number;
  reps: string | null;
  setNumber: number;
  totalSets: number;
}

export function buildPlan(routine: Routine, exerciseById: (id: string) => Exercise | undefined): PlanEntry[] {
  const plan: PlanEntry[] = [];

  const phaseSteps = (phase: Phase) => routine.steps.filter((s) => s.phase === phase);

  const pushSteps = (phase: Phase, setNumber: number, totalSets: number) => {
    const steps = phaseSteps(phase);

    steps.forEach((step, index) => {
      const exercise = exerciseById(step.exerciseId);

      plan.push({
        key: `${step.id}:${setNumber}`,
        kind: 'exercise',
        phase,
        // Falling back to the stored id rather than skipping: a step whose exercise was deleted
        // still occupies a place in the session, and showing it is better than a plan that
        // silently has fewer entries than the routine the user edited.
        name: exercise?.name ?? 'Removed exercise',
        exerciseId: step.exerciseId,
        durationSec: step.measure === 'reps' ? 0 : step.durationSec,
        reps: step.measure === 'reps' ? step.reps : null,
        setNumber,
        totalSets,
      });

      // No rest after the final step of a phase - the phase change is the rest.
      if (step.restAfterSec > 0 && index < steps.length - 1) {
        plan.push({
          key: `${step.id}:${setNumber}:rest`,
          kind: 'rest',
          phase,
          name: 'Rest',
          exerciseId: null,
          durationSec: step.restAfterSec,
          reps: null,
          setNumber,
          totalSets,
        });
      }
    });
  };

  pushSteps('warmup', 1, 1);

  const sets = Math.max(1, routine.sets);
  for (let set = 1; set <= sets; set += 1) {
    pushSteps('workout', set, sets);

    if (set < sets && routine.restBetweenSetsSec > 0) {
      plan.push({
        key: `set:${set}:rest`,
        kind: 'rest',
        phase: 'workout',
        name: `Rest before set ${set + 1}`,
        exerciseId: null,
        durationSec: routine.restBetweenSetsSec,
        reps: null,
        setNumber: set,
        totalSets: sets,
      });
    }
  }

  pushSteps('cooldown', 1, 1);

  return plan;
}

export type SessionStatus = 'idle' | 'running' | 'paused' | 'complete';

export function useWorkoutSession(
  routine: Routine | null,
  exerciseById: (id: string) => Exercise | undefined,
  options: { onCue?: () => void } = {},
) {
  const plan = useMemo(
    () => (routine ? buildPlan(routine, exerciseById) : []),
    [routine, exerciseById],
  );

  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<SessionStatus>('idle');

  const startedAtRef = useRef<string | null>(null);
  const entryStartedAtRef = useRef<number>(0);
  const completedRef = useRef<CompletedStep[]>([]);

  const current = plan[index] ?? null;
  const upcoming = plan[index + 1] ?? null;

  /** Records what actually happened for the entry being left, then moves on. */
  const recordAndAdvance = useCallback(
    (skipped: boolean) => {
      const entry = plan[index];

      if (entry && entry.kind === 'exercise' && entry.exerciseId) {
        completedRef.current.push({
          exerciseId: entry.exerciseId,
          exerciseName: entry.name,
          phase: entry.phase,
          // Measured, not planned. Skipping at 10 seconds must not log the full minute.
          actualSec: Math.max(0, Math.round((Date.now() - entryStartedAtRef.current) / 1000)),
          skipped,
          setNumber: entry.setNumber,
        });
      }

      const next = index + 1;
      entryStartedAtRef.current = Date.now();

      if (next >= plan.length) {
        setStatus('complete');
        return false;
      }

      setIndex(next);
      return true;
    },
    [index, plan],
  );

  const onCueRef = useRef(options.onCue);
  onCueRef.current = options.onCue;

  const countdown = useCountdown(current?.durationSec ?? 0, () => {
    onCueRef.current?.();

    const moved = recordAndAdvance(false);
    if (!moved) return;

    const next = plan[index + 1];
    // A rep-based entry has no duration, so it waits for a tap rather than auto-advancing past
    // work that has not been done.
    if (next && next.durationSec > 0 && routine?.autoAdvance) {
      countdownRef.current?.start(next.durationSec);
    } else {
      setStatus('paused');
    }
  });

  // The countdown's own callback needs to start the next interval, which means referring to the
  // countdown while creating it. A ref is the ordinary way out of that cycle.
  const countdownRef = useRef(countdown);
  countdownRef.current = countdown;

  const start = useCallback(() => {
    if (plan.length === 0) return;

    startedAtRef.current = new Date().toISOString();
    entryStartedAtRef.current = Date.now();
    completedRef.current = [];
    setIndex(0);
    setStatus('running');

    const first = plan[0];
    if (first.durationSec > 0) {
      countdown.start(first.durationSec);
    }
  }, [countdown, plan]);

  const pause = useCallback(() => {
    countdown.pause();
    setStatus('paused');
  }, [countdown]);

  const resume = useCallback(() => {
    if (current && current.durationSec > 0) countdown.resume();
    setStatus('running');
  }, [countdown, current]);

  /** Marks the current entry done and moves on, whether it was timed or rep-based. */
  const next = useCallback(
    (skipped: boolean) => {
      const moved = recordAndAdvance(skipped);
      if (!moved) {
        countdown.reset(0);
        return;
      }

      const entry = plan[index + 1];
      if (entry.durationSec > 0 && status === 'running') {
        countdown.start(entry.durationSec);
      } else {
        countdown.reset(entry.durationSec);
        if (entry.durationSec === 0) setStatus('running');
      }
    },
    [countdown, index, plan, recordAndAdvance, status],
  );

  const previous = useCallback(() => {
    if (index === 0) return;
    const target = index - 1;
    setIndex(target);
    completedRef.current.pop();
    entryStartedAtRef.current = Date.now();
    countdown.reset(plan[target].durationSec);
    setStatus('paused');
  }, [countdown, index, plan]);

  const stop = useCallback(() => {
    countdown.reset(0);
    setIndex(0);
    setStatus('idle');
    completedRef.current = [];
  }, [countdown]);

  /** Builds the log for the session that just ran. Null when nothing was actually done. */
  const buildLog = useCallback((): WorkoutLog | null => {
    if (!routine || !startedAtRef.current || completedRef.current.length === 0) return null;

    const startedAt = startedAtRef.current;
    const finishedAt = new Date().toISOString();

    return {
      id: newId('log'),
      routineId: routine.id,
      routineName: routine.name,
      startedAt,
      finishedAt,
      totalSec: Math.max(0, Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000)),
      steps: [...completedRef.current],
      completed: status === 'complete',
    };
  }, [routine, status]);

  const exerciseEntries = plan.filter((e) => e.kind === 'exercise').length;
  const exercisesDone = plan.slice(0, index).filter((e) => e.kind === 'exercise').length;

  return {
    plan,
    index,
    current,
    upcoming,
    status,
    countdown,
    exerciseEntries,
    exercisesDone,
    progress: plan.length === 0 ? 0 : index / plan.length,
    start,
    pause,
    resume,
    next,
    previous,
    stop,
    buildLog,
  };
}
