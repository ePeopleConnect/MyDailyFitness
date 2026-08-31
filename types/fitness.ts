/**
 * The app's domain model.
 *
 * The original app had none: exercises were three `const` arrays inside the screen and a workout
 * was eight `useState` hooks. Nothing could be changed without editing source, and nothing
 * survived a reload. Everything here exists so those two things stop being true.
 */

/** Where an exercise sits in a session. Warm-up and cool-down run once; the workout repeats. */
export type Phase = 'warmup' | 'workout' | 'cooldown';

export const PHASES: Phase[] = ['warmup', 'workout', 'cooldown'];

export const PHASE_LABELS: Record<Phase, string> = {
  warmup: 'Warm-up',
  workout: 'Workout',
  cooldown: 'Cool-down',
};

/**
 * Where an exercise came from.
 *
 * Kept because provenance decides behaviour, not just display: a `seed` exercise is replaced when
 * the app ships a corrected version of it, a `custom` one never is (it is the user's), and an
 * imported set can be removed as a group without touching anything the user wrote themselves.
 * That last case is the one that matters for importing a gym's published catalogue later.
 */
export type ExerciseSource = 'seed' | 'custom' | 'import';

/** How an exercise is measured. Timed exercises drive the countdown; rep-based ones do not. */
export type MeasureKind = 'time' | 'reps';

export interface Exercise {
  id: string;
  name: string;

  /** The phase this exercise is written for. A routine may still place it anywhere. */
  phase: Phase;

  /** Used when a routine step does not override it. */
  defaultDurationSec: number;

  /** Free text such as "10-12" or "8 each side". Null for purely timed exercises. */
  defaultReps: string | null;

  instructions: string[];
  tips: string[];
  modifications: string[];

  source: ExerciseSource;

  /** Set for `import` exercises, so a whole imported catalogue can be identified and removed. */
  importTag?: string;

  /** Optional grouping the user can filter by: "Chest", "Legs", "Core". */
  muscleGroup?: string | null;

  /** Optional free text: "Dumbbells", "Resistance band", "Bodyweight". */
  equipment?: string | null;

  /** Hidden from pickers without being deleted, so a routine referencing it still resolves. */
  archived?: boolean;
}

/** The shape the generated seed file supplies. Source and id are filled in on seeding. */
export type SeedExercise = Omit<Exercise, 'source' | 'archived' | 'importTag'>;

/**
 * One entry in a routine.
 *
 * Duration and reps are copied onto the step rather than read from the exercise, so changing an
 * exercise's default does not silently rewrite every routine that already used it - and so the
 * same exercise can appear twice in one routine with different settings.
 */
export interface RoutineStep {
  /** Stable across reordering, so React keys and edit targets do not shift. */
  id: string;
  exerciseId: string;
  phase: Phase;
  measure: MeasureKind;

  /** Countdown length for a timed step. Ignored when `measure` is 'reps'. */
  durationSec: number;

  /** Target for a rep-based step, e.g. "10-12". */
  reps: string | null;

  /** Rest inserted after this step. Zero means move straight on. */
  restAfterSec: number;
}

export interface Routine {
  id: string;
  name: string;
  steps: RoutineStep[];

  /** How many times the workout phase repeats. Warm-up and cool-down always run once. */
  sets: number;

  restBetweenSetsSec: number;

  /** Advance automatically when a countdown reaches zero, rather than waiting for a tap. */
  autoAdvance: boolean;

  /** Play a cue at the end of each step. */
  soundEnabled: boolean;

  createdAt: string;
  updatedAt: string;
}

/** One finished step, recorded as it actually happened rather than as it was planned. */
export interface CompletedStep {
  exerciseId: string;
  exerciseName: string;
  phase: Phase;
  /** Wall-clock seconds actually spent, which is not the planned duration if it was skipped. */
  actualSec: number;
  skipped: boolean;
  setNumber: number;
}

export interface WorkoutLog {
  id: string;
  routineId: string;
  routineName: string;
  startedAt: string;
  finishedAt: string;
  totalSec: number;
  steps: CompletedStep[];
  /** False when the session was ended early, so partial sessions are visibly partial. */
  completed: boolean;
}

export interface Preferences {
  /** Counted down before the first exercise so there is time to put the phone down. */
  countdownLeadInSec: number;
  keepAwake: boolean;
  soundEnabled: boolean;
  lastRoutineId: string | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  countdownLeadInSec: 5,
  keepAwake: true,
  soundEnabled: true,
  lastRoutineId: null,
};
