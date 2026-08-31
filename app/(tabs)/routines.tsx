import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, useTheme } from '@/constants/theme';
import { formatDuration } from '@/hooks/useCountdown';
import { useFitnessData } from '@/hooks/useFitnessData';
import { buildPlan } from '@/hooks/useWorkoutSession';
import { newId } from '@/storage/fitnessStore';
import { PHASES, PHASE_LABELS, type Phase, type Routine, type RoutineStep } from '@/types/fitness';

/**
 * Routines: what actually runs, and the only place a session's shape can be changed.
 *
 * A step carries its own duration, reps and rest rather than reading them from the exercise, so
 * the same movement can appear twice with different settings and editing an exercise's default
 * does not silently rewrite every routine that already used it.
 */
export default function RoutinesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { routines, activeExercises, exerciseById, saveRoutine, removeRoutine, preferences, savePreferences } =
    useFitnessData();

  const [editing, setEditing] = useState<Routine | null>(null);

  const startNew = () => {
    const now = new Date().toISOString();
    setEditing({
      id: newId('routine'),
      name: '',
      steps: [],
      sets: 1,
      restBetweenSetsSec: 60,
      autoAdvance: true,
      soundEnabled: true,
      createdAt: now,
      updatedAt: now,
    });
  };

  const summarise = (routine: Routine) => {
    const plan = buildPlan(routine, exerciseById);
    const seconds = plan.reduce((total, entry) => total + entry.durationSec, 0);
    const exercises = plan.filter((e) => e.kind === 'exercise').length;
    // Rep-based steps contribute no time, so an estimate built only from durations would read as
    // far shorter than the session really is. Said as "at least" rather than quietly wrong.
    const hasUntimed = plan.some((e) => e.kind === 'exercise' && e.durationSec === 0);
    return `${exercises} exercises - ${hasUntimed ? 'at least ' : ''}${formatDuration(seconds)}`;
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Routines</Text>
        <Pressable onPress={startNew} style={[styles.addButton, { backgroundColor: palette.violet }]}>
          <FontAwesome name="plus" size={13} color="#fff" />
          <Text style={styles.addButtonText}>New</Text>
        </Pressable>
      </View>

      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, alignSelf: 'center', width: '100%', maxWidth: 520 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.muted }]}>
            No routines yet. Create one, add exercises from your library, and it becomes what the
            Workout tab runs.
          </Text>
        }
        renderItem={({ item }) => {
          const active = (preferences.lastRoutineId ?? routines[0]?.id) === item.id;
          return (
            <Pressable
              onPress={() => setEditing(item)}
              style={[
                styles.card,
                { backgroundColor: theme.card, borderColor: active ? palette.violet : theme.border },
              ]}>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
                  {active ? (
                    <View style={[styles.activePill, { backgroundColor: palette.violet }]}>
                      <Text style={styles.activePillText}>Active</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.cardMeta, { color: theme.muted }]}>
                  {summarise(item)}
                  {item.sets > 1 ? ` - ${item.sets} sets` : ''}
                </Text>
              </View>

              {!active ? (
                <Pressable
                  onPress={() => void savePreferences({ ...preferences, lastRoutineId: item.id })}
                  hitSlop={8}
                  style={[styles.useButton, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>Use</Text>
                </Pressable>
              ) : null}
              <FontAwesome name="chevron-right" size={13} color={theme.muted} />
            </Pressable>
          );
        }}
      />

      <RoutineEditor
        routine={editing}
        exercises={activeExercises}
        onClose={() => setEditing(null)}
        onDelete={(id) => {
          Alert.alert('Delete routine', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                await removeRoutine(id);
                setEditing(null);
              },
            },
          ]);
        }}
        onSave={async (routine) => {
          await saveRoutine(routine);
          setEditing(null);
        }}
      />
    </View>
  );
}

function RoutineEditor({
  routine,
  exercises,
  onClose,
  onSave,
  onDelete,
}: {
  routine: Routine | null;
  exercises: { id: string; name: string; phase: Phase; defaultDurationSec: number; defaultReps: string | null }[];
  onClose: () => void;
  onSave: (routine: Routine) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Routine | null>(routine);
  const [picking, setPicking] = useState<Phase | null>(null);

  useEffect(() => setDraft(routine), [routine]);

  const byPhase = useMemo(() => {
    const groups: Record<Phase, RoutineStep[]> = { warmup: [], workout: [], cooldown: [] };
    draft?.steps.forEach((step) => groups[step.phase].push(step));
    return groups;
  }, [draft]);

  if (!draft) return null;

  const update = (changes: Partial<Routine>) => setDraft((d) => (d ? { ...d, ...changes } : d));

  const updateStep = (id: string, changes: Partial<RoutineStep>) =>
    setDraft((d) => (d ? { ...d, steps: d.steps.map((s) => (s.id === id ? { ...s, ...changes } : s)) } : d));

  const removeStep = (id: string) =>
    setDraft((d) => (d ? { ...d, steps: d.steps.filter((s) => s.id !== id) } : d));

  /** Moves a step within its own phase; crossing phases is what the phase field is for. */
  const moveStep = (id: string, direction: -1 | 1) => {
    setDraft((d) => {
      if (!d) return d;
      const step = d.steps.find((s) => s.id === id);
      if (!step) return d;

      const siblings = d.steps.filter((s) => s.phase === step.phase);
      const position = siblings.findIndex((s) => s.id === id);
      const target = position + direction;
      if (target < 0 || target >= siblings.length) return d;

      const reordered = [...siblings];
      [reordered[position], reordered[target]] = [reordered[target], reordered[position]];

      // Rebuilt in phase order so the stored array always matches what is displayed.
      const others = (phase: Phase) => (phase === step.phase ? reordered : d.steps.filter((s) => s.phase === phase));
      return { ...d, steps: [...others('warmup'), ...others('workout'), ...others('cooldown')] };
    });
  };

  const addExercise = (exerciseId: string, phase: Phase) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;

    const step: RoutineStep = {
      id: newId('step'),
      exerciseId,
      phase,
      measure: exercise.defaultReps ? 'reps' : 'time',
      durationSec: exercise.defaultDurationSec,
      reps: exercise.defaultReps,
      restAfterSec: phase === 'workout' ? 15 : 0,
    };
    setDraft((d) => (d ? { ...d, steps: [...d.steps, step] } : d));
    setPicking(null);
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 20 }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              {draft.name.trim().length === 0 ? 'New routine' : draft.name}
            </Text>

            <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Name</Text>
            <TextInput
              value={draft.name}
              onChangeText={(v) => update({ name: v })}
              placeholder="Monday strength"
              placeholderTextColor={theme.muted}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />

            <View style={styles.pairRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.text }]}>Sets</Text>
                <Stepper
                  value={draft.sets}
                  min={1}
                  max={20}
                  step={1}
                  onChange={(v) => update({ sets: v })}
                  theme={theme}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.text }]}>Rest between sets</Text>
                <Stepper
                  value={draft.restBetweenSetsSec}
                  min={0}
                  max={600}
                  step={15}
                  suffix="s"
                  onChange={(v) => update({ restBetweenSetsSec: v })}
                  theme={theme}
                />
              </View>
            </View>
            <Text style={[styles.hint, { color: theme.muted }]}>
              Sets repeat the workout phase only. Warm-up and cool-down always run once.
            </Text>

            <View style={styles.switchRow}>
              <Text style={[styles.label, { color: theme.text }]}>Auto-advance</Text>
              <Switch
                value={draft.autoAdvance}
                onValueChange={(v) => update({ autoAdvance: v })}
                trackColor={{ true: palette.violet }}
              />
            </View>
            <Text style={[styles.hint, { color: theme.muted }]}>
              Move on automatically when a countdown ends. Rep-based steps always wait for you.
            </Text>

            {PHASES.map((phase) => (
              <View key={phase} style={{ marginTop: 22 }}>
                <View style={styles.phaseHeader}>
                  <Text style={[styles.phaseTitle, { color: theme.text }]}>{PHASE_LABELS[phase]}</Text>
                  <Pressable onPress={() => setPicking(phase)} hitSlop={8}>
                    <Text style={{ color: palette.violet, fontWeight: '700', fontSize: 14 }}>+ Add</Text>
                  </Pressable>
                </View>

                {byPhase[phase].length === 0 ? (
                  <Text style={[styles.hint, { color: theme.muted }]}>Nothing here yet.</Text>
                ) : (
                  byPhase[phase].map((step, position) => {
                    const exercise = exercises.find((e) => e.id === step.exerciseId);
                    return (
                      <View key={step.id} style={[styles.stepRow, { borderColor: theme.border }]}>
                        <View style={styles.stepHeader}>
                          <Text style={[styles.stepName, { color: theme.text }]} numberOfLines={1}>
                            {exercise?.name ?? 'Removed exercise'}
                          </Text>
                          <View style={styles.stepButtons}>
                            <Pressable onPress={() => moveStep(step.id, -1)} hitSlop={8} disabled={position === 0}>
                              <FontAwesome name="chevron-up" size={13} color={position === 0 ? theme.border : theme.muted} />
                            </Pressable>
                            <Pressable
                              onPress={() => moveStep(step.id, 1)}
                              hitSlop={8}
                              disabled={position === byPhase[phase].length - 1}>
                              <FontAwesome
                                name="chevron-down"
                                size={13}
                                color={position === byPhase[phase].length - 1 ? theme.border : theme.muted}
                              />
                            </Pressable>
                            <Pressable onPress={() => removeStep(step.id)} hitSlop={8}>
                              <FontAwesome name="trash-o" size={15} color={palette.rose} />
                            </Pressable>
                          </View>
                        </View>

                        <View style={styles.pairRow}>
                          {step.measure === 'time' ? (
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.smallLabel, { color: theme.muted }]}>Duration</Text>
                              <Stepper
                                value={step.durationSec}
                                min={5}
                                max={900}
                                step={5}
                                suffix="s"
                                onChange={(v) => updateStep(step.id, { durationSec: v })}
                                theme={theme}
                              />
                            </View>
                          ) : (
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.smallLabel, { color: theme.muted }]}>Reps</Text>
                              <TextInput
                                value={step.reps ?? ''}
                                onChangeText={(v) => updateStep(step.id, { reps: v })}
                                style={[styles.input, { color: theme.text, borderColor: theme.border, paddingVertical: 8 }]}
                              />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.smallLabel, { color: theme.muted }]}>Rest after</Text>
                            <Stepper
                              value={step.restAfterSec}
                              min={0}
                              max={300}
                              step={5}
                              suffix="s"
                              onChange={(v) => updateStep(step.id, { restAfterSec: v })}
                              theme={theme}
                            />
                          </View>
                        </View>

                        <Pressable
                          onPress={() =>
                            updateStep(step.id, {
                              measure: step.measure === 'time' ? 'reps' : 'time',
                              reps: step.measure === 'time' ? (step.reps ?? '10-12') : step.reps,
                            })
                          }
                          style={{ marginTop: 8 }}>
                          <Text style={{ color: palette.violet, fontSize: 13, fontWeight: '600' }}>
                            Switch to {step.measure === 'time' ? 'reps' : 'timer'}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.sheetActions}>
            <Pressable onPress={() => onDelete(draft.id)} style={[styles.ghostButton, { borderColor: palette.rose }]}>
              <Text style={{ color: palette.rose, fontWeight: '700' }}>Delete</Text>
            </Pressable>
            <Pressable onPress={onClose} style={[styles.ghostButton, { borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (draft.name.trim().length === 0) {
                  Alert.alert('Name required', 'Give the routine a name so you can pick it later.');
                  return;
                }
                if (draft.steps.length === 0) {
                  Alert.alert('No exercises', 'Add at least one exercise, or there is nothing to run.');
                  return;
                }
                void onSave({ ...draft, name: draft.name.trim() });
              }}
              style={[styles.saveButton, { backgroundColor: palette.violet }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal visible={picking !== null} animationType="slide" transparent onRequestClose={() => setPicking(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 20 }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              Add to {picking ? PHASE_LABELS[picking] : ''}
            </Text>
            <ScrollView style={{ marginTop: 12 }} showsVerticalScrollIndicator={false}>
              {exercises.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  onPress={() => picking && addExercise(exercise.id, picking)}
                  style={[styles.pickRow, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>{exercise.name}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
                    {PHASE_LABELS[exercise.phase]}
                    {exercise.defaultReps ? ` - ${exercise.defaultReps} reps` : ` - ${exercise.defaultDurationSec}s`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setPicking(null)} style={[styles.ghostButton, { borderColor: theme.border, marginTop: 12 }]}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function Stepper({
  value,
  min,
  max,
  step,
  suffix = '',
  onChange,
  theme,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
  theme: { text: string; border: string; subtle: string };
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <View style={[styles.stepper, { borderColor: theme.border }]}>
      <Pressable onPress={() => onChange(clamp(value - step))} hitSlop={6} style={styles.stepperButton}>
        <FontAwesome name="minus" size={12} color={theme.text} />
      </Pressable>
      <Text style={[styles.stepperValue, { color: theme.text }]}>
        {value}
        {suffix}
      </Text>
      <Pressable onPress={() => onChange(clamp(value + step))} hitSlop={6} style={styles.stepperButton}>
        <FontAwesome name="plus" size={12} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, alignSelf: 'center', width: '100%', maxWidth: 520 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardMeta: { fontSize: 13, marginTop: 4 },
  activePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  activePillText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  useButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15, paddingHorizontal: 24, lineHeight: 22 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '92%' },
  sheetTitle: { fontSize: 22, fontWeight: '800' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  ghostButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  saveButton: { flex: 1.4, alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  smallLabel: { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  hint: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  pairRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  phaseTitle: { fontSize: 17, fontWeight: '800' },
  stepRow: { borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 10 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  stepName: { fontSize: 15, fontWeight: '700', flex: 1 },
  stepButtons: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  stepperButton: { padding: 6 },
  stepperValue: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pickRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 13 },
});
