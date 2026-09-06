import assert from 'node:assert/strict';
import test from 'node:test';
import { recommendLearningPath } from '../src/recommendations.ts';
import type { DiagnosticResult } from '../src/diagnostic-engine.ts';

function diagnostic(gaps: DiagnosticResult['gaps']): DiagnosticResult {
  return {
    assessmentId: 'baseline-production-review',
    assessmentVersion: 1,
    answered: 8,
    total: 8,
    score: 0.75,
    complete: true,
    competencyScores: {},
    strengths: [],
    gaps,
    criticalRisks: gaps.filter((id) => id === 'cancellation' || id === 'di-lifetime' || id === 'async-correctness' || id === 'idempotency' || id === 'tool-authority'),
  };
}

test('maps diagnostic gaps onto existing learning activities with reasons', () => {
  const result = recommendLearningPath(diagnostic(['cancellation', 'idempotency']));

  const automation = result.activities.find((activity) => activity.id === 'automation-production');
  assert.ok(automation);
  assert.deepEqual(automation.competencyIds.sort(), ['cancellation', 'idempotency']);
  assert.equal(automation.reasons.length, 2);
  assert.equal(result.capstoneReady, false);
});

test('keeps completed recommendations visible but distinguishes their status', () => {
  const result = recommendLearningPath(
    diagnostic(['persistence-query']),
    { completedActivityIds: ['data-sql'], masteredCompetencyIds: [] },
  );

  assert.equal(result.activities[0].id, 'data-sql');
  assert.equal(result.activities[0].status, 'completed');
});

test('removes recommendations once competency mastery evidence exists', () => {
  const result = recommendLearningPath(
    diagnostic(['di-lifetime']),
    { completedActivityIds: [], masteredCompetencyIds: ['di-lifetime'] },
  );

  assert.deepEqual(result.activities, []);
  assert.deepEqual(result.atRiskCompetencyIds, []);
  assert.equal(result.capstoneReady, true);
});

test('capstone readiness depends only on unresolved critical competencies', () => {
  const nonCriticalGap = recommendLearningPath(diagnostic(['observability']));
  const criticalGap = recommendLearningPath(diagnostic(['tool-authority']));

  assert.equal(nonCriticalGap.capstoneReady, true);
  assert.equal(criticalGap.capstoneReady, false);
  assert.deepEqual(criticalGap.criticalAtRiskCompetencyIds, ['tool-authority']);
});
