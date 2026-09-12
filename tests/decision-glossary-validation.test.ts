import assert from 'node:assert/strict';
import test from 'node:test';
import { glossary } from '../src/content.ts';
import {
  PracticeReferenceValidationError,
  validateDecisionLab,
  validateDecisionLabs,
  validateGlossary,
} from '../src/decision-glossary-validation.ts';
import { validatedLessons as lessons } from '../src/lesson-catalog.ts';

test('validates every authored decision lab and glossary entry', () => {
  const labs = validateDecisionLabs(lessons);
  const entries = validateGlossary(glossary);

  assert.ok(labs.length > 0);
  assert.equal(entries.length, glossary.length);
});

test('decision labs require exactly one correct option', () => {
  const source = lessons.find((lesson) => lesson.decisionLab)?.decisionLab;
  assert.ok(source);

  const invalid = {
    ...source,
    options: source.options.map((option) => ({ ...option, correct: false })),
  };

  assert.throws(
    () => validateDecisionLab('test-lesson', invalid),
    (error: unknown) => error instanceof PracticeReferenceValidationError
      && error.issues.some((issue) => issue.includes('exactly one correct option')),
  );
});

test('glossary rejects blank and duplicate terms', () => {
  assert.throws(
    () => validateGlossary([
      ['CLR', 'Runtime'],
      [' clr ', 'Duplicate runtime entry'],
      ['', 'Missing term'],
    ]),
    (error: unknown) => error instanceof PracticeReferenceValidationError
      && error.issues.some((issue) => issue.includes('duplicate glossary term'))
      && error.issues.some((issue) => issue.includes('term is required')),
  );
});
