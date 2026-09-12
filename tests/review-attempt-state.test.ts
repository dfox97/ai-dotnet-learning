import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addReviewFinding,
  createStructuredReviewAttempt,
  removeReviewFinding,
  setReviewQuizAnswer,
  submitStructuredReviewAttempt,
  updateReviewFinding,
} from '../src/review-attempt-state.ts';

test('captures line, severity, risk and correction for a structured finding', () => {
  let attempt = createStructuredReviewAttempt();
  attempt = addReviewFinding(attempt, 12, 'blocker');
  attempt = updateReviewFinding(attempt, 12, {
    risk: 'The side effect can run twice after redelivery.',
    correction: 'Add a durable idempotency boundary.',
    reasoningAssessment: 'meets',
  });

  assert.deepEqual(attempt.findings, [{
    line: 12,
    severity: 'blocker',
    risk: 'The side effect can run twice after redelivery.',
    correction: 'Add a durable idempotency boundary.',
    reasoningAssessment: 'meets',
  }]);
});

test('keeps findings unique, sorted and editable before resubmission', () => {
  let attempt = createStructuredReviewAttempt();
  attempt = addReviewFinding(attempt, 8);
  attempt = addReviewFinding(attempt, 3, 'suggestion');
  attempt = addReviewFinding(attempt, 8, 'blocker');
  attempt = submitStructuredReviewAttempt(attempt);
  attempt = updateReviewFinding(attempt, 3, { severity: 'warning' });

  assert.deepEqual(attempt.findings.map(({ line }) => line), [3, 8]);
  assert.equal(attempt.findings[0].severity, 'warning');
  assert.equal(attempt.submitted, false);
});

test('supports removing findings and changing quiz answers without mutating prior state', () => {
  const original = addReviewFinding(createStructuredReviewAttempt(), 5);
  const answered = setReviewQuizAnswer(original, 2);
  const removed = removeReviewFinding(answered, 5);

  assert.equal(original.quizAnswer, null);
  assert.equal(original.findings.length, 1);
  assert.equal(answered.quizAnswer, 2);
  assert.equal(removed.findings.length, 0);
});
