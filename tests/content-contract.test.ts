import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ContentValidationError,
  type LessonContentContract,
  validateLessonCollection,
  validateLessonContent,
} from '../src/content-contract.ts';

function lesson(overrides: Partial<LessonContentContract> = {}): LessonContentContract {
  return {
    id: 'lesson-one',
    number: '01',
    order: 1,
    title: 'Lesson one',
    eyebrow: 'Foundation',
    duration: '10 min',
    difficulty: 'Foundation',
    summary: 'Summary',
    outcome: 'Outcome',
    concepts: [
      { id: 'concept-one', title: 'Concept', body: 'Body', node: 'Bridge' },
    ],
    callout: { label: 'Note', title: 'Callout', body: 'Body' },
    fileName: 'Example.cs',
    code: 'line one\nline two',
    prompt: 'Review the sample.',
    findings: [
      {
        id: 'finding-one',
        line: 2,
        title: 'Finding',
        severity: 'warning',
        explanation: 'Explanation',
        better: 'Better approach',
        conceptIds: ['concept-one'],
      },
    ],
    quiz: {
      question: 'Question?',
      options: ['A', 'B'],
      answer: 1,
      explanation: 'Because B.',
      competencyIds: ['competency-one'],
    },
    competencies: [
      { id: 'competency-one', title: 'Competency', description: 'Description' },
    ],
    criticality: 'foundation',
    assessment: {
      competencyIds: ['competency-one'],
      requiredFindingIds: ['finding-one'],
    },
    ...overrides,
  };
}

test('accepts a valid lesson contract', () => {
  const candidate = lesson();
  assert.equal(validateLessonContent(candidate), candidate);
});

test('rejects an invalid quiz answer with an author-friendly message', () => {
  assert.throws(
    () => validateLessonContent(lesson({ quiz: { ...lesson().quiz, answer: 3 } })),
    (error: unknown) => {
      assert.ok(error instanceof ContentValidationError);
      assert.match(error.message, /quiz answer 3 is outside the available option range 0-1/);
      return true;
    },
  );
});

test('rejects finding line references outside the code sample', () => {
  const candidate = lesson();
  candidate.findings[0] = { ...candidate.findings[0], line: 5 };

  assert.throws(
    () => validateLessonContent(candidate),
    /finding "finding-one" points to line 5, but the sample has 2 lines/,
  );
});

test('rejects broken internal references', () => {
  const candidate = lesson();
  candidate.assessment = { ...candidate.assessment, requiredFindingIds: ['missing-finding'] };

  assert.throws(
    () => validateLessonContent(candidate),
    /assessment references unknown id "missing-finding"/,
  );
});

test('rejects duplicate lesson identifiers in a collection', () => {
  assert.throws(
    () => validateLessonCollection([lesson(), lesson({ order: 2 })]),
    /duplicate lesson id "lesson-one"/,
  );
});
