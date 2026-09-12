import assert from 'node:assert/strict';
import test from 'node:test';
import {
  completePracticeAttempt,
  markLessonCompleted,
  setCapstoneProgress,
  setDiagnosticProgress,
  setLessonReview,
  setPostDiagnosticAttempt,
  setRecommendationProgress,
  setReflection,
  startPostDiagnosticAttempt,
  startPracticeAttempt,
} from '../src/progress-operations.ts';
import { createEmptyProgress } from '../src/progress.ts';

test('updates lesson review, timing and completion without mutating the previous document', () => {
  const initial = createEmptyProgress();
  const reviewed = setLessonReview(initial, 'async-reliability', {
    selected: [3], note: 'Cancellation is dropped.', submitted: true, quizAnswer: 1,
  });
  const completed = markLessonCompleted(reviewed, 'async-reliability');

  assert.deepEqual(initial.lessons.reviews, {});
  assert.deepEqual(initial.lessons.completed, []);
  assert.deepEqual(initial.lessons.attempts, {});
  assert.equal(reviewed.lessons.attempts['async-reliability'].status, 'in-progress');
  assert.ok(reviewed.lessons.attempts['async-reliability'].startedAt);
  assert.equal(completed.lessons.reviews['async-reliability'].submitted, true);
  assert.deepEqual(completed.lessons.completed, ['async-reliability']);
  assert.equal(completed.lessons.attempts['async-reliability'].status, 'completed');
  assert.ok(completed.lessons.attempts['async-reliability'].completedAt);
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
    mastery: {
      status: 'not-assessed',
      criticalCompetenciesMet: [],
      unresolvedCriticalCompetencies: [],
    },
  });

  assert.equal(progress.diagnostics.baseline.status, 'completed');
  assert.deepEqual(progress.recommendations.activityIds, ['data-sql']);
  assert.equal(progress.reflections['async-reliability'], 'Pass the token down every supported boundary.');
  assert.equal(progress.capstone.stage, 'evidence');
});

test('preserves original post-diagnostic evidence across repeat remediation attempts', () => {
  const original = {
    assessmentId: 'post-production-review',
    assessmentVersion: 1,
    status: 'completed' as const,
    responses: { 'post-tool': 'prompt-hard' },
    competencyScores: { 'tool-authority': 0 },
    criticalRisks: ['tool-authority'],
  };
  const corrected = {
    assessmentId: 'post-production-review',
    assessmentVersion: 1,
    status: 'completed' as const,
    responses: { 'post-tool': 'policy-boundary' },
    competencyScores: { 'tool-authority': 1 },
    criticalRisks: [],
  };

  let progress = setDiagnosticProgress(createEmptyProgress(), 'post', original);
  progress = startPostDiagnosticAttempt(progress);
  progress = setPostDiagnosticAttempt(progress, corrected);

  assert.deepEqual(progress.diagnostics.post, original);
  assert.deepEqual(progress.diagnostics.postAttempts, [corrected]);

  const next = startPostDiagnosticAttempt(progress);
  assert.deepEqual(next.diagnostics.post, original);
  assert.deepEqual(next.diagnostics.postAttempts[0], corrected);
  assert.equal(next.diagnostics.postAttempts[1].status, 'not-started');
});

test('cannot start post-diagnostic remediation before original evidence exists', () => {
  assert.throws(
    () => startPostDiagnosticAttempt(createEmptyProgress()),
    /original post-diagnostic is complete/i,
  );
});

test('cannot complete a practice activity that has no started attempt', () => {
  assert.throws(
    () => completePracticeAttempt(createEmptyProgress(), 'translationReview', 'singleton-translation', '2026-09-06T10:10:00Z'),
    /before it starts/i,
  );
});
