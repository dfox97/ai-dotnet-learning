import type { Finding } from './lesson-types.ts';

export type ReviewReasoningRubric = {
  line: number;
  expectedSeverity: Finding['severity'];
  riskCriterion: string;
  correctionCriterion: string;
};

export type ReviewReasoningRubricMap = Record<number, ReviewReasoningRubric>;

export function buildReviewReasoningRubric(finding: Finding): ReviewReasoningRubric {
  return {
    line: finding.line,
    expectedSeverity: finding.severity,
    riskCriterion: finding.explanation,
    correctionCriterion: finding.better,
  };
}

export function buildReviewReasoningRubrics(findings: Finding[]): ReviewReasoningRubricMap {
  return Object.fromEntries(
    findings.map((finding) => [finding.line, buildReviewReasoningRubric(finding)]),
  );
}
