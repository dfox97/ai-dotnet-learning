import {
  type DiagnosticAssessment,
  type DiagnosticCompetencyId,
  type DiagnosticResult,
  validateDiagnosticAssessment,
} from './diagnostic-engine.ts';

export const postDiagnostic = validateDiagnosticAssessment({
  id: 'post-production-review',
  version: 1,
  title: 'Production .NET mastery review',
  scenario: `You are reviewing a different queue-driven RPA service after completing the learning path. The service loads work from SQL, calls an external vehicle system, and records outcomes. Choose the production concern you would raise first in each case.`,
  questions: [
    {
      id: 'post-nullability', competencyId: 'nullability', critical: false,
      prompt: 'A DTO property is declared string but the value comes from an optional JSON field and is assigned with the null-forgiving operator. What is the better review response?',
      options: [
        { id: 'keep-bang', label: 'Keep ! because it documents that the value should exist.', isCorrect: false },
        { id: 'validate-input', label: 'Validate the external input before creating the non-null domain value; do not use ! to suppress missing evidence.', isCorrect: true },
        { id: 'make-everything-null', label: 'Make every downstream property nullable instead.', isCorrect: false },
      ],
    },
    {
      id: 'post-cancellation', competencyId: 'cancellation', critical: true,
      prompt: 'A BackgroundService passes its stopping token to Task.Delay but not to SQL or HTTP calls. Is shutdown handling complete?',
      options: [
        { id: 'delay-enough', label: 'Yes; cancelling the delay is sufficient.', isCorrect: false },
        { id: 'propagate-all', label: 'No; propagate the token through supported I/O boundaries so in-flight work can stop cooperatively.', isCorrect: true },
        { id: 'throw-first', label: 'No; call ThrowIfCancellationRequested only once at startup.', isCorrect: false },
      ],
    },
    {
      id: 'post-di', competencyId: 'di-lifetime', critical: true,
      prompt: 'A singleton hosted service resolves a scoped handler once in its constructor and keeps it forever. What should change?',
      options: [
        { id: 'keep-handler', label: 'Nothing; resolving through DI makes every lifetime safe.', isCorrect: false },
        { id: 'scope-per-work', label: 'Create a scope for each unit of work and resolve the scoped handler inside that boundary.', isCorrect: true },
        { id: 'static-handler', label: 'Make the handler static to avoid DI lifetime rules.', isCorrect: false },
      ],
    },
    {
      id: 'post-async', competencyId: 'async-correctness', critical: true,
      prompt: 'Generated retry code calls an async method without awaiting it, then immediately acknowledges the queue message. What is the primary risk?',
      options: [
        { id: 'parallel-good', label: 'None; fire-and-forget always improves throughput.', isCorrect: false },
        { id: 'lost-ordering', label: 'Failure and ordering are lost; acknowledge only after the intended async side effect has completed successfully.', isCorrect: true },
        { id: 'gc-only', label: 'The only risk is extra garbage collection.', isCorrect: false },
      ],
    },
    {
      id: 'post-query', competencyId: 'persistence-query', critical: false,
      prompt: 'A dashboard query uses AsEnumerable before Where and Take. What does that change?',
      options: [
        { id: 'faster-sql', label: 'It forces EF to generate faster SQL.', isCorrect: false },
        { id: 'client-boundary', label: 'It moves later operators to client-side enumeration, so filtering/limiting may happen after data leaves the database.', isCorrect: true },
        { id: 'tracking-off', label: 'It only disables change tracking.', isCorrect: false },
      ],
    },
    {
      id: 'post-idempotency', competencyId: 'idempotency', critical: true,
      prompt: 'A worker writes “started” to SQL, calls a browser automation service, then crashes before “completed”. The message is redelivered. What protects the business side effect?',
      options: [
        { id: 'catch', label: 'A broad catch block around the whole worker.', isCorrect: false },
        { id: 'idempotency-key', label: 'A durable idempotency strategy tied to the logical job and the external action.', isCorrect: true },
        { id: 'sleep', label: 'A delay before retrying.', isCorrect: false },
      ],
    },
    {
      id: 'post-observability', competencyId: 'observability', critical: false,
      prompt: 'A failure log contains only “Something went wrong”. What evidence is missing?',
      options: [
        { id: 'stack-only', label: 'Only a full stack trace; structured context is unnecessary.', isCorrect: false },
        { id: 'correlation', label: 'Structured outcome, stable job/correlation identifiers, severity and useful failure context without unnecessary sensitive data.', isCorrect: true },
        { id: 'console-color', label: 'A coloured console message.', isCorrect: false },
      ],
    },
    {
      id: 'post-tool', competencyId: 'tool-authority', critical: true,
      prompt: 'A model returns an enum that includes ApproveRefund and the handler executes it directly. What design change matters most?',
      options: [
        { id: 'prompt-hard', label: 'Add stronger wording telling the model not to make mistakes.', isCorrect: false },
        { id: 'policy-boundary', label: 'Put consequential authority behind deterministic policy/approval and keep the model output advisory or tightly bounded.', isCorrect: true },
        { id: 'temperature-zero', label: 'Set temperature to zero and keep direct execution.', isCorrect: false },
      ],
    },
  ],
} satisfies DiagnosticAssessment);

export type CompetencyChange = {
  competencyId: DiagnosticCompetencyId;
  baseline: number;
  post: number;
  delta: number;
};

export type MasteryAssessment = {
  mastered: boolean;
  overallImprovement: number | null;
  competencyChanges: CompetencyChange[];
  unresolvedCriticalCompetencies: DiagnosticCompetencyId[];
  remediationActivityIds: string[];
};

const remediationByCompetency: Record<DiagnosticCompetencyId, string[]> = {
  nullability: ['compiler-nullability'],
  cancellation: ['async-reliability', 'automation-production'],
  'di-lifetime': ['di-composition', 'di-lifetimes'],
  'async-correctness': ['async-reliability', 'singleton-translation'],
  'persistence-query': ['data-sql'],
  idempotency: ['automation-production'],
  observability: ['readable-architecture'],
  'tool-authority': ['agentic-dotnet'],
};

export function assessMastery(
  baseline: DiagnosticResult,
  post: DiagnosticResult,
  passingScore = 0.75,
): MasteryAssessment {
  const competencyIds = Object.keys(post.competencyScores) as DiagnosticCompetencyId[];
  const competencyChanges = competencyIds.map((competencyId) => {
    const baselineScore = baseline.competencyScores[competencyId] ?? 0;
    const postScore = post.competencyScores[competencyId] ?? 0;
    return { competencyId, baseline: baselineScore, post: postScore, delta: postScore - baselineScore };
  });
  const unresolvedCriticalCompetencies = [...post.criticalRisks];
  const remediationActivityIds = [...new Set(
    unresolvedCriticalCompetencies.flatMap((competencyId) => remediationByCompetency[competencyId]),
  )];
  const overallImprovement = baseline.score === null || post.score === null ? null : post.score - baseline.score;
  const mastered = post.complete
    && post.score !== null
    && post.score >= passingScore
    && unresolvedCriticalCompetencies.length === 0;

  return {
    mastered,
    overallImprovement,
    competencyChanges,
    unresolvedCriticalCompetencies,
    remediationActivityIds,
  };
}
