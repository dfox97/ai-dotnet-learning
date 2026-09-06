import {
  PROGRESS_STORAGE_KEY,
  exportProgress,
  parseProgress,
  serializeProgress,
  type LearnerProgress,
  type ProgressLoadResult,
} from './progress.ts';

export type ProgressStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

export type ImportPreview = {
  result: ProgressLoadResult;
  replacement: LearnerProgress | null;
  summary: {
    completedLessons: number;
    submittedReviews: number;
    completedPracticeActivities: number;
    baselineStatus: LearnerProgress['diagnostics']['baseline']['status'];
    postStatus: LearnerProgress['diagnostics']['post']['status'];
    capstoneStage: LearnerProgress['capstone']['stage'];
  } | null;
};

export function loadLearnerProgress(storage: Pick<ProgressStorage, 'getItem'>): ProgressLoadResult {
  return parseProgress(storage.getItem(PROGRESS_STORAGE_KEY));
}

export function saveLearnerProgress(
  storage: Pick<ProgressStorage, 'setItem'>,
  progress: LearnerProgress,
): void {
  storage.setItem(PROGRESS_STORAGE_KEY, serializeProgress(progress));
}

export function resetLearnerProgress(storage: ProgressStorage): void {
  if (storage.removeItem) {
    storage.removeItem(PROGRESS_STORAGE_KEY);
    return;
  }
  storage.setItem(PROGRESS_STORAGE_KEY, '');
}

function countCompletedPractice(progress: LearnerProgress): number {
  return [
    ...Object.values(progress.practice.patternBridge),
    ...Object.values(progress.practice.translationReview),
    ...Object.values(progress.practice.decisionLabs),
  ].filter((attempt) => attempt.status === 'completed').length;
}

export function previewLearnerProgressImport(raw: string): ImportPreview {
  const result = parseProgress(raw);
  if (result.status === 'recovery-required' || result.status === 'empty') {
    return { result, replacement: null, summary: null };
  }

  const progress = result.progress;
  return {
    result,
    replacement: progress,
    summary: {
      completedLessons: progress.lessons.completed.length,
      submittedReviews: Object.values(progress.lessons.reviews).filter((review) => review.submitted).length,
      completedPracticeActivities: countCompletedPractice(progress),
      baselineStatus: progress.diagnostics.baseline.status,
      postStatus: progress.diagnostics.post.status,
      capstoneStage: progress.capstone.stage,
    },
  };
}

export function confirmLearnerProgressImport(
  storage: Pick<ProgressStorage, 'setItem'>,
  preview: ImportPreview,
): LearnerProgress {
  if (!preview.replacement) {
    throw new Error('Cannot import ReviewLab progress that failed preview validation.');
  }
  saveLearnerProgress(storage, preview.replacement);
  return preview.replacement;
}

export function exportLearnerProgress(progress: LearnerProgress): string {
  return exportProgress(progress);
}
