import AsyncStorage from '@react-native-async-storage/async-storage';

import { SEED_EXERCISES } from '@/data/seedExercises';
import { SEED_GYM_MACHINES } from '@/data/gymMachines';
import { SEED_ROUTINES } from '@/data/seedRoutines';
import {
  DEFAULT_PREFERENCES,
  type Exercise,
  type Preferences,
  type Routine,
  type RoutineStep,
  type WorkoutLog,
} from '@/types/fitness';

/**
 * Everything that survives a reload.
 *
 * AsyncStorage rather than SQLite deliberately. The data is a few hundred small records, all of
 * it read at start and written on edit; a database would buy query power this app has no use for
 * and cost a native module that complicates the web build the app already supports. The whole
 * surface is behind these functions, so swapping the backing store later touches one file - which
 * is the point at which "we might need SQLite" becomes a decision rather than a rewrite.
 */

const KEYS = {
  version: 'mdf:schemaVersion',
  exercises: 'mdf:exercises',
  routines: 'mdf:routines',
  logs: 'mdf:logs',
  preferences: 'mdf:preferences',
} as const;

/**
 * Bump when the SHAPE of stored data changes, and add a migration.
 *
 * Without this the first release to change a field silently reads old records into a new type and
 * produces undefined where a value is required - which surfaces as a blank screen days later, far
 * from the change that caused it.
 */
const SCHEMA_VERSION = 1;

/** Keeps logs from growing without bound on a device nobody ever clears. */
const MAX_LOGS = 500;

/**
 * Everything seeded into the library: the original bodyweight exercises plus the gym machines.
 * Order matters - the Daily Fitness routine is built from the bodyweight set in this order.
 */
const ALL_SEEDS = [...SEED_EXERCISES, ...SEED_GYM_MACHINES];

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    // A corrupt or unreadable value must not take the app down on launch. Falling back loses
    // that key, which is recoverable; throwing here is not.
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Exercises ────────────────────────────────────────────────────────────────────────────────

export async function getExercises(): Promise<Exercise[]> {
  return readJson<Exercise[]>(KEYS.exercises, []);
}

export async function saveExercise(exercise: Exercise): Promise<Exercise[]> {
  const all = await getExercises();
  const index = all.findIndex((e) => e.id === exercise.id);
  const next = index >= 0 ? all.map((e) => (e.id === exercise.id ? exercise : e)) : [...all, exercise];
  await writeJson(KEYS.exercises, next);
  return next;
}

/**
 * Archives rather than deletes anything a routine still refers to.
 *
 * Hard-deleting would leave a step pointing at nothing, and the run screen would either crash or
 * silently skip a step the user can still see listed. Archiving hides it from pickers and leaves
 * existing routines intact.
 */
export async function removeExercise(id: string): Promise<Exercise[]> {
  const [all, routines] = await Promise.all([getExercises(), getRoutines()]);
  const inUse = routines.some((r) => r.steps.some((s) => s.exerciseId === id));

  const next = inUse
    ? all.map((e) => (e.id === id ? { ...e, archived: true } : e))
    : all.filter((e) => e.id !== id);

  await writeJson(KEYS.exercises, next);
  return next;
}

// ── Routines ─────────────────────────────────────────────────────────────────────────────────

export async function getRoutines(): Promise<Routine[]> {
  return readJson<Routine[]>(KEYS.routines, []);
}

export async function saveRoutine(routine: Routine): Promise<Routine[]> {
  const all = await getRoutines();
  const stamped = { ...routine, updatedAt: new Date().toISOString() };
  const index = all.findIndex((r) => r.id === routine.id);
  const next = index >= 0 ? all.map((r) => (r.id === routine.id ? stamped : r)) : [...all, stamped];
  await writeJson(KEYS.routines, next);
  return next;
}

export async function removeRoutine(id: string): Promise<Routine[]> {
  const next = (await getRoutines()).filter((r) => r.id !== id);
  await writeJson(KEYS.routines, next);
  return next;
}

// ── History ──────────────────────────────────────────────────────────────────────────────────

export async function getLogs(): Promise<WorkoutLog[]> {
  return readJson<WorkoutLog[]>(KEYS.logs, []);
}

export async function appendLog(log: WorkoutLog): Promise<WorkoutLog[]> {
  const all = await getLogs();
  // Newest first, so the history screen never has to sort a growing list to render.
  const next = [log, ...all].slice(0, MAX_LOGS);
  await writeJson(KEYS.logs, next);
  return next;
}

export async function clearLogs(): Promise<void> {
  await writeJson(KEYS.logs, []);
}

// ── Preferences ──────────────────────────────────────────────────────────────────────────────

export async function getPreferences(): Promise<Preferences> {
  // Spread over the defaults so a preference added in a later release has a value for someone
  // upgrading, instead of arriving as undefined.
  return { ...DEFAULT_PREFERENCES, ...(await readJson<Partial<Preferences>>(KEYS.preferences, {})) };
}

export async function savePreferences(preferences: Preferences): Promise<Preferences> {
  await writeJson(KEYS.preferences, preferences);
  return preferences;
}

// ── Seeding ──────────────────────────────────────────────────────────────────────────────────

/**
 * Builds the seeded routines.
 *
 * A routine with no declared steps means "every bodyweight exercise, in seed order" - that is the
 * original app's daily session, and it should follow whatever the bodyweight library contains
 * rather than being pinned to a list that then drifts from it. Routines that DO declare steps get
 * exactly those, which is how the gym circuit keeps its machine-then-step ordering.
 */
function buildSeedRoutines(): Routine[] {
  const now = new Date().toISOString();
  const known = new Set(ALL_SEEDS.map((e) => e.id));

  return SEED_ROUTINES.map((seed) => {
    const declared = seed.steps.length > 0;

    const steps: RoutineStep[] = declared
      ? seed.steps
          // A step naming an exercise that is not seeded would build a plan entry with no
          // exercise behind it, so it is dropped rather than shown as "Removed exercise" on a
          // brand-new install.
          .filter((step) => known.has(step.exerciseId))
          .map((step) => {
            const exercise = ALL_SEEDS.find((e) => e.id === step.exerciseId)!;
            return {
              id: newId('step'),
              exerciseId: step.exerciseId,
              phase: step.phase,
              measure: exercise.defaultReps ? ('reps' as const) : ('time' as const),
              durationSec: step.durationSec,
              reps: exercise.defaultReps,
              restAfterSec: step.restAfterSec,
            };
          })
      : SEED_EXERCISES.map((exercise) => ({
          id: newId('step'),
          exerciseId: exercise.id,
          phase: exercise.phase,
          measure: exercise.defaultReps ? ('reps' as const) : ('time' as const),
          durationSec: exercise.defaultDurationSec,
          reps: exercise.defaultReps,
          restAfterSec: exercise.phase === 'workout' ? 15 : 0,
        }));

    return {
      id: seed.id,
      name: seed.name,
      steps,
      sets: seed.sets,
      restBetweenSetsSec: seed.restBetweenSetsSec,
      autoAdvance: true,
      soundEnabled: true,
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * Prepares storage for use. Safe to call on every launch.
 *
 * Seeding inserts only what is ABSENT. Overwriting instead would discard the user's edits every
 * time the app started, which is the single most destructive thing a seeder can do - and it is
 * invisible in testing, because a fresh install has nothing to lose.
 */
export async function initializeStore(): Promise<void> {
  const storedVersion = Number(await AsyncStorage.getItem(KEYS.version)) || 0;

  const existing = await getExercises();
  const byId = new Map(existing.map((e) => [e.id, e]));

  const added: Exercise[] = ALL_SEEDS.filter((seed) => !byId.has(seed.id)).map((seed) => ({
    ...seed,
    source: 'seed' as const,
    // Kept from the seed when it supplies them - the gym machines carry a muscle group and the
    // machine name, and overwriting those with null would make the library's search useless for
    // exactly the entries that need it most.
    muscleGroup: seed.muscleGroup ?? null,
    equipment: seed.equipment ?? null,
    archived: false,
  }));

  if (added.length > 0) {
    await writeJson(KEYS.exercises, [...existing, ...added]);
  }

  // Only on a genuinely empty store. Recreating the starter routine whenever it is missing would
  // resurrect one the user deliberately deleted.
  if (storedVersion === 0 && (await getRoutines()).length === 0) {
    await writeJson(KEYS.routines, buildSeedRoutines());
  }

  if (storedVersion !== SCHEMA_VERSION) {
    await AsyncStorage.setItem(KEYS.version, String(SCHEMA_VERSION));
  }
}

/** Wipes everything. Used by the "reset to defaults" action, which must confirm first. */
export async function resetAll(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
  await initializeStore();
}
