import {
  completePracticeAttempt,
  startPracticeAttempt,
  type PracticeArea,
} from './progress-operations';
import { loadLearnerProgress, saveLearnerProgress } from './progress-store';

function now() {
  return new Date().toISOString();
}

export function ensurePracticeStarted(area: PracticeArea, activityId: string): void {
  const loaded = loadLearnerProgress(localStorage);
  if (loaded.status === 'recovery-required') return;
  const existing = loaded.progress.practice[area][activityId];
  if (existing?.status === 'in-progress' || existing?.status === 'completed') return;
  saveLearnerProgress(localStorage, startPracticeAttempt(loaded.progress, area, activityId, now()));
}

export function recordPracticeCompleted(area: PracticeArea, activityId: string): void {
  const loaded = loadLearnerProgress(localStorage);
  if (loaded.status === 'recovery-required') return;
  const existing = loaded.progress.practice[area][activityId];
  if (existing?.status === 'completed') return;
  const started = existing
    ? loaded.progress
    : startPracticeAttempt(loaded.progress, area, activityId, now());
  saveLearnerProgress(localStorage, completePracticeAttempt(started, area, activityId, now()));
}
