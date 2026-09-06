import assert from 'node:assert/strict';
import test from 'node:test';
import {
  completePracticeAttempt,
  markLessonCompleted,
  setCapstoneProgress,
  setDiagnosticProgress,
  setLessonReview,
  setRecommendationProgress,
  setReflection,
  startPracticeAttempt,
} from '../src/progress-operations.ts';
import { createEmptyProgress } from '../src/progress.ts';

test('updates lesson review and completion without mutating the previous document', () => {
  const initial = createEmptyProgress();
  const reviewed = setLessonReview(initial, 'async-reliability', {
    selected: [3], note: 'Cancellation is dropped.', submitted: true, quizAnswer: 1,
  });
  const completed = markLessonCompleted(reviewed, 'async-reliability');

  assert.deepEqual(initial.lessons.reviews, {});
  assert.deepEqual(initial.lessons.completed, []);
  assert.equal(completed.lessons.reviews['async-reliability'].submitted, true);
  assert.deepEqual(completed.lessons.completed, ['async-reliability']);
});

test('tracks practice attempts and timestamps across resume', () => {
  let progress = createEmptyProgress();
  progress = startPracticeAttempt(progress, 'patternBridge', 'di-lifetimes', '2026-09-06T10:00:00Z');
  progress = startPracticeAttempt(progress, 'patternBridge', 'di-lifetimes', '2026-09-06T10:02:00Z');
  progress = completePracticeAttempt(progress, 'patternBridge', 'di-lifetimes', '2026-09-06T10:10:00Z');

  assert.deepEqual(progress.practice.patternBridge['di-lifetimes'], {
    status: 'completed',
    startedAt: '2026-09-06T10:00:00Z',
    completedAt: '2026-09-06T10:10:00Z',
    attempts: 2,
  });
});

test('persists diagnostic, recommendation, reflection and capstone domains independently', () => {
  let progress = createEmptyProgress();
  progress = setDiagnosticProgress(progress, 'baseline', {
    assessmentId: 'baseline-production-review',
    assessmentVersion: 1,
    status: 'completed',
    responses: { q1: 'a' },
    competencyScores: { cancellation: 1 },
    criticalRisks: [],
  });
  progress = setRecommendationProgress(progress, {
    activityIds: ['data-sql'],
    masteredCompetencyIds: ['cancellation'],
    atRiskCompetencyIds: ['persistence-query'],
  });
  progress = setReflection(progress, 'async-reliability', 'Pass the token down every supported boundary.');
  progress = setCapstoneProgress(progress, {
    version: 1,
    stage: 'evidence',
    findings: { cancellation: 'Token dropped.' },
    testEvidence: [],
    reflection: '',
  });

  assert.equal(progress.diagnostics.baseline.status, 'completed');
  assert.deepEqual(progress.recommendations.activityIds, ['data-sql']);
  assert.equal(progress.reflections['async-reliability'], 'Pass the token down every supported boundary.');
  assert.equal(progress.capstone.stage, 'evidence');
});

test('cannot complete a practice activity that has no started attempt', () => {
  assert.throws(
    () => completePracticeAttempt(createEmptyProgress(), 'translationReview', 'singleton-translation', '2026-09-06T10:10:00Z'),
    /before it starts/i,
  );
});
