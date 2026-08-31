import type { Phase } from '@/types/fitness';

/**
 * The routines seeded on a first run, defined by exercise id.
 *
 * Named ids rather than "every seeded exercise" on purpose. The starter routine used to be built
 * from whatever was in the library, which was fine while the library was 21 bodyweight exercises
 * and became wrong the moment gym machines were added - the daily routine would have silently
 * grown a leg press.
 */
export interface SeedRoutineStep {
  exerciseId: string;
  phase: Phase;
  durationSec: number;
  restAfterSec: number;
}

export interface SeedRoutine {
  id: string;
  name: string;
  sets: number;
  restBetweenSetsSec: number;
  steps: SeedRoutineStep[];
}

/** Warm-up and cool-down shared by the home routine, in the order the original app ran them. */
const WARMUP = [
  'marching-in-place',
  'arm-circles-forward',
  'arm-circles-backward',
];

/**
 * The gym circuit: alternating machine and step platform, one minute of work and thirty seconds
 * to move between stations. That timing is how a circuit floor is actually run - a light tells
 * you when to work and when to move - and it is the reason the routine model carries a per-step
 * rest rather than one rest value for the whole session.
 */
const CIRCUIT_MACHINES = [
  'machine-chest-press',
  'machine-leg-press',
  'machine-lat-pulldown',
  'machine-shoulder-press',
  'machine-leg-curl',
  'machine-seated-row',
  'machine-leg-extension',
  'machine-chest-fly',
  'machine-ab-crunch',
  'machine-calf-raise',
];

function circuitSteps(): SeedRoutineStep[] {
  const steps: SeedRoutineStep[] = [];

  CIRCUIT_MACHINES.forEach((exerciseId) => {
    // A step platform sits between every machine, which is what makes it a circuit rather than a
    // list of machines: the cardio station IS the recovery.
    steps.push({ exerciseId: 'circuit-step-platform', phase: 'workout', durationSec: 60, restAfterSec: 30 });
    steps.push({ exerciseId, phase: 'workout', durationSec: 60, restAfterSec: 30 });
  });

  return steps;
}

export const SEED_ROUTINES: SeedRoutine[] = [
  {
    id: 'routine_daily',
    name: 'Daily Fitness',
    sets: 1,
    restBetweenSetsSec: 60,
    // Empty means "every seeded bodyweight exercise, in its original order" - filled in by the
    // store, because that routine is the original app's session and should stay whatever the
    // seeded library contains.
    steps: [],
  },
  {
    id: 'routine_gym_circuit',
    name: 'Gym Machine Circuit',
    sets: 1,
    restBetweenSetsSec: 60,
    steps: circuitSteps(),
  },
];

export const WARMUP_IDS = WARMUP;
