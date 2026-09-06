import {
  bridgePatterns as authoredBridgePatterns,
  translationChallenges as authoredTranslationChallenges,
  type BridgePattern,
  type TranslationChallenge,
} from './patterns.ts';
import {
  resourceCategories,
  resources as authoredResources,
  type LearningResource,
} from './resources.ts';
import { validatedLessons } from './lesson-catalog.ts';
import { recommendationRules } from './recommendations.ts';

export type PracticeAndReferenceCatalog = {
  bridgePatterns: BridgePattern[];
  translationChallenges: TranslationChallenge[];
  resources: LearningResource[];
};

export class PracticeCatalogValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid practice/reference catalog:\n- ${issues.join('\n- ')}`);
    this.name = 'PracticeCatalogValidationError';
    this.issues = issues;
  }
}

function lineCount(code: string): number {
  return code.split('\n').length;
}

function duplicateValues(values: string[], label: string, issues: string[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value.trim()) issues.push(`${label} contains an empty identifier`);
    if (seen.has(value)) issues.push(`${label} contains duplicate identifier "${value}"`);
    seen.add(value);
  }
}

function requireCopy(value: string, label: string, issues: string[]): void {
  if (!value.trim()) issues.push(`${label} must contain authored copy`);
}

export function validatePracticeAndReferenceCatalog(
  catalog: PracticeAndReferenceCatalog,
): PracticeAndReferenceCatalog {
  const issues: string[] = [];

  duplicateValues(catalog.bridgePatterns.map(({ id }) => id), 'bridge patterns', issues);
  duplicateValues(catalog.translationChallenges.map(({ id }) => id), 'translation challenges', issues);
  duplicateValues(catalog.resources.map(({ url }) => url), 'resource URLs', issues);

  for (const pattern of catalog.bridgePatterns) {
    requireCopy(pattern.title, `bridge pattern "${pattern.id}" title`, issues);
    requireCopy(pattern.summary, `bridge pattern "${pattern.id}" summary`, issues);
    duplicateValues(pattern.concepts.map(({ id }) => id), `bridge pattern "${pattern.id}" concepts`, issues);

    const typeScriptLines = lineCount(pattern.typeScript.code);
    const csharpLines = lineCount(pattern.csharp.code);
    for (const concept of pattern.concepts) {
      requireCopy(concept.label, `concept "${pattern.id}/${concept.id}" label`, issues);
      requireCopy(concept.difference, `concept "${pattern.id}/${concept.id}" difference`, issues);
      requireCopy(concept.review, `concept "${pattern.id}/${concept.id}" review prompt`, issues);
      for (const line of concept.typeScriptLines) {
        if (!Number.isInteger(line) || line < 1 || line > typeScriptLines) {
          issues.push(`concept "${pattern.id}/${concept.id}" references invalid TypeScript line ${line}`);
        }
      }
      for (const line of concept.csharpLines) {
        if (!Number.isInteger(line) || line < 1 || line > csharpLines) {
          issues.push(`concept "${pattern.id}/${concept.id}" references invalid C# line ${line}`);
        }
      }
    }
  }

  for (const challenge of catalog.translationChallenges) {
    requireCopy(challenge.title, `translation challenge "${challenge.id}" title`, issues);
    requireCopy(challenge.brief, `translation challenge "${challenge.id}" brief`, issues);
    requireCopy(challenge.idiomaticCode, `translation challenge "${challenge.id}" idiomatic solution`, issues);
    const generatedLines = lineCount(challenge.generatedCode);
    for (const finding of challenge.findings) {
      if (!Number.isInteger(finding.line) || finding.line < 1 || finding.line > generatedLines) {
        issues.push(`translation challenge "${challenge.id}" references invalid generated line ${finding.line}`);
      }
      requireCopy(finding.title, `translation finding "${challenge.id}:${finding.line}" title`, issues);
      requireCopy(finding.explanation, `translation finding "${challenge.id}:${finding.line}" explanation`, issues);
      requireCopy(finding.better, `translation finding "${challenge.id}:${finding.line}" safer direction`, issues);
    }
  }

  for (const resource of catalog.resources) {
    requireCopy(resource.title, `resource "${resource.url}" title`, issues);
    requireCopy(resource.description, `resource "${resource.title}" description`, issues);
    requireCopy(resource.reviewUse, `resource "${resource.title}" review use`, issues);
    try {
      const url = new URL(resource.url);
      if (url.protocol !== 'https:') issues.push(`resource "${resource.title}" must use an HTTPS URL`);
    } catch {
      issues.push(`resource "${resource.title}" has an invalid URL`);
    }
  }

  if (issues.length) throw new PracticeCatalogValidationError(issues);
  return catalog;
}

const validatedCatalog = validatePracticeAndReferenceCatalog({
  bridgePatterns: authoredBridgePatterns,
  translationChallenges: authoredTranslationChallenges,
  resources: authoredResources,
});

const lessonIds = new Set(validatedLessons.map(({ id }) => id));
const practiceIds = new Set([
  ...validatedCatalog.bridgePatterns.map(({ id }) => id),
  ...validatedCatalog.translationChallenges.map(({ id }) => id),
]);
const recommendationReferenceIssues: string[] = [];

for (const rule of recommendationRules) {
  for (const activity of rule.activities) {
    const exists = activity.kind === 'lesson'
      ? lessonIds.has(activity.id)
      : practiceIds.has(activity.id);
    if (!exists) {
      recommendationReferenceIssues.push(
        `recommendation for "${rule.competencyId}" references unknown ${activity.kind} "${activity.id}"`,
      );
    }
  }
}

if (recommendationReferenceIssues.length) {
  throw new PracticeCatalogValidationError(recommendationReferenceIssues);
}

export const bridgePatterns = validatedCatalog.bridgePatterns;
export const translationChallenges = validatedCatalog.translationChallenges;
export const resources = validatedCatalog.resources;
export { resourceCategories };
export type { BridgePattern, TranslationChallenge, LearningResource };
