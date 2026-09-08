import type { DecisionLab, Lesson } from './lesson-types.ts';

export type GlossaryEntry = readonly [term: string, definition: string];

export class PracticeReferenceValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid decision-lab/glossary content:\n- ${issues.join('\n- ')}`);
    this.name = 'PracticeReferenceValidationError';
    this.issues = issues;
  }
}

function hasCopy(value: string): boolean {
  return value.trim().length > 0;
}

export function validateDecisionLab(lessonId: string, lab: DecisionLab): DecisionLab {
  const issues: string[] = [];

  if (!hasCopy(lab.title)) issues.push(`${lessonId}: decision lab title is required`);
  if (!hasCopy(lab.scenario)) issues.push(`${lessonId}: decision lab scenario is required`);
  if (!hasCopy(lab.question)) issues.push(`${lessonId}: decision lab question is required`);
  if (!hasCopy(lab.takeaway)) issues.push(`${lessonId}: decision lab takeaway is required`);
  if (lab.options.length < 2) issues.push(`${lessonId}: decision lab needs at least two options`);

  const correctCount = lab.options.filter((option) => option.correct).length;
  if (correctCount !== 1) {
    issues.push(`${lessonId}: decision lab must contain exactly one correct option, found ${correctCount}`);
  }

  lab.options.forEach((option, index) => {
    if (!hasCopy(option.label)) issues.push(`${lessonId}: option ${index + 1} label is required`);
    if (!hasCopy(option.detail)) issues.push(`${lessonId}: option ${index + 1} detail is required`);
    if (!hasCopy(option.feedback)) issues.push(`${lessonId}: option ${index + 1} feedback is required`);
  });

  if (issues.length > 0) throw new PracticeReferenceValidationError(issues);
  return lab;
}

export function validateDecisionLabs(lessons: readonly Lesson[]): DecisionLab[] {
  const labs: DecisionLab[] = [];
  const issues: string[] = [];

  for (const lesson of lessons) {
    if (!lesson.decisionLab) continue;
    try {
      labs.push(validateDecisionLab(lesson.id, lesson.decisionLab));
    } catch (error) {
      if (error instanceof PracticeReferenceValidationError) issues.push(...error.issues);
      else throw error;
    }
  }

  if (issues.length > 0) throw new PracticeReferenceValidationError(issues);
  return labs;
}

export function validateGlossary(entries: readonly (readonly string[])[]): GlossaryEntry[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  const validated: GlossaryEntry[] = [];

  entries.forEach((entry, index) => {
    if (entry.length !== 2) {
      issues.push(`glossary entry ${index + 1} must contain exactly a term and definition`);
      return;
    }

    const [term, definition] = entry;
    if (!hasCopy(term)) issues.push(`glossary entry ${index + 1} term is required`);
    if (!hasCopy(definition)) issues.push(`glossary entry ${index + 1} definition is required`);

    const normalized = term.trim().toLowerCase();
    if (seen.has(normalized)) issues.push(`duplicate glossary term "${term}"`);
    seen.add(normalized);
    validated.push([term, definition]);
  });

  if (issues.length > 0) throw new PracticeReferenceValidationError(issues);
  return validated;
}
