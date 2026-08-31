import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as store from '@/storage/fitnessStore';
import {
  DEFAULT_PREFERENCES,
  type Exercise,
  type Preferences,
  type Routine,
  type WorkoutLog,
} from '@/types/fitness';

/**
 * One copy of the stored data, shared by every screen.
 *
 * Each screen reading storage for itself would be simpler to write and wrong in a way that is
 * hard to see: edit an exercise on the library screen and the routine editor, already mounted on
 * another tab, keeps rendering the old copy until something happens to remount it. Loading once
 * and updating in place means every screen changes together.
 *
 * Every mutator returns the new collection from the store and sets it, rather than mutating local
 * state and hoping the write succeeded - so what is on screen is what was persisted.
 */
interface FitnessData {
  ready: boolean;
  exercises: Exercise[];
  routines: Routine[];
  logs: WorkoutLog[];
  preferences: Preferences;

  /** Excludes archived exercises: what a picker should offer. */
  activeExercises: Exercise[];
  exerciseById: (id: string) => Exercise | undefined;

  saveExercise: (exercise: Exercise) => Promise<void>;
  removeExercise: (id: string) => Promise<void>;
  saveRoutine: (routine: Routine) => Promise<void>;
  removeRoutine: (id: string) => Promise<void>;
  appendLog: (log: WorkoutLog) => Promise<void>;
  clearLogs: () => Promise<void>;
  savePreferences: (preferences: Preferences) => Promise<void>;
  resetAll: () => Promise<void>;
}

const FitnessDataContext = createContext<FitnessData | null>(null);

export function FitnessDataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  const load = useCallback(async () => {
    await store.initializeStore();
    const [e, r, l, p] = await Promise.all([
      store.getExercises(),
      store.getRoutines(),
      store.getLogs(),
      store.getPreferences(),
    ]);
    setExercises(e);
    setRoutines(r);
    setLogs(l);
    setPreferences(p);
    setReady(true);
  }, []);

  useEffect(() => {
    load().catch(() => {
      // Never leave the app on a permanent splash because storage misbehaved. The seed data is
      // compiled in, so an empty store still renders something usable.
      setReady(true);
    });
  }, [load]);

  const value = useMemo<FitnessData>(() => {
    const activeExercises = exercises.filter((e) => !e.archived);
    const index = new Map(exercises.map((e) => [e.id, e]));

    return {
      ready,
      exercises,
      routines,
      logs,
      preferences,
      activeExercises,
      exerciseById: (id) => index.get(id),

      saveExercise: async (exercise) => setExercises(await store.saveExercise(exercise)),
      removeExercise: async (id) => setExercises(await store.removeExercise(id)),
      saveRoutine: async (routine) => setRoutines(await store.saveRoutine(routine)),
      removeRoutine: async (id) => setRoutines(await store.removeRoutine(id)),
      appendLog: async (log) => setLogs(await store.appendLog(log)),
      clearLogs: async () => {
        await store.clearLogs();
        setLogs([]);
      },
      savePreferences: async (next) => setPreferences(await store.savePreferences(next)),
      resetAll: async () => {
        await store.resetAll();
        await load();
      },
    };
  }, [ready, exercises, routines, logs, preferences, load]);

  return <FitnessDataContext.Provider value={value}>{children}</FitnessDataContext.Provider>;
}

export function useFitnessData(): FitnessData {
  const context = useContext(FitnessDataContext);
  if (!context) {
    throw new Error('useFitnessData must be used inside a FitnessDataProvider');
  }
  return context;
}
