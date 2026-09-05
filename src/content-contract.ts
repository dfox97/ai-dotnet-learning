import type { DecisionLab, Finding, Lesson, Quiz } from './content';

export type ContentCriticality = 'foundation' | 'core' | 'production';

export type Competency = {
  id: string;
  title: string;
  description: string;
};

export type ContractConcept = Lesson['concepts'][number] & {
  id: string;
};

export type ContractFinding = Finding & {
  id: string;
  conceptIds: string[];
};

export type ContractQuiz = Quiz & {
  competencyIds: string[];
};

export type AssessmentMetadata = {
  competencyIds: string[];
  requiredFindingIds: string[];
};

export type LessonContentContract = Omit<Lesson, 'concepts' | 'findings' | 'quiz' | 'decisionLab'> & {
  order: number;
  concepts: ContractConcept[];
  findings: ContractFinding[];
  quiz: ContractQuiz;
  decisionLab?: DecisionLab;
  competencies: Competency[];
  criticality: ContentCriticality;
  assessment: AssessmentMetadata;
};

export class ContentValidationError extends Error {
  readonly issues: string[];

  constructor(lessonId: string, issues: string[]) {
    super(`Invalid lesson "${lessonId}":\n- ${issues.join('\n- ')}`);
    this.name = 'ContentValidationError';
    this.issues = issues;
  }
}

const requiredCopyFields = [
  'id',
  'number',
  'title',
  'eyebrow',
  'duration',
  'summary',
  'outcome',
  'fileName',
  'code',
  'prompt',
] as const satisfies readonly (keyof LessonContentContract)[];

function requireCopy(lesson: LessonContentContract, issues: string[]) {
  for (const field of requiredCopyFields) {
    const value = lesson[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      issues.push(`${field} must contain authored copy`);
    }
  }
}

function duplicateIds(items: { id: string }[], label: string, issues: string[]) {
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.id.trim()) {
      issues.push(`${label} id must not be empty`);
      continue;
    }

    if (seen.has(item.id)) {
      issues.push(`duplicate ${label} id "${item.id}"`);
    }
    seen.add(item.id);
  }
}

function requireReferences(
  references: string[],
  available: Set<string>,
  label: string,
  issues: string[],
) {
  for (const reference of references) {
    if (!available.has(reference)) {
      issues.push(`${label} references unknown id "${reference}"`);
    }
  }
}

export function validateLessonContent(lesson: LessonContentContract): LessonContentContract {
  const issues: string[] = [];
  requireCopy(lesson, issues);

  if (!Number.isInteger(lesson.order) || lesson.order < 1) {
    issues.push('order must be a positive integer');
  }

  duplicateIds(lesson.concepts, 'concept', issues);
  duplicateIds(lesson.findings, 'finding', issues);
  duplicateIds(lesson.competencies, 'competency', issues);

  const codeLineCount = lesson.code.split('\n').length;
  for (const finding of lesson.findings) {
    if (!Number.isInteger(finding.line) || finding.line < 1 || finding.line > codeLineCount) {
      issues.push(
        `finding "${finding.id}" points to line ${finding.line}, but the sample has ${codeLineCount} lines`,
      );
    }

    if (!finding.title.trim() || !finding.explanation.trim() || !finding.better.trim()) {
      issues.push(`finding "${finding.id}" is missing required author copy`);
    }
  }

  if (!lesson.quiz.question.trim() || !lesson.quiz.explanation.trim()) {
    issues.push('quiz is missing required author copy');
  }

  if (lesson.quiz.options.length < 2) {
    issues.push('quiz must contain at least two options');
  }

  if (
    !Number.isInteger(lesson.quiz.answer)
    || lesson.quiz.answer < 0
    || lesson.quiz.answer >= lesson.quiz.options.length
  ) {
    issues.push(
      `quiz answer ${lesson.quiz.answer} is outside the available option range 0-${Math.max(lesson.quiz.options.length - 1, 0)}`,
    );
  }

  const conceptIds = new Set(lesson.concepts.map(({ id }) => id));
  const findingIds = new Set(lesson.findings.map(({ id }) => id));
  const competencyIds = new Set(lesson.competencies.map(({ id }) => id));

  for (const finding of lesson.findings) {
    requireReferences(finding.conceptIds, conceptIds, `finding "${finding.id}"`, issues);
  }

  requireReferences(lesson.quiz.competencyIds, competencyIds, 'quiz', issues);
  requireReferences(lesson.assessment.competencyIds, competencyIds, 'assessment', issues);
  requireReferences(lesson.assessment.requiredFindingIds, findingIds, 'assessment', issues);

  if (issues.length > 0) {
    throw new ContentValidationError(lesson.id || '<missing-id>', issues);
  }

  return lesson;
}

export function validateLessonCollection(lessons: LessonContentContract[]): LessonContentContract[] {
  const ids = new Set<string>();
  const orders = new Set<number>();
  const issues: string[] = [];

  for (const lesson of lessons) {
    if (ids.has(lesson.id)) issues.push(`duplicate lesson id "${lesson.id}"`);
    if (orders.has(lesson.order)) issues.push(`duplicate lesson order ${lesson.order}`);
    ids.add(lesson.id);
    orders.add(lesson.order);
  }

  if (issues.length > 0) {
    throw new ContentValidationError('collection', issues);
  }

  return lessons.map(validateLessonContent);
}
