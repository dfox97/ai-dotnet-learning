import type { Finding } from './content.ts';
import type { ReviewState } from './progress.ts';

export type ReviewSeverity = Finding['severity'];

export type StructuredReviewFinding = {
  line: number;
  severity: ReviewSeverity;
  risk: string;
  correction: string;
  reasoningAssessment: 'not-assessed' | 'partial' | 'meets';
};

export type ReviewFeedback = {
  matchedLines: number[];
  missedLines: number[];
  falsePositiveLines: number[];
  severityDisagreements: Array<{
    line: number;
    expected: ReviewSeverity;
    actual: ReviewSeverity;
  }>;
  incompleteReasoningLines: number[];
  retryConceptLines: number[];
};

export type StructuredReviewAttempt = {
  findings: StructuredReviewFinding[];
  submitted: boolean;
  quizAnswer: number | null;
};

export function migrateLineOnlyReview(
  legacy: ReviewState,
  expectedFindings: Finding[],
): StructuredReviewAttempt {
  return {
    findings: legacy.selected.map((line) => {
      const expected = expectedFindings.find((finding) => finding.line === line);
      return {
        line,
        severity: expected?.severity ?? 'warning',
        risk: legacy.note,
        correction: '',
        reasoningAssessment: 'not-assessed',
      };
    }),
    submitted: legacy.submitted,
    quizAnswer: legacy.quizAnswer,
  };
}

export function evaluateStructuredReview(
  expectedFindings: Finding[],
  attempt: StructuredReviewAttempt,
): ReviewFeedback {
  const expectedByLine = new Map(expectedFindings.map((finding) => [finding.line, finding]));
  const actualByLine = new Map(attempt.findings.map((finding) => [finding.line, finding]));
  const matchedLines: number[] = [];
  const missedLines: number[] = [];
  const falsePositiveLines: number[] = [];
  const severityDisagreements: ReviewFeedback['severityDisagreements'] = [];
  const incompleteReasoningLines: number[] = [];

  for (const expected of expectedFindings) {
    const actual = actualByLine.get(expected.line);
    if (!actual) {
      missedLines.push(expected.line);
      continue;
    }

    matchedLines.push(expected.line);
    if (actual.severity !== expected.severity) {
      severityDisagreements.push({
        line: expected.line,
        expected: expected.severity,
        actual: actual.severity,
      });
    }

    if (
      actual.reasoningAssessment !== 'meets'
      || actual.risk.trim().length === 0
      || actual.correction.trim().length === 0
    ) {
      incompleteReasoningLines.push(expected.line);
    }
  }

  for (const actual of attempt.findings) {
    if (!expectedByLine.has(actual.line)) falsePositiveLines.push(actual.line);
  }

  return {
    matchedLines,
    missedLines,
    falsePositiveLines,
    severityDisagreements,
    incompleteReasoningLines,
    retryConceptLines: [...new Set([...missedLines, ...incompleteReasoningLines])],
  };
}

export function objectiveReviewScore(feedback: ReviewFeedback, expectedFindingCount: number): number {
  if (expectedFindingCount === 0) return 1;
  const correctlyClassified = feedback.matchedLines.length - feedback.severityDisagreements.length;
  const falsePositivePenalty = Math.min(feedback.falsePositiveLines.length, correctlyClassified);
  return Math.max(0, correctlyClassified - falsePositivePenalty) / expectedFindingCount;
}
