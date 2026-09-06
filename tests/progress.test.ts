import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PROGRESS_VERSION,
  createEmptyProgress,
  exportProgress,
  parseProgress,
  previewProgressImport,
  serializeProgress,
} from '../src/progress.ts';

test('migrates the existing lesson-only progress without losing learner data', () => {
  const legacy = JSON.stringify({
    completed: ['csharp-foundations'],
    reviews: {
      'csharp-foundations': {
        selected: [1, 3],
        note: 'Prefer value semantics here.',
        submitted: true,
        quizAnswer: 1,
      },
    },
  });

  const result = parseProgress(legacy);
  assert.equal(result.status, 'migrated');
  assert.deepEqual(result.progress.lessons.completed, ['csharp-foundations']);
  assert.equal(result.progress.lessons.reviews['csharp-foundations'].note, 'Prefer value semantics here.');
  assert.equal(result.progress.version, PROGRESS_VERSION);
});

test('migrates the previous versioned progress format into the complete schema', () => {
  const previous = JSON.stringify({
    version: 1,
    lessons: {
      completed: ['compiler-nullability'],
      reviews: {},
    },
    practice: {},
    diagnostics: {},
    recommendations: {},
    reflections: { 'compiler-nullability': 'Keep nullability enabled.' },
    capstone: {},
  });

  const result = parseProgress(previous);
  assert.equal(result.status, 'migrated');
  assert.equal(result.progress.version, PROGRESS_VERSION);
  assert.deepEqual(result.progress.lessons.completed, ['compiler-nullability']);
  assert.equal(result.progress.reflections['compiler-nullability'], 'Keep nullability enabled.');
  assert.deepEqual(result.progress.practice.patternBridge, {});
  assert.equal(result.progress.diagnostics.baseline.status, 'not-started');
  assert.equal(result.progress.capstone.stage, 'not-started');
});

test('round-trips complete learner journey state', () => {
  const progress = createEmptyProgress();
  progress.lessons.completed.push('compiler-nullability');
  progress.reflections['compiler-nullability'] = 'Nullable flow analysis is clearer now.';
  progress.practice.patternBridge['di-lifetimes'] = {
    status: 'completed',
    startedAt: '2026-09-06T09:00:00.000Z',
    completedAt: '2026-09-06T09:10:00.000Z',
    attempts: 1,
  };
  progress.diagnostics.baseline = {
    assessmentId: 'baseline-a',
    assessmentVersion: 1,
    status: 'completed',
    responses: { cancellation: 'blocker' },
    competencyScores: { cancellation: 1 },
    criticalRisks: [],
  };
  progress.recommendations.activityIds = ['compiler-nullability'];
  progress.capstone.stage = 'review';
  progress.capstone.version = 1;

  const result = parseProgress(serializeProgress(progress));
  assert.equal(result.status, 'loaded');
  assert.deepEqual(result.progress, progress);
});

test('fails safely for corrupt progress instead of throwing', () => {
  const result = parseProgress('{ definitely-not-json');
  assert.equal(result.status, 'recovery-required');
  assert.match(result.reason, /not valid JSON/);
  assert.deepEqual(result.progress, createEmptyProgress());
});

test('rejects progress written by an unsupported future schema', () => {
  const result = parseProgress(JSON.stringify({ version: PROGRESS_VERSION + 1 }));
  assert.equal(result.status, 'recovery-required');
  assert.match(result.reason, /unsupported future version/);
});

test('exported progress can be previewed before replacement', () => {
  const progress = createEmptyProgress();
  progress.lessons.completed.push('csharp-foundations');

  const exported = exportProgress(progress);
  const preview = previewProgressImport(exported);

  assert.equal(preview.status, 'loaded');
  assert.deepEqual(preview.progress.lessons.completed, ['csharp-foundations']);
});
