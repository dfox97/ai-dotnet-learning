import { lessons as legacyLessons, type Lesson } from './content';
import {
  type LessonContentContract,
  validateLessonCollection,
  validateLessonContent,
} from './content-contract';

function migrateFirstLesson(lesson: Lesson): LessonContentContract {
  const conceptIds = lesson.concepts.map((_, index) => `${lesson.id}-concept-${index + 1}`);
  const findingIds = lesson.findings.map((_, index) => `${lesson.id}-finding-${index + 1}`);

  const migrated = {
    ...lesson,
    order: 1,
    concepts: lesson.concepts.map((concept, index) => ({
      ...concept,
      id: conceptIds[index],
    })),
    findings: lesson.findings.map((finding, index) => ({
      ...finding,
      id: findingIds[index],
      conceptIds: conceptIds,
    })),
    quiz: {
      ...lesson.quiz,
      competencyIds: [`${lesson.id}-review`],
    },
    competencies: [
      {
        id: `${lesson.id}-review`,
        title: 'Review production C# semantics',
        description: 'Identify semantic and maintainability risks in everyday C# code.',
      },
    ],
    criticality: 'foundation' as const,
    assessment: {
      competencyIds: [`${lesson.id}-review`],
      requiredFindingIds: findingIds,
    },
  } satisfies LessonContentContract;

  return validateLessonContent(migrated);
}

const [firstLegacyLesson, ...remainingLegacyLessons] = legacyLessons;

if (!firstLegacyLesson) {
  throw new Error('ReviewLab requires at least one authored lesson');
}

export const validatedLessons = validateLessonCollection([
  migrateFirstLesson(firstLegacyLesson),
]);

export const lessons: Lesson[] = [
  ...validatedLessons,
  ...remainingLegacyLessons,
];
