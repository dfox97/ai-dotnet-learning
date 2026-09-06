import assert from 'node:assert/strict';
import test from 'node:test';
import type { Finding } from '../src/content.ts';
import {
  evaluateStructuredReview,
  migrateLineOnlyReview,
  objectiveReviewScore,
  type StructuredReviewAttempt,
} from '../src/review-reasoning.ts';
import { buildReviewReasoningRubric } from '../src/review-rubric.ts';

const expected: Finding[] = [
  {
    line: 3,
    title: 'Cancellation is dropped',
    severity: 'blocker',
    explanation: 'The caller token is not propagated through I/O.',
    better: 'Pass the token to supported async operations.',
  },
  {
    line: 7,
    title: 'Audit evidence is missing',
    severity: 'warning',
    explanation: 'The outcome cannot be correlated operationally.',
    better: 'Record a structured outcome with the job id.',
  },
];

test('migrates existing line-only attempts without losing selected lines or notes', () => {
  const migrated = migrateLineOnlyReview({
    selected: [3],
    note: 'This work cannot stop safely.',
    submitted: true,
    quizAnswer: 1,
  }, expected);

  assert.equal(migrated.findings.length, 1);
  assert.equal(migrated.findings[0].line, 3);
  assert.equal(migrated.findings[0].risk, 'This work cannot stop safely.');
  assert.equal(migrated.findings[0].reasoningAssessment, 'not-assessed');
  assert.equal(migrated.submitted, true);
});

test('distinguishes misses, false positives, severity disagreement and incomplete reasoning', () => {
  const attempt: StructuredReviewAttempt = {
    submitted: true,
    quizAnswer: null,
    findings: [
      {
        line: 3,
        severity: 'warning',
        risk: 'Cancellation is ignored.',
        correction: '',
        reasoningAssessment: 'partial',
      },
      {
        line: 99,
        severity: 'suggestion',
        risk: 'I would rename this.',
        correction: 'Use another name.',
        reasoningAssessment: 'meets',
      },
    ],
  };

  const feedback = evaluateStructuredReview(expected, attempt);

  assert.deepEqual(feedback.matchedLines, [3]);
  assert.deepEqual(feedback.missedLines, [7]);
  assert.deepEqual(feedback.falsePositiveLines, [99]);
  assert.deepEqual(feedback.severityDisagreements, [{ line: 3, expected: 'blocker', actual: 'warning' }]);
  assert.deepEqual(feedback.incompleteReasoningLines, [3]);
  assert.deepEqual(feedback.retryConceptLines, [7, 3]);
});

test('scores only objective review evidence', () => {
  const attempt: StructuredReviewAttempt = {
    submitted: true,
    quizAnswer: null,
    findings: expected.map((finding) => ({
      line: finding.line,
      severity: finding.severity,
      risk: '',
      correction: '',
      reasoningAssessment: 'not-assessed',
    })),
  };
  const feedback = evaluateStructuredReview(expected, attempt);

  assert.equal(objectiveReviewScore(feedback, expected.length), 1);
  assert.deepEqual(feedback.incompleteReasoningLines, [3, 7]);
});

test('exposes the authored production concern as a transparent self-assessment rubric', () => {
  assert.deepEqual(buildReviewReasoningRubric(expected[0]), {
    line: 3,
    expectedSeverity: 'blocker',
    riskCriterion: 'The caller token is not propagated through I/O.',
    correctionCriterion: 'Pass the token to supported async operations.',
  });
});
