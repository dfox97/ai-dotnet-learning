import assert from 'node:assert/strict';
import test from 'node:test';
import { bridgePatterns, translationChallenges } from '../src/patterns.ts';
import { resources } from '../src/resources.ts';
import { validatePracticeAndReferenceContent } from '../src/practice-reference-contract.ts';

test('validates all authored practice and reference content', () => {
  assert.doesNotThrow(() => validatePracticeAndReferenceContent());
});

test('keeps stable identifiers and reference inventory intact', () => {
  assert.deepEqual(
    bridgePatterns.map((pattern) => pattern.id),
    ['di-lifetimes', 'rest-endpoint', 'validation', 'async-cancellation', 'data-query', 'background-worker'],
  );
  assert.ok(translationChallenges.length > 0);
  assert.ok(resources.length > 0);
});
