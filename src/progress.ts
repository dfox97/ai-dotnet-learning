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
  completed: string[];
  reviews: Record<string, ReviewState>;
};

type VersionOneProgress = {
  version: 1;
  lessons: {
    completed: string[];
    reviews: Record<string, ReviewState>;
  };
  practice: Record<string, unknown>;
  diagnostics: Record<string, unknown>;
  recommendations: Record<string, unknown>;
  reflections: Record<string, string>;
  capstone: Record<string, unknown>;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isReviewState(value: unknown): value is ReviewState {
  if (!isRecord(value)) return false;
  return Array.isArray(value.selected)
    && value.selected.every((line) => Number.isInteger(line) && line > 0)
    && typeof value.note === 'string'
    && typeof value.submitted === 'boolean'
    && (value.quizAnswer === null || Number.isInteger(value.quizAnswer));
}

function isReviewMap(value: unknown): value is Record<string, ReviewState> {
  return isRecord(value) && Object.values(value).every(isReviewState);
}

function isActivityAttempt(value: unknown): value is ActivityAttempt {
  if (!isRecord(value)) return false;
  return ['not-started', 'in-progress', 'completed'].includes(String(value.status))
    && (value.startedAt === null || typeof value.startedAt === 'string')
    && (value.completedAt === null || typeof value.completedAt === 'string')
    && Number.isInteger(value.attempts)
    && Number(value.attempts) >= 0;
}

function isActivityMap(value: unknown): value is Record<string, ActivityAttempt> {
  return isRecord(value) && Object.values(value).every(isActivityAttempt);
}

function isDiagnosticProgress(value: unknown): value is DiagnosticProgress {
  if (!isRecord(value)) return false;
  return (value.assessmentId === null || typeof value.assessmentId === 'string')
    && (value.assessmentVersion === null || Number.isInteger(value.assessmentVersion))
    && ['not-started', 'in-progress', 'completed'].includes(String(value.status))
    && isRecord(value.responses)
    && Object.values(value.responses).every((response) => response === null || ['string', 'number', 'boolean'].includes(typeof response))
    && isRecord(value.competencyScores)
    && Object.values(value.competencyScores).every((score) => typeof score === 'number' && Number.isFinite(score))
    && isStringArray(value.criticalRisks);
}

function isVersionOneProgress(value: unknown): value is VersionOneProgress {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.lessons)) return false;
  return isStringArray(value.lessons.completed)
    && isReviewMap(value.lessons.reviews)
    && isRecord(value.practice)
    && isRecord(value.diagnostics)
    && isRecord(value.recommendations)
    && isRecord(value.reflections)
    && Object.values(value.reflections).every((reflection) => typeof reflection === 'string')
    && isRecord(value.capstone);
}

function isLegacyProgress(value: unknown): value is LegacyProgress {
  return isRecord(value)
    && isStringArray(value.completed)
    && isReviewMap(value.reviews);
}

export function isLearnerProgress(value: unknown): value is LearnerProgress {
  if (!isRecord(value) || value.version !== PROGRESS_VERSION || !isRecord(value.lessons)) return false;
  if (!isRecord(value.practice) || !isRecord(value.diagnostics) || !isRecord(value.recommendations) || !isRecord(value.capstone)) return false;

  return isStringArray(value.lessons.completed)
    && isReviewMap(value.lessons.reviews)
    && isActivityMap(value.practice.patternBridge)
    && isActivityMap(value.practice.translationReview)
    && isActivityMap(value.practice.decisionLabs)
    && isDiagnosticProgress(value.diagnostics.baseline)
    && isDiagnosticProgress(value.diagnostics.post)
    && isStringArray(value.recommendations.activityIds)
    && isStringArray(value.recommendations.masteredCompetencyIds)
    && isStringArray(value.recommendations.atRiskCompetencyIds)
    && isRecord(value.reflections)
    && Object.values(value.reflections).every((reflection) => typeof reflection === 'string')
    && (value.capstone.version === null || Number.isInteger(value.capstone.version))
    && ['not-started', 'review', 'repair', 'evidence', 'completed'].includes(String(value.capstone.stage))
    && isRecord(value.capstone.findings)
    && Object.values(value.capstone.findings).every((finding) => typeof finding === 'string')
    && isStringArray(value.capstone.testEvidence)
    && typeof value.capstone.reflection === 'string';
}

function migrateLessonData(completed: string[], reviews: Record<string, ReviewState>, reflections: Record<string, string> = {}): LearnerProgress {
  const progress = createEmptyProgress();
  progress.lessons.completed = [...completed];
  progress.lessons.reviews = { ...reviews };
  progress.reflections = { ...reflections };
  return progress;
}

export function migrateLegacyProgress(legacy: LegacyProgress): LearnerProgress {
  return migrateLessonData(legacy.completed, legacy.reviews);
}

export function migrateVersionOneProgress(previous: VersionOneProgress): LearnerProgress {
  return migrateLessonData(previous.lessons.completed, previous.lessons.reviews, previous.reflections);
}

export function parseProgress(raw: string | null): ProgressLoadResult {
  if (raw === null) return { status: 'empty', progress: createEmptyProgress() };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'recovery-required', progress: createEmptyProgress(), reason: 'Saved progress is not valid JSON.' };
  }

  if (isLearnerProgress(parsed)) return { status: 'loaded', progress: parsed };
  if (isVersionOneProgress(parsed)) return { status: 'migrated', progress: migrateVersionOneProgress(parsed) };
  if (isLegacyProgress(parsed)) return { status: 'migrated', progress: migrateLegacyProgress(parsed) };

  if (isRecord(parsed) && typeof parsed.version === 'number' && parsed.version > PROGRESS_VERSION) {
    return { status: 'recovery-required', progress: createEmptyProgress(), reason: `Saved progress uses unsupported future version ${parsed.version}.` };
  }

  return { status: 'recovery-required', progress: createEmptyProgress(), reason: 'Saved progress does not match a supported ReviewLab progress format.' };
}

export function serializeProgress(progress: LearnerProgress): string {
  if (!isLearnerProgress(progress)) throw new Error('Cannot save invalid ReviewLab progress.');
  return JSON.stringify(progress);
}

export function exportProgress(progress: LearnerProgress): string {
  if (!isLearnerProgress(progress)) throw new Error('Cannot export invalid ReviewLab progress.');
  return JSON.stringify(progress, null, 2);
}

export function previewProgressImport(raw: string): ProgressLoadResult {
  return parseProgress(raw);
}
