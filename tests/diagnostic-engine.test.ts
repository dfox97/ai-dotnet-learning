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

test('baseline is a versioned unseen production scenario covering named competencies', () => {
  assert.equal(baselineDiagnostic.id, 'baseline-production-review');
  assert.equal(baselineDiagnostic.version, 1);
  assert.equal(baselineDiagnostic.questions.length, 8);
  assert.match(baselineDiagnostic.scenario, /unseen production review/i);
  assert.deepEqual(
    new Set(baselineDiagnostic.questions.map((question) => question.competencyId)),
    new Set([
      'nullability',
      'cancellation',
      'di-lifetime',
      'async-correctness',
      'persistence-query',
      'idempotency',
      'observability',
      'tool-authority',
    ]),
  );
});

test('scores a complete perfect baseline deterministically', () => {
  const responses = correctResponses(baselineDiagnostic);
  const first = scoreDiagnostic(baselineDiagnostic, responses);
  const second = scoreDiagnostic(baselineDiagnostic, responses);

  assert.deepEqual(first, second);
  assert.equal(first.complete, true);
  assert.equal(first.score, 1);
  assert.deepEqual(first.criticalRisks, []);
  assert.equal(first.strengths.length, 8);
  assert.deepEqual(first.gaps, []);
});

test('does not manufacture an overall score for an interrupted diagnostic', () => {
  const firstQuestion = baselineDiagnostic.questions[0];
  const correct = firstQuestion.options.find((option) => option.isCorrect)!;
  const result = scoreDiagnostic(baselineDiagnostic, { [firstQuestion.id]: correct.id });

  assert.equal(result.complete, false);
  assert.equal(result.score, null);
  assert.equal(result.answered, 1);
  assert.equal(result.total, 8);
  assert.equal(result.assessmentId, baselineDiagnostic.id);
  assert.equal(result.assessmentVersion, baselineDiagnostic.version);
});

test('records unresolved critical-risk competencies separately from ordinary gaps', () => {
  const responses = correctResponses(baselineDiagnostic);
  const cancellation = baselineDiagnostic.questions.find((question) => question.competencyId === 'cancellation')!;
  const toolAuthority = baselineDiagnostic.questions.find((question) => question.competencyId === 'tool-authority')!;
  responses[cancellation.id] = cancellation.options.find((option) => !option.isCorrect)!.id;
  responses[toolAuthority.id] = toolAuthority.options.find((option) => !option.isCorrect)!.id;

  const result = scoreDiagnostic(baselineDiagnostic, responses);

  assert.equal(result.complete, true);
  assert.equal(result.score, 0.75);
  assert.ok(result.gaps.includes('cancellation'));
  assert.ok(result.gaps.includes('tool-authority'));
  assert.deepEqual(new Set(result.criticalRisks), new Set(['cancellation', 'tool-authority']));
});

test('validates diagnostic authoring mistakes', () => {
  const duplicateQuestions: DiagnosticAssessment = {
    ...baselineDiagnostic,
    id: 'broken-duplicate',
    questions: [
      { ...baselineDiagnostic.questions[0], id: 'duplicate' },
      { ...baselineDiagnostic.questions[1], id: 'duplicate' },
    ],
  };

  const ambiguousAnswer: DiagnosticAssessment = {
    ...baselineDiagnostic,
    id: 'broken-answer',
    questions: [{
      ...baselineDiagnostic.questions[0],
      options: baselineDiagnostic.questions[0].options.map((option) => ({ ...option, isCorrect: true })),
    }],
  };

  assert.throws(() => validateDiagnosticAssessment(duplicateQuestions), /duplicate question/);
  assert.throws(() => validateDiagnosticAssessment(ambiguousAnswer), /exactly one correct option/);
});
