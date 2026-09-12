import assert from 'node:assert/strict';
import test from 'node:test';
import type { ContractFinding } from '../src/content-contract.ts';
import { retryConceptIds } from '../src/review-guidance.ts';
import type { ReviewFeedback } from '../src/review-reasoning.ts';

const findings: ContractFinding[] = [
  {
    id: 'finding-1',
    line: 3,
    title: 'Cancellation is dropped',
    severity: 'blocker',
    explanation: 'The caller token is not propagated through I/O.',
    better: 'Pass the token to supported async operations.',
    conceptIds: ['async-cancellation', 'io-boundaries'],
  },
  {
    id: 'finding-2',
    line: 7,
    title: 'Audit evidence is missing',
    severity: 'warning',
    explanation: 'The outcome cannot be correlated operationally.',
    better: 'Record a structured outcome with the job id.',
    conceptIds: ['observability', 'io-boundaries'],
  },
];

test('returns only concepts connected to findings that need retry guidance', () => {
  const feedback: ReviewFeedback = {
    matchedLines: [3],
    missedLines: [7],
    falsePositiveLines: [],
    severityDisagreements: [],
    incompleteReasoningLines: [3],
    retryConceptLines: [7, 3],
  };

  assert.deepEqual(retryConceptIds(feedback, findings), [
    'async-cancellation',
    'io-boundaries',
    'observability',
  ]);
});

test('does not disclose unrelated concepts when no retry is required', () => {
  const feedback: ReviewFeedback = {
    matchedLines: [3, 7],
    missedLines: [],
    falsePositiveLines: [],
    severityDisagreements: [],
    incompleteReasoningLines: [],
    retryConceptLines: [],
  };

  assert.deepEqual(retryConceptIds(feedback, findings), []);
});
