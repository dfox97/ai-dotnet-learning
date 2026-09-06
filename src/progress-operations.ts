import type {
  ActivityAttempt,
  CapstoneProgress,
  DiagnosticProgress,
  LearnerProgress,
  RecommendationProgress,
  ReviewState,
} from './progress.ts';

export type PracticeArea = keyof LearnerProgress['practice'];

export function setLessonReview(
  progress: LearnerProgress,
  lessonId: string,
  review: ReviewState,
): LearnerProgress {
  return {
    ...progress,
    lessons: {
      ...progress.lessons,
      reviews: { ...progress.lessons.reviews, [lessonId]: review },
    },
  };
}

export function markLessonCompleted(progress: LearnerProgress, lessonId: string): LearnerProgress {
  if (progress.lessons.completed.includes(lessonId)) return progress;
  return {
    ...progress,
    lessons: {
      ...progress.lessons,
      completed: [...progress.lessons.completed, lessonId],
    },
  };
}

export function setPracticeAttempt(
  progress: LearnerProgress,
  area: PracticeArea,
  activityId: string,
  attempt: ActivityAttempt,
): LearnerProgress {
  return {
    ...progress,
    practice: {
      ...progress.practice,
      [area]: { ...progress.practice[area], [activityId]: attempt },
    },
  };
}

export function startPracticeAttempt(
  progress: LearnerProgress,
  area: PracticeArea,
  activityId: string,
  startedAt: string,
): LearnerProgress {
  const existing = progress.practice[area][activityId];
  return setPracticeAttempt(progress, area, activityId, {
    status: 'in-progress',
    startedAt: existing?.startedAt ?? startedAt,
    completedAt: null,
    attempts: (existing?.attempts ?? 0) + 1,
  });
}

export function completePracticeAttempt(
  progress: LearnerProgress,
  area: PracticeArea,
  activityId: string,
  completedAt: string,
): LearnerProgress {
  const existing = progress.practice[area][activityId];
  if (!existing) throw new Error(`Cannot complete practice activity ${activityId} before it starts.`);
  return setPracticeAttempt(progress, area, activityId, {
    ...existing,
    status: 'completed',
    completedAt,
  });
}

export function setDiagnosticProgress(
  progress: LearnerProgress,
  phase: 'baseline' | 'post',
  diagnostic: DiagnosticProgress,
): LearnerProgress {
  return {
    ...progress,
    diagnostics: { ...progress.diagnostics, [phase]: diagnostic },
  };
}

export function setRecommendationProgress(
  progress: LearnerProgress,
  recommendations: RecommendationProgress,
): LearnerProgress {
  return { ...progress, recommendations };
}

export function setReflection(
  progress: LearnerProgress,
  activityId: string,
  reflection: string,
): LearnerProgress {
  return {
    ...progress,
    reflections: { ...progress.reflections, [activityId]: reflection },
  };
}

export function setCapstoneProgress(
  progress: LearnerProgress,
  capstone: CapstoneProgress,
): LearnerProgress {
  return { ...progress, capstone };
}
