import { bridgePatterns, translationChallenges } from './patterns.ts';
import { resources } from './resources.ts';

export class PracticeReferenceValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid practice/reference content:\n- ${issues.join('\n- ')}`);
    this.name = 'PracticeReferenceValidationError';
    this.issues = issues;
  }
}

function duplicateValues(values: string[], label: string, issues: string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value.trim()) issues.push(`${label} contains an empty identifier`);
    if (seen.has(value)) issues.push(`duplicate ${label} value "${value}"`);
    seen.add(value);
  }
}

function validLines(lines: number[], lineCount: number, label: string, issues: string[]) {
  for (const line of lines) {
    if (!Number.isInteger(line) || line < 1 || line > lineCount) {
      issues.push(`${label} references line ${line}, but the sample has ${lineCount} lines`);
    }
  }
}

export function validatePracticeAndReferenceContent(): void {
  const issues: string[] = [];
  duplicateValues(bridgePatterns.map((pattern) => pattern.id), 'bridge pattern id', issues);
  duplicateValues(translationChallenges.map((challenge) => challenge.id), 'translation challenge id', issues);
  duplicateValues(resources.map((resource) => resource.url), 'resource URL', issues);

  for (const pattern of bridgePatterns) {
    if (!pattern.title.trim() || !pattern.summary.trim() || !pattern.category.trim()) {
      issues.push(`bridge pattern "${pattern.id}" is missing authored copy`);
    }
    duplicateValues(pattern.concepts.map((concept) => concept.id), `concept id in ${pattern.id}`, issues);
    const tsLineCount = pattern.typeScript.code.split('\n').length;
    const csharpLineCount = pattern.csharp.code.split('\n').length;
    for (const concept of pattern.concepts) {
      validLines(concept.typeScriptLines, tsLineCount, `${pattern.id}/${concept.id} TypeScript`, issues);
      validLines(concept.csharpLines, csharpLineCount, `${pattern.id}/${concept.id} C#`, issues);
      if (!concept.label.trim() || !concept.difference.trim() || !concept.review.trim()) {
        issues.push(`bridge concept "${pattern.id}/${concept.id}" is missing authored copy`);
      }
    }
  }

  for (const challenge of translationChallenges) {
    if (!challenge.title.trim() || !challenge.brief.trim() || !challenge.category.trim()) {
      issues.push(`translation challenge "${challenge.id}" is missing authored copy`);
    }
    const generatedLineCount = challenge.generatedCode.split('\n').length;
    for (const finding of challenge.findings) {
      validLines([finding.line], generatedLineCount, `${challenge.id} finding`, issues);
      if (!finding.title.trim() || !finding.explanation.trim() || !finding.better.trim()) {
        issues.push(`translation finding in "${challenge.id}" is missing authored copy`);
      }
    }
    if (challenge.idiomaticNotes.length === 0 || challenge.idiomaticNotes.some((note) => !note.trim())) {
      issues.push(`translation challenge "${challenge.id}" must include idiomatic notes`);
    }
  }

  for (const resource of resources) {
    if (!resource.title.trim() || !resource.description.trim() || !resource.reviewUse.trim()) {
      issues.push(`resource "${resource.title || '<untitled>'}" is missing authored copy`);
    }
    try {
      const url = new URL(resource.url);
      if (url.protocol !== 'https:') issues.push(`resource "${resource.title}" must use HTTPS`);
    } catch {
      issues.push(`resource "${resource.title}" has an invalid URL`);
    }
  }

  if (issues.length > 0) throw new PracticeReferenceValidationError(issues);
}
