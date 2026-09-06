import type { DiagnosticProgress, LearnerProgress } from './progress.ts';

export type ReportDiagnostic = {
  status: DiagnosticProgress['status'];
  assessmentId: string | null;
  assessmentVersion: number | null;
  score: number | null;
  competencyScores: Record<string, number>;
  criticalRisks: string[];
};

export type LearningReportData = {
  progressVersion: number;
  diagnostics: {
    baseline: ReportDiagnostic;
    post: ReportDiagnostic;
  };
  competencyChanges: Record<string, number>;
  lessons: {
    completedIds: string[];
    submittedReviewIds: string[];
    timeSpentMinutes: number | null;
  };
  practice: {
    completedActivityIds: string[];
    timeSpentMinutes: number | null;
  };
  recommendations: LearnerProgress['recommendations'];
  reflections: LearnerProgress['reflections'];
  capstone: LearnerProgress['capstone'];
};

function diagnosticScore(diagnostic: DiagnosticProgress): number | null {
  if (diagnostic.status !== 'completed') return null;
  const scores = Object.values(diagnostic.competencyScores);
  if (scores.length === 0) return null;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function reportDiagnostic(diagnostic: DiagnosticProgress): ReportDiagnostic {
  return {
    status: diagnostic.status,
    assessmentId: diagnostic.assessmentId,
    assessmentVersion: diagnostic.assessmentVersion,
    score: diagnosticScore(diagnostic),
    competencyScores: { ...diagnostic.competencyScores },
    criticalRisks: [...diagnostic.criticalRisks],
  };
}

function practiceEvidence(progress: LearnerProgress) {
  const allAttempts = [
    ...Object.entries(progress.practice.patternBridge),
    ...Object.entries(progress.practice.translationReview),
    ...Object.entries(progress.practice.decisionLabs),
  ];
  const completedActivityIds = allAttempts
    .filter(([, attempt]) => attempt.status === 'completed')
    .map(([id]) => id);

  let knownMinutes = 0;
  let hasTimedAttempt = false;
  for (const [, attempt] of allAttempts) {
    if (!attempt.startedAt || !attempt.completedAt) continue;
    const start = Date.parse(attempt.startedAt);
    const end = Date.parse(attempt.completedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    knownMinutes += (end - start) / 60_000;
    hasTimedAttempt = true;
  }

  return {
    completedActivityIds,
    timeSpentMinutes: hasTimedAttempt ? Math.round(knownMinutes) : null,
  };
}

export function buildLearningReport(progress: LearnerProgress): LearningReportData {
  const baseline = reportDiagnostic(progress.diagnostics.baseline);
  const post = reportDiagnostic(progress.diagnostics.post);
  const competencyChanges = Object.fromEntries(
    Object.keys(baseline.competencyScores)
      .filter((id) => id in post.competencyScores)
      .map((id) => [id, post.competencyScores[id] - baseline.competencyScores[id]]),
  );

  return {
    progressVersion: progress.version,
    diagnostics: { baseline, post },
    competencyChanges,
    lessons: {
      completedIds: [...progress.lessons.completed],
      submittedReviewIds: Object.entries(progress.lessons.reviews)
        .filter(([, review]) => review.submitted)
        .map(([id]) => id),
      timeSpentMinutes: null,
    },
    practice: practiceEvidence(progress),
    recommendations: {
      activityIds: [...progress.recommendations.activityIds],
      masteredCompetencyIds: [...progress.recommendations.masteredCompetencyIds],
      atRiskCompetencyIds: [...progress.recommendations.atRiskCompetencyIds],
    },
    reflections: { ...progress.reflections },
    capstone: {
      ...progress.capstone,
      findings: { ...progress.capstone.findings },
      testEvidence: [...progress.capstone.testEvidence],
    },
  };
}

function scoreLabel(score: number | null): string {
  return score === null ? 'Not recorded' : `${Math.round(score * 100)}%`;
}

function listOrNone(values: string[]): string {
  return values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- None recorded';
}

export function exportLearningReportMarkdown(progress: LearnerProgress): string {
  const report = buildLearningReport(progress);
  const reflectionLines = Object.entries(report.reflections)
    .map(([id, reflection]) => `- **${id}:** ${reflection}`);

  return `# ReviewLab learning report

## Diagnostic evidence

- Baseline: ${scoreLabel(report.diagnostics.baseline.score)} (${report.diagnostics.baseline.status})
- Post-diagnostic: ${scoreLabel(report.diagnostics.post.score)} (${report.diagnostics.post.status})
- Unresolved critical risks: ${report.diagnostics.post.criticalRisks.length > 0 ? report.diagnostics.post.criticalRisks.join(', ') : 'None recorded'}

## Competency change

${Object.keys(report.competencyChanges).length > 0
    ? Object.entries(report.competencyChanges).map(([id, delta]) => `- ${id}: ${delta >= 0 ? '+' : ''}${Math.round(delta * 100)} percentage points`).join('\n')
    : '- No comparable diagnostic evidence recorded'}

## Learning activity

### Completed lessons
${listOrNone(report.lessons.completedIds)}

### Submitted reviews
${listOrNone(report.lessons.submittedReviewIds)}

### Practice activities
${listOrNone(report.practice.completedActivityIds)}

- Lesson time spent: ${report.lessons.timeSpentMinutes === null ? 'Not recorded by the current progress schema' : `${report.lessons.timeSpentMinutes} minutes`}
- Recorded practice time: ${report.practice.timeSpentMinutes === null ? 'Not recorded' : `${report.practice.timeSpentMinutes} minutes`}

## Reflections

${reflectionLines.length > 0 ? reflectionLines.join('\n') : '- None recorded'}

## Capstone

- Version: ${report.capstone.version ?? 'Not started'}
- Stage: ${report.capstone.stage}
- Test evidence entries: ${report.capstone.testEvidence.length}
- Reflection: ${report.capstone.reflection || 'Not recorded'}
`;
}

export function exportLearningReportJson(progress: LearnerProgress): string {
  return JSON.stringify(buildLearningReport(progress), null, 2);
}
