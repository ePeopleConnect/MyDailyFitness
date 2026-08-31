import { FontAwesome } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, useTheme } from '@/constants/theme';
import { formatDuration } from '@/hooks/useCountdown';
import { useFitnessData } from '@/hooks/useFitnessData';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { PHASE_LABELS, type Phase } from '@/types/fitness';

const PHASE_TINT: Record<Phase, string> = {
  warmup: palette.amber,
  workout: palette.violet,
  cooldown: palette.teal,
};

export default function RunScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { ready, routines, preferences, exerciseById, appendLog, savePreferences } = useFitnessData();

  const [detailOpen, setDetailOpen] = useState(false);

  const routine = useMemo(() => {
    if (routines.length === 0) return null;
    return routines.find((r) => r.id === preferences.lastRoutineId) ?? routines[0];
  }, [routines, preferences.lastRoutineId]);

  const player = useAudioPlayer(require('../../assets/beep.mp3'));

  /** Briefly true when a cue fires, so the end of an interval is visible as well as audible. */
  const [flash, setFlash] = useState(false);

  const beep = useCallback(() => {
    try {
      // Rewound first: replaying a player that already reached the end is a no-op, so without
      // this the cue sounds once and is then silent for the rest of the session.
      void player.seekTo(0);
      player.play();
    } catch {
      // A busy or missing audio route must never interrupt a workout.
    }
  }, [player]);

  const audioUnlocked = useRef(false);

  /**
   * Plays the cue once from inside a real tap, which is what makes every later cue audible.
   *
   * Mobile browsers - iOS Safari most strictly - only allow audio whose FIRST playback happens
   * inside a user gesture. Every cue in a workout comes from a timer, so without this the very
   * first attempt is blocked and the player stays blocked for the life of the page: silent for
   * the entire session, with no error anywhere.
   *
   * Deliberately audible rather than a muted unlock trick. A muted play does not reliably lift
   * the restriction on iOS, and a beep when you press Start is a useful "go" signal in its own
   * right rather than a workaround the user has to wonder about.
   */
  const unlockAudio = useCallback(() => {
    if (audioUnlocked.current || !preferences.soundEnabled) return;
    audioUnlocked.current = true;
    beep();
  }, [beep, preferences.soundEnabled]);

  const cue = useCallback(() => {
    // The flash is not a fallback for sound being off - it fires either way. On a gym floor the
    // phone is often face-up and on silent, and a countdown that ends with no signal at all is
    // the thing that makes you miss the change.
    setFlash(true);
    setTimeout(() => setFlash(false), 700);

    if (!preferences.soundEnabled) return;
    beep();
  }, [beep, preferences.soundEnabled]);

  const session = useWorkoutSession(routine, exerciseById, { onCue: cue });
  const { current, upcoming, status, countdown, plan, index } = session;

  // Writing the log is a side effect of finishing, and must happen exactly once.
  useEffect(() => {
    if (status !== 'complete') return;
    const log = session.buildLog();
    if (log) void appendLog(log);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const exercise = current?.exerciseId ? exerciseById(current.exerciseId) : undefined;
  const tint = current ? PHASE_TINT[current.phase] : palette.violet;
  const ring = Math.min(width - 80, 280);

  // A rep target is free text, and some of it is a sentence: "15-20 seconds hold" is three words
  // that overflowed the ring at a fixed 42px and spilled outside the border. Sized against the
  // length so the longest realistic target still lands inside the circle, and wrapped rather than
  // truncated - "8 each" would be a lie where "8 each side" is the instruction.
  const repsText = current?.reps ?? '-';
  const repsFontSize = repsText.length > 18 ? 20 : repsText.length > 12 ? 25 : repsText.length > 6 ? 32 : 42;

  if (!ready) {
    return (
      <View style={[styles.centred, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.muted }}>Loading...</Text>
      </View>
    );
  }

  if (!routine || plan.length === 0) {
    return (
      <View style={[styles.centred, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <FontAwesome name="heartbeat" size={44} color={theme.muted} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No routine yet</Text>
        <Text style={[styles.emptyBody, { color: theme.muted }]}>
          Build one on the Routines tab - pick exercises, set durations and rests, then come back
          here and press start.
        </Text>
      </View>
    );
  }

  if (status === 'complete') {
    return (
      <View style={[styles.centred, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={[styles.completeBadge, { backgroundColor: palette.teal }]}>
          <FontAwesome name="check" size={40} color="#fff" />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Session complete</Text>
        <Text style={[styles.emptyBody, { color: theme.muted }]}>
          {session.exercisesDone} of {session.exerciseEntries} exercises - {routine.name}
        </Text>
        <Pressable onPress={session.stop} style={[styles.primaryButton, { backgroundColor: tint, marginTop: 24 }]}>
          <Text style={styles.primaryButtonText}>Back to start</Text>
        </Pressable>
      </View>
    );
  }

  const isResting = current?.kind === 'rest';
  const isRepBased = (current?.durationSec ?? 0) === 0 && !isResting;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 130 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.routineName, { color: theme.muted }]} numberOfLines={1}>
              {routine.name}
            </Text>
            <Text style={[styles.phase, { color: tint }]}>
              {current ? PHASE_LABELS[current.phase] : ''}
              {current && current.totalSets > 1 ? ' - set ' + current.setNumber + '/' + current.totalSets : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => void savePreferences({ ...preferences, soundEnabled: !preferences.soundEnabled })}
            hitSlop={12}
            style={[styles.iconButton, { borderColor: theme.border }]}>
            <FontAwesome
              name={preferences.soundEnabled ? 'volume-up' : 'volume-off'}
              size={16}
              color={theme.muted}
            />
          </Pressable>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { width: `${Math.round(session.progress * 100)}%`, backgroundColor: tint }]} />
        </View>
        <Text style={[styles.progressLabel, { color: theme.muted }]}>
          Step {index + 1} of {plan.length}
        </Text>

        <View
          style={[
            styles.ring,
            {
              width: ring,
              height: ring,
              borderRadius: ring / 2,
              borderColor: tint,
              backgroundColor: flash ? tint : 'transparent',
            },
          ]}>
          {isRepBased ? (
            <>
              <Text
                style={[
                  styles.reps,
                  { color: theme.text, fontSize: repsFontSize, lineHeight: repsFontSize * 1.15, maxWidth: ring * 0.76 },
                ]}>
                {repsText}
              </Text>
              <Text style={[styles.ringCaption, { color: theme.muted }]}>reps</Text>
            </>
          ) : (
            <>
              <Text style={[styles.time, { color: flash ? '#fff' : theme.text }]}>
                {formatDuration(countdown.remaining)}
              </Text>
              <Text style={[styles.ringCaption, { color: flash ? '#fff' : theme.muted }]}>
                {isResting ? 'resting' : countdown.running ? 'go' : 'paused'}
              </Text>
            </>
          )}
        </View>

        <Text style={[styles.exerciseName, { color: theme.text }]}>{current?.name}</Text>

        {exercise && !isResting ? (
          <Pressable onPress={() => setDetailOpen(true)} style={styles.howToRow}>
            <FontAwesome name="info-circle" size={14} color={tint} />
            <Text style={[styles.howTo, { color: tint }]}>How to do this</Text>
          </Pressable>
        ) : null}

        {upcoming ? (
          <Text style={[styles.upNext, { color: theme.muted }]} numberOfLines={1}>
            Up next - {upcoming.name}
          </Text>
        ) : null}

        {!isRepBased ? (
          <View style={styles.adjustRow}>
            {[-15, -5, 5, 15].map((delta) => (
              <Pressable
                key={delta}
                onPress={() => countdown.adjust(delta)}
                style={[styles.adjustButton, { borderColor: theme.border }]}>
                <Text style={[styles.adjustText, { color: theme.text }]}>
                  {delta > 0 ? '+' + delta : String(delta)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.controls,
          { paddingBottom: insets.bottom + 16, backgroundColor: theme.card, borderTopColor: theme.border },
        ]}>
        <Pressable
          onPress={session.previous}
          disabled={index === 0}
          style={[styles.secondaryButton, { borderColor: theme.border, opacity: index === 0 ? 0.4 : 1 }]}>
          <FontAwesome name="step-backward" size={16} color={theme.text} />
        </Pressable>

        {status === 'idle' ? (
          <Pressable
            onPress={() => {
              unlockAudio();
              session.start();
            }}
            style={[styles.primaryButton, { backgroundColor: tint }]}>
            <FontAwesome name="play" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Start</Text>
          </Pressable>
        ) : isRepBased ? (
          <Pressable
            onPress={() => {
              unlockAudio();
              session.next(false);
            }}
            style={[styles.primaryButton, { backgroundColor: tint }]}>
            <FontAwesome name="check" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Done</Text>
          </Pressable>
        ) : countdown.running ? (
          <Pressable onPress={session.pause} style={[styles.primaryButton, { backgroundColor: tint }]}>
            <FontAwesome name="pause" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Pause</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              unlockAudio();
              session.resume();
            }}
            style={[styles.primaryButton, { backgroundColor: tint }]}>
            <FontAwesome name="play" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Resume</Text>
          </Pressable>
        )}

        <Pressable onPress={() => session.next(true)} style={[styles.secondaryButton, { borderColor: theme.border }]}>
          <FontAwesome name="step-forward" size={16} color={theme.text} />
        </Pressable>
      </View>

      <Modal visible={detailOpen} animationType="slide" transparent onRequestClose={() => setDetailOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDetailOpen(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 24 }]}
            onPress={(event) => event.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{exercise?.name}</Text>
              {([
                ['Instructions', exercise?.instructions ?? []],
                ['Tips', exercise?.tips ?? []],
                ['Modifications', exercise?.modifications ?? []],
              ] as const).map(([heading, items]) =>
                items.length > 0 ? (
                  <View key={heading} style={{ marginTop: 16 }}>
                    <Text style={[styles.modalHeading, { color: tint }]}>{heading}</Text>
                    {items.map((line) => (
                      <Text key={line} style={[styles.modalLine, { color: theme.muted }]}>
                        {line}
                      </Text>
                    ))}
                  </View>
                ) : null,
              )}
            </ScrollView>
            <Pressable
              onPress={() => setDetailOpen(false)}
              style={[styles.primaryButton, { backgroundColor: tint, marginTop: 16 }]}>
              <Text style={styles.primaryButtonText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  content: { paddingHorizontal: 20, alignItems: 'center', alignSelf: 'center', width: '100%', maxWidth: 520 },
  headerRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 12 },
  routineName: { fontSize: 13, fontWeight: '600' },
  phase: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  iconButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { alignSelf: 'stretch', height: 5, borderRadius: 3, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  progressLabel: { alignSelf: 'flex-start', marginTop: 6, fontSize: 12 },
  ring: { borderWidth: 10, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  time: { fontSize: 54, fontWeight: '800', fontVariant: ['tabular-nums'] },
  reps: { fontWeight: '800', textAlign: 'center' },
  ringCaption: { fontSize: 13, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1.2 },
  exerciseName: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 24 },
  howToRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  howTo: { fontSize: 14, fontWeight: '600' },
  upNext: { fontSize: 14, marginTop: 14 },
  adjustRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  adjustButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  adjustText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingTop: 14,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    minWidth: 160,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  completeBadge: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  emptyBody: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '82%' },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalHeading: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  modalLine: { fontSize: 15, lineHeight: 23, marginBottom: 3 },
});
