import assert from 'node:assert/strict';
import test from 'node:test';
import { baselineDiagnostic } from '../src/baseline-diagnostic.ts';
import { scoreDiagnostic } from '../src/diagnostic-engine.ts';
import { assessMastery, postDiagnostic, remediationVariants } from '../src/post-diagnostic.ts';

function responses(assessment: typeof baselineDiagnostic, wrongCompetency?: string) {
  return Object.fromEntries(assessment.questions.map((question) => {
    const option = question.competencyId === wrongCompetency
      ? question.options.find((candidate) => !candidate.isCorrect)!
      : question.options.find((candidate) => candidate.isCorrect)!;
    return [question.id, option.id];
  }));
}

test('post assessment is separately authored but rubric-equivalent', () => {
  assert.notEqual(postDiagnostic.id, baselineDiagnostic.id);
  assert.notEqual(postDiagnostic.scenario, baselineDiagnostic.scenario);
  assert.equal(postDiagnostic.questions.length, baselineDiagnostic.questions.length);

  const rubric = (assessment: typeof baselineDiagnostic) => assessment.questions
    .map(({ competencyId, critical }) => ({ competencyId, critical }))
    .sort((left, right) => left.competencyId.localeCompare(right.competencyId));

  assert.deepEqual(
    rubric(postDiagnostic as typeof baselineDiagnostic),
    rubric(baselineDiagnostic),
  );
});

test('awards mastery when the post score passes and no critical risk remains', () => {
  const baseline = scoreDiagnostic(baselineDiagnostic, responses(baselineDiagnostic, 'observability'));
  const post = scoreDiagnostic(postDiagnostic, responses(postDiagnostic as typeof baselineDiagnostic));
  const mastery = assessMastery(baseline, post);

  assert.equal(mastery.mastered, true);
  assert.ok((mastery.overallImprovement ?? 0) > 0);
  assert.deepEqual(mastery.unresolvedCriticalCompetencies, []);
  assert.deepEqual(mastery.remediationVariants, []);
});

test('blocks mastery when a critical competency is unresolved despite a passing overall score', () => {
  const baseline = scoreDiagnostic(baselineDiagnostic, responses(baselineDiagnostic, 'observability'));
  const post = scoreDiagnostic(postDiagnostic, responses(postDiagnostic as typeof baselineDiagnostic, 'tool-authority'));
  const mastery = assessMastery(baseline, post);

  assert.ok((post.score ?? 0) >= 0.75);
  assert.equal(mastery.mastered, false);
  assert.deepEqual(mastery.unresolvedCriticalCompetencies, ['tool-authority']);
  assert.deepEqual(mastery.remediationActivityIds, ['agentic-dotnet']);
  assert.deepEqual(mastery.remediationVariants, [remediationVariants['tool-authority']]);
  assert.match(mastery.remediationVariants[0].guidance, /deterministic policy/i);
});

test('compares baseline and post evidence by competency and overall score', () => {
  const baseline = scoreDiagnostic(baselineDiagnostic, responses(baselineDiagnostic, 'observability'));
  const post = scoreDiagnostic(postDiagnostic, responses(postDiagnostic as typeof baselineDiagnostic));
  const mastery = assessMastery(baseline, post);
  const observability = mastery.competencyChanges.find(({ competencyId }) => competencyId === 'observability');

  assert.deepEqual(observability, {
    competencyId: 'observability',
    baseline: 0,
    post: 1,
    delta: 1,
  });
  assert.equal(mastery.overallImprovement, 0.125);
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

test('every critical competency has authored remediation copy and a next activity', () => {
  const criticalCompetencies = postDiagnostic.questions
    .filter((question) => question.critical)
    .map((question) => question.competencyId);

  for (const competencyId of criticalCompetencies) {
    const variant = remediationVariants[competencyId];
    assert.ok(variant.title.trim());
    assert.ok(variant.guidance.trim());
    assert.ok(variant.activityIds.length > 0);
  }
});
