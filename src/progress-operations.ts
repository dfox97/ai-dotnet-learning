import {
  createEmptyDiagnostic,
  type ActivityAttempt,
  type CapstoneProgress,
  type DiagnosticProgress,
  type LearnerProgress,
  type RecommendationProgress,
  type ReviewState,
} from './progress.ts';

export type PracticeArea = keyof LearnerProgress['practice'];

export function setLessonAttempt(
  progress: LearnerProgress,
  lessonId: string,
  attempt: ActivityAttempt,
): LearnerProgress {
  return {
    ...progress,
    lessons: {
      ...progress.lessons,
      attempts: { ...progress.lessons.attempts, [lessonId]: attempt },
    },
  };
}

export function startLessonAttempt(
  progress: LearnerProgress,
  lessonId: string,
  startedAt: string,
): LearnerProgress {
  const existing = progress.lessons.attempts[lessonId];
  if (existing?.status === 'in-progress' || existing?.status === 'completed') return progress;

  return setLessonAttempt(progress, lessonId, {
    status: 'in-progress',
    startedAt: existing?.startedAt ?? startedAt,
    completedAt: null,
    attempts: (existing?.attempts ?? 0) + 1,
  });
}

export function completeLessonAttempt(
  progress: LearnerProgress,
  lessonId: string,
  completedAt: string,
): LearnerProgress {
  const existing = progress.lessons.attempts[lessonId];
  if (existing?.status === 'completed') return progress;

  return setLessonAttempt(progress, lessonId, {
    status: 'completed',
    startedAt: existing?.startedAt ?? null,
    completedAt,
    attempts: Math.max(existing?.attempts ?? 0, 1),
  });
}

export function setLessonReview(
  progress: LearnerProgress,
  lessonId: string,
  review: ReviewState,
): LearnerProgress {
  const active = startLessonAttempt(progress, lessonId, new Date().toISOString());
  return {
    ...active,
    lessons: {
      ...active.lessons,
      reviews: { ...active.lessons.reviews, [lessonId]: review },
    },
  };
}

export function markLessonCompleted(progress: LearnerProgress, lessonId: string): LearnerProgress {
  const withCompletion = progress.lessons.completed.includes(lessonId)
    ? progress
    : {
        ...progress,
        lessons: {
          ...progress.lessons,
          completed: [...progress.lessons.completed, lessonId],
        },
      };

  return completeLessonAttempt(withCompletion, lessonId, new Date().toISOString());
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

export function startPostDiagnosticAttempt(progress: LearnerProgress): LearnerProgress {
  if (progress.diagnostics.post.status !== 'completed') {
    throw new Error('Cannot start post-diagnostic remediation before the original post-diagnostic is complete.');
  }

  const current = progress.diagnostics.postAttempts.at(-1);
  if (current && current.status !== 'completed') return progress;

  return {
    ...progress,
    diagnostics: {
      ...progress.diagnostics,
      postAttempts: [...progress.diagnostics.postAttempts, createEmptyDiagnostic()],
    },
  };
}

export function setPostDiagnosticAttempt(
  progress: LearnerProgress,
  diagnostic: DiagnosticProgress,
): LearnerProgress {
  if (progress.diagnostics.post.status !== 'completed') {
    return setDiagnosticProgress(progress, 'post', diagnostic);
  }

  const attempts = progress.diagnostics.postAttempts;
  if (attempts.length === 0) {
    return {
      ...progress,
      diagnostics: { ...progress.diagnostics, postAttempts: [diagnostic] },
    };
  }

  return {
    ...progress,
    diagnostics: {
      ...progress.diagnostics,
      postAttempts: [...attempts.slice(0, -1), diagnostic],
    },
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
