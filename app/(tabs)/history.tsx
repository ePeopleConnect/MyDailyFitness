import { FontAwesome } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, useTheme } from '@/constants/theme';
import { formatDuration } from '@/hooks/useCountdown';
import { useFitnessData } from '@/hooks/useFitnessData';
import { exportCsv, exportJson } from '@/storage/exportData';
import type { WorkoutLog } from '@/types/fitness';

/**
 * What was actually done, as opposed to what was planned.
 *
 * Sessions are logged with measured time per exercise and a skipped flag, so a partial session
 * reads as partial rather than quietly counting as a full one. Before this the app kept no record
 * at all - closing it discarded the workout.
 */
export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { logs, routines, exercises, clearLogs } = useFitnessData();
  const [notice, setNotice] = useState<string | null>(null);

  const runExport = async (kind: 'json' | 'csv') => {
    if (logs.length === 0) {
      setNotice('Nothing to export yet - finish a workout first.');
      return;
    }
    setNotice('Preparing...');
    const result = kind === 'json'
      ? await exportJson(logs, routines, exercises)
      : await exportCsv(logs);
    setNotice(result.message);
  };

  const summary = useMemo(() => {
    const now = Date.now();
    const week = logs.filter((l) => now - Date.parse(l.startedAt) < 7 * 24 * 60 * 60 * 1000);
    return {
      sessions: week.length,
      minutes: Math.round(week.reduce((total, l) => total + l.totalSec, 0) / 60),
      streak: currentStreak(logs),
    };
  }, [logs]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>History</Text>
        {logs.length > 0 ? (
          <Pressable
            onPress={() =>
              Alert.alert('Clear history', 'Delete every recorded session? This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => void clearLogs() },
              ])
            }
            hitSlop={8}>
            <Text style={{ color: palette.rose, fontWeight: '700', fontSize: 14 }}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.exportRow}>
        <Pressable onPress={() => void runExport('json')} style={[styles.exportButton, { borderColor: theme.border }]}>
          <FontAwesome name="download" size={13} color={theme.text} />
          <Text style={[styles.exportText, { color: theme.text }]}>Export JSON</Text>
        </Pressable>
        <Pressable onPress={() => void runExport('csv')} style={[styles.exportButton, { borderColor: theme.border }]}>
          <FontAwesome name="table" size={13} color={theme.text} />
          <Text style={[styles.exportText, { color: theme.text }]}>Export CSV</Text>
        </Pressable>
      </View>

      {notice ? (
        <Text style={[styles.notice, { color: theme.muted }]} numberOfLines={2}>
          {notice}
        </Text>
      ) : null}

      <View style={styles.statsRow}>
        <Stat label="This week" value={String(summary.sessions)} caption="sessions" theme={theme} />
        <Stat label="Time" value={String(summary.minutes)} caption="minutes" theme={theme} />
        <Stat label="Streak" value={String(summary.streak)} caption="days" theme={theme} />
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100, alignSelf: 'center', width: '100%', maxWidth: 520 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.muted }]}>
            No sessions recorded yet. Finish a workout and it will show up here.
          </Text>
        }
        renderItem={({ item }) => <LogRow log={item} theme={theme} />}
      />
    </View>
  );
}

function LogRow({ log, theme }: { log: WorkoutLog; theme: { text: string; muted: string; card: string; border: string } }) {
  const skipped = log.steps.filter((s) => s.skipped).length;
  const when = new Date(log.startedAt);

  return (
    <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View
        style={[
          styles.badge,
          { backgroundColor: log.completed ? palette.teal : palette.amber },
        ]}>
        <FontAwesome name={log.completed ? 'check' : 'hourglass-half'} size={13} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: theme.text }]}>{log.routineName}</Text>
        <Text style={[styles.rowMeta, { color: theme.muted }]}>
          {when.toLocaleDateString()} {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {' - '}
          {formatDuration(log.totalSec)}
          {' - '}
          {log.steps.length} exercises
          {skipped > 0 ? ` - ${skipped} skipped` : ''}
        </Text>
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  caption,
  theme,
}: {
  label: string;
  value: string;
  caption: string;
  theme: { text: string; muted: string; card: string; border: string };
}) {
  return (
    <View style={[styles.stat, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statCaption, { color: theme.muted }]}>{caption}</Text>
    </View>
  );
}

/**
 * Consecutive days ending today or yesterday.
 *
 * Yesterday still counts, so a streak does not appear broken simply because today's session has
 * not happened yet - which would be discouraging at exactly the wrong moment.
 */
function currentStreak(logs: WorkoutLog[]): number {
  if (logs.length === 0) return 0;

  const days = new Set(logs.map((l) => new Date(l.startedAt).toDateString()));

  const cursor = new Date();
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toDateString())) return 0;
  }

  let streak = 0;
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, alignSelf: 'center', width: '100%', maxWidth: 520 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 16, alignSelf: 'center', width: '100%', maxWidth: 520 },
  exportRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14, alignSelf: 'center', width: '100%', maxWidth: 520 },
  exportButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 12, paddingVertical: 10 },
  exportText: { fontSize: 13, fontWeight: '700' },
  notice: { fontSize: 12, paddingHorizontal: 16, paddingTop: 8, alignSelf: 'center', width: '100%', maxWidth: 520 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 13, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  statValue: { fontSize: 26, fontWeight: '800', marginTop: 3, fontVariant: ['tabular-nums'] },
  statCaption: { fontSize: 11 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 3 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 15, paddingHorizontal: 32, lineHeight: 22 },
});
