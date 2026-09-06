import type { CapstoneProgress } from './progress.ts';

export const CAPSTONE_VERSION = 1 as const;

export type CapstoneJourneyStage = CapstoneProgress['stage'];

export type CapstoneSubmission = {
  findings: Record<string, string>;
  testEvidence: string[];
  reflection: string;
};

export type CapstoneEvaluation = {
  completed: boolean;
  criticalCompetenciesMet: string[];
  unresolvedCriticalCompetencies: string[];
};

const stageOrder: CapstoneJourneyStage[] = [
  'not-started',
  'review',
  'repair',
  'evidence',
  'completed',
];

export function startCapstone(progress: CapstoneProgress): CapstoneProgress {
  if (progress.stage !== 'not-started') return progress;
  return { ...progress, version: CAPSTONE_VERSION, stage: 'review' };
}

export function recordCapstoneFindings(
  progress: CapstoneProgress,
  findings: Record<string, string>,
): CapstoneProgress {
  if (progress.stage !== 'review') {
    throw new Error(`Cannot submit capstone findings from ${progress.stage}.`);
  }
  if (Object.values(findings).every((value) => value.trim().length === 0)) {
    throw new Error('Record at least one capstone finding before continuing.');
  }

  return {
    ...progress,
    version: progress.version ?? CAPSTONE_VERSION,
    findings: { ...findings },
    stage: 'repair',
  };
}

export function markCapstoneRepairReady(progress: CapstoneProgress): CapstoneProgress {
  if (progress.stage !== 'repair') {
    throw new Error(`Cannot move to evidence from ${progress.stage}.`);
  }
  return { ...progress, stage: 'evidence' };
}

export function completeCapstone(
  progress: CapstoneProgress,
  testEvidence: string[],
  reflection: string,
): CapstoneProgress {
  if (progress.stage !== 'evidence') {
    throw new Error(`Cannot complete capstone from ${progress.stage}.`);
  }
  if (testEvidence.every((entry) => entry.trim().length === 0)) {
    throw new Error('Record test evidence before completing the capstone.');
  }
  if (!reflection.trim()) {
    throw new Error('Record a capstone reflection before completing the capstone.');
  }

  return {
    ...progress,
    version: progress.version ?? CAPSTONE_VERSION,
    testEvidence: testEvidence.filter((entry) => entry.trim().length > 0),
    reflection,
    stage: 'completed',
  };
}

export function resumeCapstoneStage(progress: CapstoneProgress): CapstoneJourneyStage {
  return stageOrder.includes(progress.stage) ? progress.stage : 'not-started';
}

export function canRevealExpertAnswer(progress: CapstoneProgress): boolean {
  return stageOrder.indexOf(progress.stage) >= stageOrder.indexOf('repair');
}

export function evaluateCapstoneCriticalCompetencies(
  masteredCompetencyIds: string[],
  requiredCriticalCompetencyIds: string[],
): CapstoneEvaluation {
  const mastered = new Set(masteredCompetencyIds);
  const criticalCompetenciesMet = requiredCriticalCompetencyIds.filter((id) => mastered.has(id));
  const unresolvedCriticalCompetencies = requiredCriticalCompetencyIds.filter((id) => !mastered.has(id));

  return {
    completed: unresolvedCriticalCompetencies.length === 0,
    criticalCompetenciesMet,
    unresolvedCriticalCompetencies,
  };
}
