export type DiagnosticCompetencyId =
  | 'nullability'
  | 'cancellation'
  | 'di-lifetime'
  | 'async-correctness'
  | 'persistence-query'
  | 'idempotency'
  | 'observability'
  | 'tool-authority';

export type DiagnosticOption = {
  id: string;
  label: string;
  isCorrect: boolean;
};

export type DiagnosticQuestion = {
  id: string;
  prompt: string;
  competencyId: DiagnosticCompetencyId;
  critical: boolean;
  options: DiagnosticOption[];
};

export type DiagnosticAssessment = {
  id: string;
  version: number;
  title: string;
  scenario: string;
  questions: DiagnosticQuestion[];
};

export type DiagnosticResult = {
  assessmentId: string;
  assessmentVersion: number;
  answered: number;
  total: number;
  score: number | null;
  complete: boolean;
  competencyScores: Record<string, number>;
  strengths: DiagnosticCompetencyId[];
  gaps: DiagnosticCompetencyId[];
  criticalRisks: DiagnosticCompetencyId[];
};

export function scoreDiagnostic(
  assessment: DiagnosticAssessment,
  responses: Record<string, string | null | undefined>,
): DiagnosticResult {
  const competencyScores: Record<string, number> = {};
  const correctCounts: Record<string, number> = {};
  const questionCounts: Record<string, number> = {};
  const criticalRisks = new Set<DiagnosticCompetencyId>();
  let answered = 0;
  let correct = 0;

  for (const question of assessment.questions) {
    questionCounts[question.competencyId] = (questionCounts[question.competencyId] ?? 0) + 1;
    const selectedId = responses[question.id];
    if (!selectedId) continue;

    answered++;
    const selected = question.options.find((option) => option.id === selectedId);
    if (selected?.isCorrect) {
      correct++;
      correctCounts[question.competencyId] = (correctCounts[question.competencyId] ?? 0) + 1;
    } else if (question.critical) {
      criticalRisks.add(question.competencyId);
    }
  }

  for (const [competencyId, totalQuestions] of Object.entries(questionCounts)) {
    competencyScores[competencyId] = (correctCounts[competencyId] ?? 0) / totalQuestions;
  }

  const complete = answered === assessment.questions.length;
  const score = complete && assessment.questions.length > 0
    ? correct / assessment.questions.length
    : null;

  const strengths = Object.entries(competencyScores)
    .filter(([, value]) => value === 1)
    .map(([id]) => id as DiagnosticCompetencyId);
  const gaps = Object.entries(competencyScores)
    .filter(([, value]) => value < 1)
    .map(([id]) => id as DiagnosticCompetencyId);

  return {
    assessmentId: assessment.id,
    assessmentVersion: assessment.version,
    answered,
    total: assessment.questions.length,
    score,
    complete,
    competencyScores,
    strengths,
    gaps,
    criticalRisks: [...criticalRisks],
  };
}

export function validateDiagnosticAssessment(assessment: DiagnosticAssessment): DiagnosticAssessment {
  if (!assessment.id.trim()) throw new Error('Diagnostic assessment id is required.');
  if (!Number.isInteger(assessment.version) || assessment.version < 1) {
    throw new Error(`Diagnostic ${assessment.id} must have a positive version.`);
  }
  if (!assessment.scenario.trim()) throw new Error(`Diagnostic ${assessment.id} requires an authored scenario.`);
  if (assessment.questions.length === 0) throw new Error(`Diagnostic ${assessment.id} requires questions.`);

  const questionIds = new Set<string>();
  for (const question of assessment.questions) {
    if (questionIds.has(question.id)) throw new Error(`Diagnostic ${assessment.id} has duplicate question ${question.id}.`);
    questionIds.add(question.id);
    if (question.options.length < 2) throw new Error(`Diagnostic question ${question.id} requires at least two options.`);
    if (question.options.filter((option) => option.isCorrect).length !== 1) {
      throw new Error(`Diagnostic question ${question.id} must have exactly one correct option.`);
    }
  }

  return assessment;
}
