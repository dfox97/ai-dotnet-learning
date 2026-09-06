export const PROGRESS_STORAGE_KEY = 'reviewlab-progress';
export const PROGRESS_VERSION = 2 as const;

export type ReviewState = {
  selected: number[];
  note: string;
  submitted: boolean;
  quizAnswer: number | null;
};

export type ActivityAttempt = {
  status: 'not-started' | 'in-progress' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
  attempts: number;
};

export type DiagnosticProgress = {
  assessmentId: string | null;
  assessmentVersion: number | null;
  status: 'not-started' | 'in-progress' | 'completed';
  responses: Record<string, string | number | boolean | null>;
  competencyScores: Record<string, number>;
  criticalRisks: string[];
};

export type RecommendationProgress = {
  activityIds: string[];
  masteredCompetencyIds: string[];
  atRiskCompetencyIds: string[];
};

export type CapstoneProgress = {
  version: number | null;
  stage: 'not-started' | 'review' | 'repair' | 'evidence' | 'completed';
  findings: Record<string, string>;
  testEvidence: string[];
  reflection: string;
};

export type LearnerProgress = {
  version: typeof PROGRESS_VERSION;
  lessons: {
    completed: string[];
    reviews: Record<string, ReviewState>;
  };
  practice: {
    patternBridge: Record<string, ActivityAttempt>;
    translationReview: Record<string, ActivityAttempt>;
    decisionLabs: Record<string, ActivityAttempt>;
  };
  diagnostics: {
    baseline: DiagnosticProgress;
    post: DiagnosticProgress;
  };
  recommendations: RecommendationProgress;
  reflections: Record<string, string>;
  capstone: CapstoneProgress;
};

type LegacyProgress = {
  completed?: string[];
  reviews?: Record<string, ReviewState>;
};

type VersionOneProgress = {
  version: 1;
  lessons?: {
    completed?: string[];
    reviews?: Record<string, ReviewState>;
  };
  reflections?: Record<string, string>;
};

export type ProgressLoadResult =
  | { status: 'empty'; progress: LearnerProgress }
  | { status: 'loaded'; progress: LearnerProgress }
  | { status: 'migrated'; progress: LearnerProgress }
  | { status: 'recovery-required'; progress: LearnerProgress; reason: string };

function createEmptyDiagnostic(): DiagnosticProgress {
  return {
    assessmentId: null,
    assessmentVersion: null,
    status: 'not-started',
    responses: {},
    competencyScores: {},
    criticalRisks: [],
  };
}

export function createEmptyProgress(): LearnerProgress {
  return {
    version: PROGRESS_VERSION,
    lessons: { completed: [], reviews: {} },
    practice: { patternBridge: {}, translationReview: {}, decisionLabs: {} },
    diagnostics: { baseline: createEmptyDiagnostic(), post: createEmptyDiagnostic() },
    recommendations: { activityIds: [], masteredCompetencyIds: [], atRiskCompetencyIds: [] },
    reflections: {},
    capstone: {
      version: null,
      stage: 'not-started',
      findings: {},
      testEvidence: [],
      reflection: '',
    },
  };
}

function asStoredObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function hydrateProgress(saved: Partial<LearnerProgress>): LearnerProgress {
  const empty = createEmptyProgress();

  return {
    ...empty,
    ...saved,
    version: PROGRESS_VERSION,
    lessons: { ...empty.lessons, ...saved.lessons },
    practice: { ...empty.practice, ...saved.practice },
    diagnostics: { ...empty.diagnostics, ...saved.diagnostics },
    recommendations: { ...empty.recommendations, ...saved.recommendations },
    reflections: saved.reflections ?? empty.reflections,
    capstone: { ...empty.capstone, ...saved.capstone },
  };
}

function migrateLessonData(
  completed: string[] = [],
  reviews: Record<string, ReviewState> = {},
  reflections: Record<string, string> = {},
): LearnerProgress {
  const progress = createEmptyProgress();
  progress.lessons.completed = completed;
  progress.lessons.reviews = reviews;
  progress.reflections = reflections;
  return progress;
}

export function migrateLegacyProgress(legacy: LegacyProgress): LearnerProgress {
  return migrateLessonData(legacy.completed, legacy.reviews);
}

export function migrateVersionOneProgress(previous: VersionOneProgress): LearnerProgress {
  return migrateLessonData(
    previous.lessons?.completed,
    previous.lessons?.reviews,
    previous.reflections,
  );
}

export function parseProgress(raw: string | null): ProgressLoadResult {
  if (raw === null) return { status: 'empty', progress: createEmptyProgress() };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      status: 'recovery-required',
      progress: createEmptyProgress(),
      reason: 'Saved progress is not valid JSON.',
    };
  }

  const stored = asStoredObject(parsed);
  if (!stored) {
    return {
      status: 'recovery-required',
      progress: createEmptyProgress(),
      reason: 'Saved progress does not match a supported ReviewLab progress format.',
    };
  }

  if (stored.version === PROGRESS_VERSION) {
    return {
      status: 'loaded',
      progress: hydrateProgress(stored as Partial<LearnerProgress>),
    };
  }

  if (stored.version === 1) {
    return {
      status: 'migrated',
      progress: migrateVersionOneProgress(stored as VersionOneProgress),
    };
  }

  if (typeof stored.version === 'number' && stored.version > PROGRESS_VERSION) {
    return {
      status: 'recovery-required',
      progress: createEmptyProgress(),
      reason: `Saved progress uses unsupported future version ${stored.version}.`,
    };
  }

  if ('completed' in stored || 'reviews' in stored) {
    return {
      status: 'migrated',
      progress: migrateLegacyProgress(stored as LegacyProgress),
    };
  }

  return {
    status: 'recovery-required',
    progress: createEmptyProgress(),
    reason: 'Saved progress does not match a supported ReviewLab progress format.',
  };
}

export function serializeProgress(progress: LearnerProgress): string {
  return JSON.stringify(progress);
}

export function exportProgress(progress: LearnerProgress): string {
  return JSON.stringify(progress, null, 2);
}

export function previewProgressImport(raw: string): ProgressLoadResult {
  return parseProgress(raw);
}
