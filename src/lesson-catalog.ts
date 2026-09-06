import { lessons as legacyLessons, type Lesson } from './content.ts';
import {
  type LessonContentContract,
  validateLessonCollection,
  validateLessonContent,
} from './content-contract.ts';

const criticalityByDifficulty = {
  Foundation: 'foundation',
  Core: 'core',
  Production: 'production',
} as const;

function migrateLesson(lesson: Lesson, index: number): LessonContentContract {
  const conceptIds = lesson.concepts.map((_, conceptIndex) => `${lesson.id}-concept-${conceptIndex + 1}`);
  const findingIds = lesson.findings.map((_, findingIndex) => `${lesson.id}-finding-${findingIndex + 1}`);
  const competencyId = `${lesson.id}-review`;

  const migrated = {
    ...lesson,
    order: index + 1,
    concepts: lesson.concepts.map((concept, conceptIndex) => ({
      ...concept,
      id: conceptIds[conceptIndex],
    })),
    findings: lesson.findings.map((finding, findingIndex) => ({
      ...finding,
      id: findingIds[findingIndex],
      conceptIds,
    })),
    quiz: {
      ...lesson.quiz,
      competencyIds: [competencyId],
    },
    competencies: [
      {
        id: competencyId,
        title: `Review ${lesson.title}`,
        description: lesson.outcome,
      },
    ],
    criticality: criticalityByDifficulty[lesson.difficulty],
    assessment: {
      competencyIds: [competencyId],
      requiredFindingIds: findingIds,
    },
  } satisfies LessonContentContract;

  return validateLessonContent(migrated);
}

if (legacyLessons.length === 0) {
  throw new Error('ReviewLab requires at least one authored lesson');
}

export const validatedLessons = validateLessonCollection(
  legacyLessons.map(migrateLesson),
);

export const lessons: Lesson[] = validatedLessons;
