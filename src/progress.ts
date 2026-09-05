export const PROGRESS_STORAGE_KEY = 'reviewlab-progress';
export const PROGRESS_VERSION = 1 as const;

export type ReviewState = {
  selected: number[];
  note: string;
  submitted: boolean;
  quizAnswer: number | null;
};

export type LearnerProgress = {
  version: typeof PROGRESS_VERSION;
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

type LegacyProgress = {
  completed: string[];
  reviews: Record<string, ReviewState>;
};

export type ProgressLoadResult =
  | { status: 'empty'; progress: LearnerProgress }
  | { status: 'loaded'; progress: LearnerProgress }
  | { status: 'migrated'; progress: LearnerProgress }
  | { status: 'recovery-required'; progress: LearnerProgress; reason: string };

export function createEmptyProgress(): LearnerProgress {
  return {
    version: PROGRESS_VERSION,
    lessons: { completed: [], reviews: {} },
    practice: {},
    diagnostics: {},
    recommendations: {},
    reflections: {},
    capstone: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function isLegacyProgress(value: unknown): value is LegacyProgress {
  return isRecord(value)
    && Array.isArray(value.completed)
    && value.completed.every((id) => typeof id === 'string')
    && isReviewMap(value.reviews);
}

export function isLearnerProgress(value: unknown): value is LearnerProgress {
  if (!isRecord(value) || value.version !== PROGRESS_VERSION || !isRecord(value.lessons)) return false;

  return Array.isArray(value.lessons.completed)
    && value.lessons.completed.every((id) => typeof id === 'string')
    && isReviewMap(value.lessons.reviews)
    && isRecord(value.practice)
    && isRecord(value.diagnostics)
    && isRecord(value.recommendations)
    && isRecord(value.reflections)
    && Object.values(value.reflections).every((reflection) => typeof reflection === 'string')
    && isRecord(value.capstone);
}

export function migrateLegacyProgress(legacy: LegacyProgress): LearnerProgress {
  return {
    ...createEmptyProgress(),
    lessons: {
      completed: [...legacy.completed],
      reviews: { ...legacy.reviews },
    },
  };
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

  if (isLearnerProgress(parsed)) return { status: 'loaded', progress: parsed };
  if (isLegacyProgress(parsed)) return { status: 'migrated', progress: migrateLegacyProgress(parsed) };

  if (isRecord(parsed) && typeof parsed.version === 'number' && parsed.version > PROGRESS_VERSION) {
    return {
      status: 'recovery-required',
      progress: createEmptyProgress(),
      reason: `Saved progress uses unsupported future version ${parsed.version}.`,
    };
  }

  return {
    status: 'recovery-required',
    progress: createEmptyProgress(),
    reason: 'Saved progress does not match a supported ReviewLab progress format.',
  };
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
