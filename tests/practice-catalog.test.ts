import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bridgePatterns,
  PracticeCatalogValidationError,
  resources,
  translationChallenges,
  validatePracticeAndReferenceCatalog,
} from '../src/practice-catalog.ts';

test('validated practice catalog exposes the authored learner content', () => {
  assert.ok(bridgePatterns.length > 0);
  assert.ok(translationChallenges.length > 0);
  assert.ok(resources.length > 0);
});

test('rejects bridge concepts that point outside their source code', () => {
  const pattern = bridgePatterns[0];
  const broken = {
    ...pattern,
    concepts: [{ ...pattern.concepts[0], csharpLines: [9999] }],
  };

  assert.throws(
    () => validatePracticeAndReferenceCatalog({
      bridgePatterns: [broken],
      translationChallenges,
      resources,
    }),
    (error: unknown) => error instanceof PracticeCatalogValidationError
      && error.issues.some((issue) => issue.includes('invalid C# line 9999')),
  );
});

test('rejects translation findings outside generated code', () => {
  const challenge = translationChallenges[0];
  const broken = {
    ...challenge,
    findings: [{ ...challenge.findings[0], line: 9999 }],
  };

  assert.throws(
    () => validatePracticeAndReferenceCatalog({
      bridgePatterns,
      translationChallenges: [broken],
      resources,
    }),
    /invalid generated line 9999/,
  );
});

test('rejects unsafe or malformed resource URLs', () => {
  const broken = { ...resources[0], url: 'http://example.test/guide' };

  assert.throws(
    () => validatePracticeAndReferenceCatalog({
      bridgePatterns,
      translationChallenges,
      resources: [broken],
    }),
    /must use an HTTPS URL/,
  );
});
