import {
  type DiagnosticAssessment,
  validateDiagnosticAssessment,
} from './diagnostic-engine.ts';

export const baselineDiagnostic = validateDiagnosticAssessment({
  id: 'baseline-automation-review',
  version: 1,
  title: 'Baseline: production automation review',
  scenario: `You are reviewing an unfamiliar .NET worker that consumes queued invoice jobs. The worker loads invoice state, calls a supplier API, asks a bounded AI policy tool whether a retry is appropriate, writes the result, and emits operational evidence. Assume this is production code: choose the most important review judgement for each independent concern.`,
  questions: [
    {
      id: 'baseline-nullability',
      competencyId: 'nullability',
      critical: false,
      prompt: 'A supplier lookup can return no matching account, but the method returns SupplierAccount and callers dereference it immediately. What is the strongest review?',
      options: [
        { id: 'ignore', label: 'Leave it: reference types are nullable at runtime anyway.', isCorrect: false },
        { id: 'model-null', label: 'Model absence explicitly in the return type and force callers to handle the null path.', isCorrect: true },
        { id: 'catch', label: 'Catch NullReferenceException around the caller.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-cancellation',
      competencyId: 'cancellation',
      critical: true,
      prompt: 'The queue callback receives a CancellationToken, but database and HTTP calls use CancellationToken.None. What should change?',
      options: [
        { id: 'propagate', label: 'Propagate the callback token through async I/O so shutdown and abandoned work can stop cooperatively.', isCorrect: true },
        { id: 'timeout-only', label: 'Ignore cancellation and rely only on HTTP timeouts.', isCorrect: false },
        { id: 'thread-abort', label: 'Abort the worker thread when shutdown starts.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-di',
      competencyId: 'di-lifetime',
      critical: true,
      prompt: 'A singleton BackgroundService directly injects a scoped repository backed by a DbContext. What is the production-safe approach?',
      options: [
        { id: 'singleton-db', label: 'Make the DbContext singleton too so all jobs share one instance.', isCorrect: false },
        { id: 'scope-per-job', label: 'Create a scope per unit of work and resolve scoped dependencies inside that scope.', isCorrect: true },
        { id: 'static', label: 'Move the repository into a static helper.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-async',
      competencyId: 'async-correctness',
      critical: true,
      prompt: 'Inside an async processing path, code calls supplierClient.GetAsync(...).Result. What is the best review?',
      options: [
        { id: 'await', label: 'Await the asynchronous operation end-to-end instead of blocking on Result.', isCorrect: true },
        { id: 'task-run', label: 'Wrap the Result call in Task.Run.', isCorrect: false },
        { id: 'fine', label: 'Result is preferable because it makes ordering explicit.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-query',
      competencyId: 'persistence-query',
      critical: false,
      prompt: 'To find one invoice by external id, the repository loads every invoice with ToListAsync and then searches in memory. What is preferable?',
      options: [
        { id: 'server-query', label: 'Express the predicate in the database query and fetch only the required row/projection.', isCorrect: true },
        { id: 'parallel', label: 'Keep loading all rows but search them with PLINQ.', isCorrect: false },
        { id: 'cache-all', label: 'Cache the entire table forever to avoid future queries.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-idempotency',
      competencyId: 'idempotency',
      critical: true,
      prompt: 'The queue can redeliver a message after a timeout, and processing immediately sends a supplier request with no duplicate guard. What is missing?',
      options: [
        { id: 'idempotency-key', label: 'Use a durable idempotency/processed-message boundary so the same logical job cannot repeat side effects.', isCorrect: true },
        { id: 'retry-more', label: 'Increase the queue retry count so duplicates become less likely.', isCorrect: false },
        { id: 'memory-set', label: 'Track processed ids only in an in-memory HashSet.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-observability',
      competencyId: 'observability',
      critical: false,
      prompt: 'Failures are logged as "job failed" without job id, supplier id, operation, or duration. What is the strongest improvement?',
      options: [
        { id: 'structured', label: 'Emit structured, correlation-friendly operational evidence around the job and external boundary.', isCorrect: true },
        { id: 'stack-only', label: 'Only log the exception stack trace because other fields duplicate business data.', isCorrect: false },
        { id: 'console', label: 'Use Console.WriteLine so logs remain simple.', isCorrect: false },
      ],
    },
    {
      id: 'baseline-tool',
      competencyId: 'tool-authority',
      critical: true,
      prompt: 'An AI tool can return "retry", "cancel invoice", or "refund customer", and the worker executes the returned action directly. What is the safest design?',
      options: [
        { id: 'bounded', label: 'Constrain the tool to a narrow decision contract and keep consequential actions behind deterministic application policy/authorization.', isCorrect: true },
        { id: 'prompt', label: 'Keep all actions available but strengthen the system prompt.', isCorrect: false },
        { id: 'temperature', label: 'Set temperature to zero and allow direct execution.', isCorrect: false },
      ],
    },
  ],
} satisfies DiagnosticAssessment);
