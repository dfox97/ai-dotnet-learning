import type { ContractFinding } from './content-contract.ts';
import type { ReviewFeedback } from './review-reasoning.ts';

export function retryConceptIds(
  feedback: ReviewFeedback,
  findings: ContractFinding[],
): string[] {
  const retryLines = new Set(feedback.retryConceptLines);

  return [...new Set(
    findings
      .filter((finding) => retryLines.has(finding.line))
      .flatMap((finding) => finding.conceptIds),
  )];
}
