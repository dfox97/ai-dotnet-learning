import assert from 'node:assert/strict';
import test from 'node:test';
import { baselineDiagnostic } from '../src/baseline-diagnostic.ts';
import {
  scoreDiagnostic,
  validateDiagnosticAssessment,
  type DiagnosticAssessment,
} from '../src/diagnostic-engine.ts';

function correctResponses(assessment: DiagnosticAssessment): Record<string, string> {
  return Object.fromEntries(
    assessment.questions.map((question) => [
      question.id,
      question.options.find((option) => option.isCorrect)!.id,
    ]),
  );
}

test('scores a complete perfect baseline deterministically', () => {
  const responses = correctResponses(baselineDiagnostic);
  const first = scoreDiagnostic(baselineDiagnostic, responses);
  const second = scoreDiagnostic(baselineDiagnostic, responses);

  assert.deepEqual(first, second);
  assert.equal(first.complete, true);
  assert.equal(first.score, 1);
  assert.deepEqual(first.criticalRisks, []);
  assert.equal(first.strengths.length, baselineDiagnostic.questions.length);
});

test('does not report an overall score for an interrupted diagnostic', () => {
  const firstQuestion = baselineDiagnostic.questions[0];
  const correct = firstQuestion.options.find((option) => option.isCorrect)!;
  const result = scoreDiagnostic(baselineDiagnostic, { [firstQuestion.id]: correct.id });

  assert.equal(result.complete, false);
  assert.equal(result.score, null);
  assert.equal(result.answered, 1);
  assert.equal(result.assessmentVersion, baselineDiagnostic.version);
});

test('records unresolved critical-risk competencies separately from ordinary gaps', () => {
  const responses = correctResponses(baselineDiagnostic);
  const cancellation = baselineDiagnostic.questions.find((question) => question.competencyId === 'cancellation')!;
  responses[cancellation.id] = cancellation.options.find((option) => !option.isCorrect)!.id;

  const result = scoreDiagnostic(baselineDiagnostic, responses);

  assert.equal(result.complete, true);
  assert.ok((result.score ?? 0) < 1);
  assert.ok(result.gaps.includes('cancellation'));
  assert.ok(result.criticalRisks.includes('cancellation'));
});

test('validates diagnostic authoring mistakes', () => {
  const broken: DiagnosticAssessment = {
    ...baselineDiagnostic,
    id: 'broken',
    questions: [
      {
        ...baselineDiagnostic.questions[0],
        id: 'duplicate',
      },
      {
        ...baselineDiagnostic.questions[1],
        id: 'duplicate',
      },
    ],
  };

  assert.throws(() => validateDiagnosticAssessment(broken), /duplicate question/);
});
