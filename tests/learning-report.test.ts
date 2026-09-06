import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLearningReport,
  exportLearningReportJson,
  exportLearningReportMarkdown,
} from '../src/learning-report.ts';
import { createEmptyProgress } from '../src/progress.ts';

test('reports incomplete activity honestly instead of inventing zero scores', () => {
  const progress = createEmptyProgress();
  const report = buildLearningReport(progress);

  assert.equal(report.diagnostics.baseline.score, null);
  assert.equal(report.diagnostics.post.score, null);
  assert.deepEqual(report.competencyChanges, {});
  assert.equal(report.lessons.timeSpentMinutes, null);
  assert.equal(report.practice.timeSpentMinutes, null);
});

test('only compares competencies measured in both diagnostics', () => {
  const progress = createEmptyProgress();
  progress.diagnostics.baseline.status = 'completed';
  progress.diagnostics.baseline.competencyScores = { cancellation: 0, observability: 1 };
  progress.diagnostics.post.status = 'completed';
  progress.diagnostics.post.competencyScores = { cancellation: 1, idempotency: 1 };

  const report = buildLearningReport(progress);

  assert.deepEqual(report.competencyChanges, { cancellation: 1 });
  assert.equal(report.diagnostics.baseline.score, 0.5);
  assert.equal(report.diagnostics.post.score, 1);
});

test('includes lesson, practice, reflection and capstone evidence in documented JSON', () => {
  const progress = createEmptyProgress();
  progress.lessons.completed.push('async-reliability');
  progress.lessons.reviews['async-reliability'] = {
    selected: [3], note: 'Cancellation was dropped.', submitted: true, quizAnswer: 1,
  };
  progress.practice.patternBridge['di-lifetimes'] = {
    status: 'completed',
    startedAt: '2026-09-06T10:00:00.000Z',
    completedAt: '2026-09-06T10:12:00.000Z',
    attempts: 1,
  };
  progress.reflections['async-reliability'] = 'Propagate the token through every supported I/O boundary.';
  progress.capstone.version = 1;
  progress.capstone.stage = 'completed';
  progress.capstone.testEvidence.push('dotnet test: passed');
  progress.capstone.reflection = 'Idempotency belongs at the side-effect boundary.';

  const parsed = JSON.parse(exportLearningReportJson(progress));
  assert.deepEqual(parsed.lessons.completedIds, ['async-reliability']);
  assert.deepEqual(parsed.practice.completedActivityIds, ['di-lifetimes']);
  assert.equal(parsed.practice.timeSpentMinutes, 12);
  assert.equal(parsed.capstone.stage, 'completed');
});

test('keeps the readable Markdown report structure stable', () => {
  const markdown = exportLearningReportMarkdown(createEmptyProgress());

  assert.match(markdown, /^# ReviewLab learning report/m);
  assert.match(markdown, /## Diagnostic evidence/);
  assert.match(markdown, /## Competency change/);
  assert.match(markdown, /## Learning activity/);
  assert.match(markdown, /## Reflections/);
  assert.match(markdown, /## Capstone/);
  assert.match(markdown, /Not recorded by the current progress schema/);
});
