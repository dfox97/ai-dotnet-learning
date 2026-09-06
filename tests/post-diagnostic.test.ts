import assert from 'node:assert/strict';
import test from 'node:test';
import { baselineDiagnostic } from '../src/baseline-diagnostic.ts';
import { scoreDiagnostic } from '../src/diagnostic-engine.ts';
import { assessMastery, postDiagnostic } from '../src/post-diagnostic.ts';

function responses(assessment: typeof baselineDiagnostic, wrongCompetency?: string) {
  return Object.fromEntries(assessment.questions.map((question) => {
    const option = question.competencyId === wrongCompetency
      ? question.options.find((candidate) => !candidate.isCorrect)!
      : question.options.find((candidate) => candidate.isCorrect)!;
    return [question.id, option.id];
  }));
}

test('post assessment is separately authored but competency-equivalent', () => {
  assert.notEqual(postDiagnostic.id, baselineDiagnostic.id);
  assert.notEqual(postDiagnostic.scenario, baselineDiagnostic.scenario);

  const baselineCompetencies = baselineDiagnostic.questions.map((question) => question.competencyId).sort();
  const postCompetencies = postDiagnostic.questions.map((question) => question.competencyId).sort();
  assert.deepEqual(postCompetencies, baselineCompetencies);
});

test('awards mastery when the post score passes and no critical risk remains', () => {
  const baseline = scoreDiagnostic(baselineDiagnostic, responses(baselineDiagnostic, 'observability'));
  const post = scoreDiagnostic(postDiagnostic, responses(postDiagnostic as typeof baselineDiagnostic));
  const mastery = assessMastery(baseline, post);

  assert.equal(mastery.mastered, true);
  assert.ok((mastery.overallImprovement ?? 0) > 0);
  assert.deepEqual(mastery.unresolvedCriticalCompetencies, []);
});

test('blocks mastery when a critical competency is unresolved despite a passing overall score', () => {
  const baseline = scoreDiagnostic(baselineDiagnostic, responses(baselineDiagnostic, 'observability'));
  const post = scoreDiagnostic(postDiagnostic, responses(postDiagnostic as typeof baselineDiagnostic, 'tool-authority'));
  const mastery = assessMastery(baseline, post);

  assert.ok((post.score ?? 0) >= 0.75);
  assert.equal(mastery.mastered, false);
  assert.deepEqual(mastery.unresolvedCriticalCompetencies, ['tool-authority']);
  assert.deepEqual(mastery.remediationActivityIds, ['agentic-dotnet']);
});

test('does not award mastery for an interrupted post assessment', () => {
  const baseline = scoreDiagnostic(baselineDiagnostic, responses(baselineDiagnostic));
  const first = postDiagnostic.questions[0];
  const post = scoreDiagnostic(postDiagnostic, {
    [first.id]: first.options.find((option) => option.isCorrect)!.id,
  });
  const mastery = assessMastery(baseline, post);

  assert.equal(post.score, null);
  assert.equal(mastery.mastered, false);
  assert.equal(mastery.overallImprovement, null);
});
