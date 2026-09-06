import assert from 'node:assert/strict';
import test from 'node:test';
import {
  confirmLearnerProgressImport,
  exportLearnerProgress,
  loadLearnerProgress,
  previewLearnerProgressImport,
  saveLearnerProgress,
} from '../src/progress-store.ts';
import { createEmptyProgress, PROGRESS_STORAGE_KEY } from '../src/progress.ts';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
    removeItem(key: string) { values.delete(key); },
  };
}

test('loads and saves the versioned progress document through one storage key', () => {
  const storage = memoryStorage();
  const progress = createEmptyProgress();
  progress.lessons.completed.push('async-reliability');

  saveLearnerProgress(storage, progress);
  const loaded = loadLearnerProgress(storage);

  assert.equal(loaded.status, 'loaded');
  assert.deepEqual(loaded.progress.lessons.completed, ['async-reliability']);
  assert.ok(storage.values.has(PROGRESS_STORAGE_KEY));
});

test('previewing an import does not replace current progress', () => {
  const current = createEmptyProgress();
  current.lessons.completed.push('csharp-foundations');
  const storage = memoryStorage({ [PROGRESS_STORAGE_KEY]: JSON.stringify(current) });

  const imported = createEmptyProgress();
  imported.lessons.completed.push('async-reliability');
  const preview = previewLearnerProgressImport(exportLearnerProgress(imported));

  assert.deepEqual(loadLearnerProgress(storage).progress.lessons.completed, ['csharp-foundations']);
  assert.deepEqual(preview.summary?.completedLessons, 1);

  confirmLearnerProgressImport(storage, preview);
  assert.deepEqual(loadLearnerProgress(storage).progress.lessons.completed, ['async-reliability']);
});

test('refuses corrupt imports before they can overwrite storage', () => {
  const storage = memoryStorage();
  const preview = previewLearnerProgressImport('{not json');

  assert.equal(preview.replacement, null);
  assert.throws(() => confirmLearnerProgressImport(storage, preview), /failed preview validation/i);
  assert.equal(storage.getItem(PROGRESS_STORAGE_KEY), null);
});

test('import preview summarizes journey impact for explicit confirmation UI', () => {
  const progress = createEmptyProgress();
  progress.lessons.completed.push('async-reliability');
  progress.lessons.reviews['async-reliability'] = { selected: [3], note: '', submitted: true, quizAnswer: 1 };
  progress.practice.patternBridge['di-lifetimes'] = {
    status: 'completed', startedAt: '2026-09-06T10:00:00Z', completedAt: '2026-09-06T10:05:00Z', attempts: 1,
  };
  progress.diagnostics.baseline.status = 'completed';
  progress.capstone.stage = 'repair';

  const preview = previewLearnerProgressImport(exportLearnerProgress(progress));
  assert.deepEqual(preview.summary, {
    completedLessons: 1,
    submittedReviews: 1,
    completedPracticeActivities: 1,
    baselineStatus: 'completed',
    postStatus: 'not-started',
    capstoneStage: 'repair',
  });
});
