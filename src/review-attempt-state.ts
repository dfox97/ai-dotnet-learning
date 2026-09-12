import type {
  ReviewSeverity,
  StructuredReviewAttempt,
  StructuredReviewFinding,
} from './review-reasoning.ts';

export function createStructuredReviewAttempt(): StructuredReviewAttempt {
  return {
    findings: [],
    submitted: false,
    quizAnswer: null,
  };
}

export function addReviewFinding(
  attempt: StructuredReviewAttempt,
  line: number,
  severity: ReviewSeverity = 'warning',
): StructuredReviewAttempt {
  if (attempt.findings.some((finding) => finding.line === line)) return attempt;

  const newFinding: StructuredReviewFinding = {
    line,
    severity,
    risk: '',
    correction: '',
    reasoningAssessment: 'not-assessed',
  };

  return {
    ...attempt,
    submitted: false,
    findings: [...attempt.findings, newFinding].sort((left, right) => left.line - right.line),
  };
}

export function updateReviewFinding(
  attempt: StructuredReviewAttempt,
  line: number,
  changes: Partial<Omit<StructuredReviewFinding, 'line'>>,
): StructuredReviewAttempt {
  const findings = attempt.findings.map((finding) => (
    finding.line === line ? { ...finding, ...changes } : finding
  ));

  return {
    ...attempt,
    submitted: false,
    findings,
  };
}

export function removeReviewFinding(
  attempt: StructuredReviewAttempt,
  line: number,
): StructuredReviewAttempt {
  return {
    ...attempt,
    submitted: false,
    findings: attempt.findings.filter((finding) => finding.line !== line),
  };
}

export function setReviewQuizAnswer(
  attempt: StructuredReviewAttempt,
  quizAnswer: number | null,
): StructuredReviewAttempt {
  return {
    ...attempt,
    submitted: false,
    quizAnswer,
  };
}

export function submitStructuredReviewAttempt(
  attempt: StructuredReviewAttempt,
): StructuredReviewAttempt {
  return { ...attempt, submitted: true };
}
