import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Exercise, Routine, WorkoutLog } from '@/types/fitness';

/**
 * Getting your data out.
 *
 * The app is deliberately offline and account-free, which is a good property right up until it
 * means the record of what you did is trapped on one device. Export is what stops "no server"
 * from also meaning "no way to keep it, move it, or look at it in anything else".
 *
 * Two formats, because they answer different questions. JSON round-trips - it carries every
 * field, including the routines and the exercise library, so it can be re-imported or read by
 * something else. CSV is one row per completed exercise, which is what actually opens in a
 * spreadsheet and can be charted without writing code.
 */

/** Bumped when the export SHAPE changes, so a reader can tell what it is holding. */
const EXPORT_VERSION = 1;

export interface ExportBundle {
  format: 'mydailyfitness-export';
  version: number;
  exportedAt: string;
  counts: { logs: number; routines: number; exercises: number };
  logs: WorkoutLog[];
  routines: Routine[];
  exercises: Exercise[];
}

export function buildBundle(
  logs: WorkoutLog[],
  routines: Routine[],
  exercises: Exercise[],
): ExportBundle {
  return {
    format: 'mydailyfitness-export',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    counts: { logs: logs.length, routines: routines.length, exercises: exercises.length },
    logs,
    // Included so the export is self-contained: a log references exercises by id, and without
    // them a file opened on another device is a list of identifiers nobody can read.
    routines,
    exercises,
  };
}

/** RFC 4180: quote everything and double any embedded quote. Exercise names contain commas. */
function csvCell(value: string | number | boolean): string {
  return '"' + String(value).replace(/"/g, '""') + '"';
}

/**
 * One row per completed exercise rather than per session.
 *
 * A row per session would need a nested list of exercises in a cell, which no spreadsheet can
 * filter or chart. Flattened, "how long did I spend on squats in March" is a pivot table.
 */
export function buildCsv(logs: WorkoutLog[]): string {
  const header = [
    'session_id',
    'started_at',
    'finished_at',
    'routine',
    'session_completed',
    'phase',
    'set_number',
    'exercise',
    'seconds',
    'skipped',
  ];

  const rows = logs.flatMap((log) =>
    log.steps.map((step) =>
      [
        log.id,
        log.startedAt,
        log.finishedAt,
        log.routineName,
        log.completed,
        step.phase,
        step.setNumber,
        step.exerciseName,
        step.actualSec,
        step.skipped,
      ]
        .map(csvCell)
        .join(','),
    ),
  );

  // Trailing newline: without one, some tools treat the final row as truncated.
  return [header.map(csvCell).join(','), ...rows].join('\n') + '\n';
}

export function suggestedFileName(extension: 'json' | 'csv'): string {
  // Date first so the files sort chronologically in a folder listing.
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `mydailyfitness-${stamp}.${extension}`;
}

/**
 * Hands the file to the platform: a download in the browser, the share sheet on a phone.
 *
 * These genuinely are different actions rather than one abstraction. A browser has no share
 * sheet and no writable file system, and a phone has no downloads folder the user can find - so
 * pretending otherwise produces a button that silently does nothing on one of them.
 */
export async function deliver(
  contents: string,
  fileName: string,
  mimeType: string,
): Promise<{ ok: boolean; message: string }> {
  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([contents], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Released, or the blob is held for the lifetime of the page.
      URL.revokeObjectURL(url);

      return { ok: true, message: `Downloaded ${fileName}` };
    } catch (error) {
      return { ok: false, message: `Could not download: ${(error as Error).message}` };
    }
  }

  try {
    // Cache rather than documents: this file exists to be handed straight to the share sheet,
    // and leaving copies in documents accumulates exports the user never asked to keep.
    //
    // SDK 55's file API is the File/Paths classes; the cacheDirectory string and
    // writeAsStringAsync moved to expo-file-system/legacy.
    const file = new File(Paths.cache, fileName);

    // Overwrite rather than fail when an export from earlier today is still in the cache.
    file.create({ overwrite: true });
    file.write(contents);

    if (!(await Sharing.isAvailableAsync())) {
      // Saved but not shareable is still better than losing it, and saying where it went is the
      // difference between a usable fallback and an apparent failure.
      return { ok: true, message: `Saved to ${file.uri}` };
    }

    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'Export workout history' });
    return { ok: true, message: `Shared ${fileName}` };
  } catch (error) {
    return { ok: false, message: `Could not export: ${(error as Error).message}` };
  }
}

export async function exportJson(
  logs: WorkoutLog[],
  routines: Routine[],
  exercises: Exercise[],
): Promise<{ ok: boolean; message: string }> {
  const bundle = buildBundle(logs, routines, exercises);
  // Indented: an export is read by people at least as often as by programs.
  return deliver(JSON.stringify(bundle, null, 2), suggestedFileName('json'), 'application/json');
}

export async function exportCsv(logs: WorkoutLog[]): Promise<{ ok: boolean; message: string }> {
  return deliver(buildCsv(logs), suggestedFileName('csv'), 'text/csv');
}
