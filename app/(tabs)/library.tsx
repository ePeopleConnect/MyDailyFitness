import { FontAwesome } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, useTheme } from '@/constants/theme';
import { useFitnessData } from '@/hooks/useFitnessData';
import { newId } from '@/storage/fitnessStore';
import { PHASES, PHASE_LABELS, type Exercise, type Phase } from '@/types/fitness';

/**
 * The exercise library: what a workout can be built from.
 *
 * This screen is the reason the app was restructured. The exercises used to be three `const`
 * arrays inside the run screen, so adding one - or fixing a duration, or writing a different set
 * of instructions - meant editing source and rebuilding. Here they are records: add, edit,
 * archive, and free-text fields for muscle group and equipment so a larger imported catalogue
 * stays searchable.
 */
export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { exercises, saveExercise, removeExercise } = useFitnessData();

  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<Phase | 'all'>('all');
  const [editing, setEditing] = useState<Exercise | null>(null);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return exercises
      .filter((e) => !e.archived)
      .filter((e) => phaseFilter === 'all' || e.phase === phaseFilter)
      .filter(
        (e) =>
          needle.length === 0 ||
          e.name.toLowerCase().includes(needle) ||
          (e.muscleGroup ?? '').toLowerCase().includes(needle) ||
          (e.equipment ?? '').toLowerCase().includes(needle),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, search, phaseFilter]);

  const startNew = () =>
    setEditing({
      id: newId('ex'),
      name: '',
      phase: 'workout',
      defaultDurationSec: 45,
      defaultReps: null,
      instructions: [],
      tips: [],
      modifications: [],
      source: 'custom',
      muscleGroup: null,
      equipment: null,
      archived: false,
    });

  const confirmRemove = (exercise: Exercise) => {
    Alert.alert(
      'Remove exercise',
      `Remove "${exercise.name}"? If a routine still uses it, it is archived instead so that routine keeps working.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void removeExercise(exercise.id) },
      ],
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Library</Text>
        <Pressable onPress={startNew} style={[styles.addButton, { backgroundColor: palette.violet }]}>
          <FontAwesome name="plus" size={13} color="#fff" />
          <Text style={styles.addButtonText}>New</Text>
        </Pressable>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search name, muscle group or equipment"
        placeholderTextColor={theme.muted}
        style={[styles.search, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
      />

      <View style={styles.filterRow}>
        {(['all', ...PHASES] as const).map((value) => {
          const active = phaseFilter === value;
          return (
            <Pressable
              key={value}
              onPress={() => setPhaseFilter(value)}
              style={[
                styles.chip,
                { borderColor: active ? palette.violet : theme.border, backgroundColor: active ? palette.violet : 'transparent' },
              ]}>
              <Text style={[styles.chipText, { color: active ? '#fff' : theme.muted }]}>
                {value === 'all' ? 'All' : PHASE_LABELS[value]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: 16, alignSelf: 'center', width: '100%', maxWidth: 520 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.muted }]}>
            Nothing matches. Clear the search, or add an exercise.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setEditing(item)}
            style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.rowMeta, { color: theme.muted }]}>
                {PHASE_LABELS[item.phase]}
                {item.defaultReps ? ` - ${item.defaultReps} reps` : ` - ${item.defaultDurationSec}s`}
                {item.muscleGroup ? ` - ${item.muscleGroup}` : ''}
                {item.source !== 'seed' ? ' - custom' : ''}
              </Text>
            </View>
            <Pressable onPress={() => confirmRemove(item)} hitSlop={10} style={styles.rowAction}>
              <FontAwesome name="trash-o" size={17} color={palette.rose} />
            </Pressable>
            <FontAwesome name="chevron-right" size={13} color={theme.muted} />
          </Pressable>
        )}
      />

      <ExerciseEditor
        exercise={editing}
        onClose={() => setEditing(null)}
        onSave={async (next) => {
          await saveExercise(next);
          setEditing(null);
        }}
      />
    </View>
  );
}

function ExerciseEditor({
  exercise,
  onClose,
  onSave,
}: {
  exercise: Exercise | null;
  onClose: () => void;
  onSave: (exercise: Exercise) => Promise<void>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Exercise | null>(exercise);

  // Re-seed the draft whenever a different exercise is opened. Without this the modal keeps the
  // first record it ever showed, and edits silently land on the wrong one.
  React.useEffect(() => setDraft(exercise), [exercise]);

  if (!draft) return null;

  const set = <K extends keyof Exercise>(key: K, value: Exercise[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const timed = draft.defaultReps === null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 20 }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              {draft.name.trim().length === 0 ? 'New exercise' : 'Edit exercise'}
            </Text>

            <Field label="Name" theme={theme}>
              <TextInput
                value={draft.name}
                onChangeText={(v) => set('name', v)}
                placeholder="Goblet squat"
                placeholderTextColor={theme.muted}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
            </Field>

            <Field label="Phase" theme={theme}>
              <View style={styles.filterRow}>
                {PHASES.map((phase) => {
                  const active = draft.phase === phase;
                  return (
                    <Pressable
                      key={phase}
                      onPress={() => set('phase', phase)}
                      style={[
                        styles.chip,
                        { borderColor: active ? palette.violet : theme.border, backgroundColor: active ? palette.violet : 'transparent' },
                      ]}>
                      <Text style={[styles.chipText, { color: active ? '#fff' : theme.muted }]}>
                        {PHASE_LABELS[phase]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <View style={styles.switchRow}>
              <Text style={[styles.label, { color: theme.text }]}>Timed</Text>
              <Switch
                value={timed}
                onValueChange={(on) => set('defaultReps', on ? null : '10-12')}
                trackColor={{ true: palette.violet }}
              />
            </View>
            <Text style={[styles.hint, { color: theme.muted }]}>
              Timed exercises run a countdown. Turn this off for a rep target that waits for you to
              tap Done.
            </Text>

            {timed ? (
              <Field label="Duration (seconds)" theme={theme}>
                <TextInput
                  value={String(draft.defaultDurationSec)}
                  onChangeText={(v) => set('defaultDurationSec', Math.max(0, parseInt(v, 10) || 0))}
                  keyboardType="number-pad"
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />
              </Field>
            ) : (
              <Field label="Reps" theme={theme}>
                <TextInput
                  value={draft.defaultReps ?? ''}
                  onChangeText={(v) => set('defaultReps', v)}
                  placeholder="10-12, or 8 each side"
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />
              </Field>
            )}

            <Field label="Muscle group" theme={theme}>
              <TextInput
                value={draft.muscleGroup ?? ''}
                onChangeText={(v) => set('muscleGroup', v.trim().length === 0 ? null : v)}
                placeholder="Legs"
                placeholderTextColor={theme.muted}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
            </Field>

            <Field label="Equipment" theme={theme}>
              <TextInput
                value={draft.equipment ?? ''}
                onChangeText={(v) => set('equipment', v.trim().length === 0 ? null : v)}
                placeholder="Dumbbells"
                placeholderTextColor={theme.muted}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
            </Field>

            <Field label="Instructions (one step per line)" theme={theme}>
              <TextInput
                value={draft.instructions.join('\n')}
                onChangeText={(v) => set('instructions', v.split('\n').filter((l) => l.trim().length > 0))}
                multiline
                style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.border }]}
              />
            </Field>

            <Field label="Tips (one per line)" theme={theme}>
              <TextInput
                value={draft.tips.join('\n')}
                onChangeText={(v) => set('tips', v.split('\n').filter((l) => l.trim().length > 0))}
                multiline
                style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.border }]}
              />
            </Field>

            <Field label="Modifications (one per line)" theme={theme}>
              <TextInput
                value={draft.modifications.join('\n')}
                onChangeText={(v) => set('modifications', v.split('\n').filter((l) => l.trim().length > 0))}
                multiline
                style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.border }]}
              />
            </Field>
          </ScrollView>

          <View style={styles.sheetActions}>
            <Pressable onPress={onClose} style={[styles.ghostButton, { borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                // Guarded rather than disabled: a nameless exercise is unfindable in the library
                // and unreadable mid-workout, and saving one looks like the save failing.
                if (draft.name.trim().length === 0) {
                  Alert.alert('Name required', 'Give the exercise a name so you can find it later.');
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
    </Modal>
  );
}

function Field({
  label,
  theme,
  children,
}: {
  label: string;
  theme: { text: string };
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, alignSelf: 'center', width: '100%', maxWidth: 520 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  search: { alignSelf: 'center', width: '100%', maxWidth: 520, marginHorizontal: 16, marginTop: 14, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 12, alignSelf: 'center', width: '100%', maxWidth: 520 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowMeta: { fontSize: 13, marginTop: 3 },
  rowAction: { padding: 4 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15, paddingHorizontal: 32, lineHeight: 22 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '92%' },
  sheetTitle: { fontSize: 22, fontWeight: '800' },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  ghostButton: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  saveButton: { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  hint: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
});
