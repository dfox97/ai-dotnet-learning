import type { Finding } from './lesson-types.ts';

export type ReviewReasoningRubric = {
  line: number;
  expectedSeverity: Finding['severity'];
  riskCriterion: string;
  correctionCriterion: string;
};

export function buildReviewReasoningRubric(finding: Finding): ReviewReasoningRubric {
  return {
    line: finding.line,
    expectedSeverity: finding.severity,
    riskCriterion: finding.explanation,
    correctionCriterion: finding.better,
  };
}
