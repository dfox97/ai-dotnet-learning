import {
  type DiagnosticAssessment,
  validateDiagnosticAssessment,
} from './diagnostic-engine.ts';

export const baselineDiagnostic = validateDiagnosticAssessment({
  id: 'baseline-production-review',
  version: 1,
  title: 'Production .NET review baseline',
  scenario: `You are reviewing an automation API that receives a job request, stores it, and invokes an external worker. The code was generated quickly and looks plausible. Treat this as an unseen production review: choose the concern you would prioritise in each situation.`,
  questions: [
    {
      id: 'baseline-nullability',
      competencyId: 'nullability',
      critical: false,
      prompt: 'A request model marks CustomerId as non-nullable, but the endpoint accepts the body without runtime validation. What is the best review comment?',
      options: [
        { id: 'nullable-is-enough', label: 'Nullable reference types guarantee clients supplied a value at runtime.', isCorrect: false },
        { id: 'validate-boundary', label: 'Keep nullability enabled, but also validate the inbound request contract at the boundary.', isCorrect: true },
        { id: 'disable-nullability', label: 'Disable nullable reference types so missing values can flow naturally.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-cancellation',
      competencyId: 'cancellation',
      critical: true,
      prompt: 'The endpoint receives a CancellationToken but calls repository and HTTP methods with CancellationToken.None. What is the production risk?',
      options: [
        { id: 'none-is-fine', label: 'None is preferable because downstream work should always finish.', isCorrect: false },
        { id: 'propagate-token', label: 'Propagate the caller token so abandoned requests do not continue expensive or external work unnecessarily.', isCorrect: true },
        { id: 'only-http', label: 'Only the final HTTP call needs cancellation; persistence should ignore it.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-di-lifetime',
      competencyId: 'di-lifetime',
      critical: true,
      prompt: 'A singleton background coordinator directly captures a scoped DbContext-backed repository. What should you flag?',
      options: [
        { id: 'singleton-fast', label: 'Singleton is ideal because constructing repositories is expensive.', isCorrect: false },
        { id: 'scope-boundary', label: 'The lifetime boundary is invalid; create/use an appropriate scope instead of capturing scoped state in a singleton.', isCorrect: true },
        { id: 'transient-db', label: 'Change DbContext itself to transient and keep the singleton coordinator unchanged.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-async',
      competencyId: 'async-correctness',
      critical: true,
      prompt: 'Inside an async handler, generated code reads task.Result before continuing. What is the strongest review response?',
      options: [
        { id: 'result-clearer', label: 'Result is clearer than await and avoids state-machine overhead.', isCorrect: false },
        { id: 'await-flow', label: 'Keep the flow async end-to-end and await the task; sync-over-async can block threads and complicate failure/cancellation behaviour.', isCorrect: true },
        { id: 'task-run', label: 'Wrap Result in Task.Run so it becomes asynchronous again.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-query',
      competencyId: 'persistence-query',
      critical: false,
      prompt: 'To process one job, the repository materialises every pending row and filters by id in memory. What is the preferred change?',
      options: [
        { id: 'keep-list', label: 'Keep it; databases are optimised for returning full tables.', isCorrect: false },
        { id: 'target-query', label: 'Push the predicate into the database query and fetch only the requested eligible row.', isCorrect: true },
        { id: 'cache-all', label: 'Load all rows once and keep them in a static cache forever.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-idempotency',
      competencyId: 'idempotency',
      critical: true,
      prompt: 'A queue can redeliver the same message, and the handler always calls the external automation service again. What is missing?',
      options: [
        { id: 'nothing', label: 'Nothing; at-least-once delivery means duplicate side effects are expected.', isCorrect: false },
        { id: 'idempotent-boundary', label: 'An idempotency strategy that prevents the same logical job from producing duplicate side effects.', isCorrect: true },
        { id: 'longer-timeout', label: 'A longer queue visibility timeout is sufficient idempotency protection.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-observability',
      competencyId: 'observability',
      critical: false,
      prompt: 'The handler catches Exception, returns false, and records no structured event. What should change?',
      options: [
        { id: 'silent-failure', label: 'Returning false is enough because callers can infer the cause.', isCorrect: false },
        { id: 'evidence', label: 'Preserve useful failure semantics and record structured, correlated evidence for the job outcome.', isCorrect: true },
        { id: 'console', label: 'Write only the exception message to Console.WriteLine.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-tool-authority',
      competencyId: 'tool-authority',
      critical: true,
      prompt: 'An AI decision step can choose Continue, Retry, or PermanentlyDeleteJob and the code executes any choice directly. What is the key concern?',
      options: [
        { id: 'trust-model', label: 'The model chose the action, so no additional authority boundary is needed.', isCorrect: false },
        { id: 'bounded-authority', label: 'Keep model authority tightly bounded; destructive decisions need deterministic policy or explicit approval outside the model.', isCorrect: true },
        { id: 'bigger-model', label: 'Use a larger model so destructive actions become safe.', isCorrect: false },
      ],
    },
  ],
} satisfies DiagnosticAssessment);
