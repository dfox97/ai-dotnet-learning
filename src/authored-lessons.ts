export type Finding = {
  line: number;
  title: string;
  severity: 'blocker' | 'warning' | 'suggestion';
  explanation: string;
  better: string;
};

export type Quiz = {
  question: string;
  code?: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type DecisionLab = {
  title: string;
  scenario: string;
  question: string;
  options: {
    label: string;
    detail: string;
    correct: boolean;
    feedback: string;
  }[];
  takeaway: string;
};

export type Lesson = {
  id: string;
  number: string;
  title: string;
  eyebrow: string;
  duration: string;
  difficulty: 'Foundation' | 'Core' | 'Production';
  summary: string;
  outcome: string;
  concepts: { title: string; body: string; node: string }[];
  callout: { label: string; title: string; body: string };
  fileName: string;
  code: string;
  prompt: string;
  findings: Finding[];
  quiz: Quiz;
  decisionLab?: DecisionLab;
};

export const lessons: Lesson[] = [
  {
    id: 'csharp-foundations',
    number: '01',
    title: 'C# without the ceremony',
    eyebrow: 'Language foundations',
    duration: '35 min',
    difficulty: 'Foundation',
    summary: 'Map your TypeScript instincts onto C# types, records, collections and LINQ—then review a deceptively simple domain model.',
    outcome: 'Read everyday C# and spot mutation, nullability and equality mistakes.',
    concepts: [
      {
        title: 'Nominal types',
        body: 'C# usually cares about the declared type, not just its shape. Interfaces are explicit contracts; classes do not become compatible because their members happen to match.',
        node: 'Unlike TypeScript structural typing',
      },
      {
        title: 'Records and value equality',
        body: 'record and record struct generate value-based equality and concise copy syntax. Use records for data-shaped values; use classes when identity and lifecycle matter.',
        node: 'Think readonly DTO plus equality',
      },
      {
        title: 'LINQ is lazy by default',
        body: 'Where and Select build IEnumerable pipelines. Execution happens when you enumerate or materialise with ToList, ToArray or similar. Re-enumeration may repeat work.',
        node: 'Like lazy iterable chains, not Array.map',
      },
    ],
    callout: {
      label: 'Compiler advantage',
      title: 'Types exist at runtime',
      body: 'C# generics and type metadata survive compilation. The runtime can inspect types, enforce generic constraints and compile specialised machine code. TypeScript types are erased before Node.js runs.',
    },
    fileName: 'VehicleJob.cs',
    prompt: 'This model crosses an API boundary and is later used as a dictionary key. Select every line you would comment on before approving.',
    code: `public class VehicleJob
{
    public string Registration { get; set; }
    public string? BranchCode { get; set; }
    public List<string> Steps { get; set; } = new();

    public VehicleJob(string registration)
    {
        Registration = registration;
    }
}

var job = new VehicleJob("NG24 ABC");
var copy = new VehicleJob("NG24 ABC");
Console.WriteLine(job == copy);`,
    findings: [
      {
        line: 1,
        title: 'Identity semantics do not fit this value',
        severity: 'warning',
        explanation: 'A class uses reference equality, so two jobs with identical data compare unequal. For an API value used as a key, that is surprising and error-prone.',
        better: 'Use a sealed record (or define equality deliberately) for value semantics.',
      },
      {
        line: 3,
        title: 'Required data is mutable',
        severity: 'warning',
        explanation: 'Any caller can replace Registration after construction, invalidating a dictionary key and breaking domain invariants.',
        better: 'Use an init accessor or a positional record and validate at creation.',
      },
      {
        line: 5,
        title: 'Mutable collection escapes',
        severity: 'suggestion',
        explanation: 'Callers can change the list at any time. That makes state transitions invisible and unsafe if the value is shared.',
        better: 'Expose IReadOnlyList<string> and keep mutation behind a method, or use an immutable collection.',
      },
      {
        line: 15,
        title: 'Equality assumption is wrong',
        severity: 'blocker',
        explanation: 'This prints False because class equality is reference-based unless overridden. A record would print True for equal components.',
        better: 'Choose the equality semantics in the type definition; do not patch individual comparisons.',
      },
    ],
    quiz: {
      question: 'What does the final Console.WriteLine print?',
      options: ['True, because all properties match', 'False, because these are different class instances', 'It does not compile because BranchCode is null'],
      answer: 1,
      explanation: 'Classes inherit reference equality by default. Nullable annotations produce analysis warnings, not a runtime null ban. A record would provide value equality.',
    },
  },
  {
    id: 'compiler-nullability',
    number: '02',
    title: 'Make the compiler your reviewer',
    eyebrow: 'Compiler & type system',
    duration: '40 min',
    difficulty: 'Core',
    summary: 'Understand Roslyn, nullable reference analysis, warnings-as-errors, pattern matching and why the compiler is more useful than a transpiler.',
    outcome: 'Interpret compiler diagnostics and design APIs that make invalid states hard to express.',
    concepts: [
      {
        title: 'Roslyn compilation',
        body: 'The C# compiler parses source into syntax trees, binds names and types, runs flow analysis and emits Common Intermediate Language. The CLR later JIT-compiles hot methods to native code.',
        node: 'tsc + static analysis + IL emission',
      },
      {
        title: 'Nullable flow analysis',
        body: 'string means “not expected to be null”; string? means “maybe null”. The compiler tracks branches and warns on unsafe dereferences. The annotation is a compile-time contract, not a runtime guard.',
        node: 'Comparable to strictNullChecks, but flow-rich',
      },
      {
        title: 'Exhaustive shapes',
        body: 'Pattern matching can narrow types, inspect properties and match relational ranges. Switch expressions make branching data-oriented and produce diagnostics when arms are unreachable.',
        node: 'Discriminated-union thinking',
      },
    ],
    callout: {
      label: 'Build pipeline',
      title: 'Source → IL → native code',
      body: 'dotnet build invokes MSBuild and Roslyn. Assemblies contain IL plus metadata. At execution, CoreCLR loads assemblies and tiered JIT compilation optimises frequently used methods. Native AOT is an alternative deployment model with tradeoffs around reflection and startup.',
    },
    fileName: 'JobParser.cs',
    prompt: 'Nullable is enabled and warnings fail the build. Review this parser. Select the lines where the type contract or flow analysis exposes a real defect.',
    code: `#nullable enable
public sealed record Job(string Id, string Branch);

public static Job Parse(JsonElement payload)
{
    string? id = payload.GetProperty("id").GetString();
    var branch = payload.GetProperty("branch").GetString();

    if (id == null)
        throw new ArgumentException("Missing id");

    return new Job(id, branch);
}

public static int LabelLength(Job? job)
{
    return job.Branch.Length;
}`,
    findings: [
      {
        line: 7,
        title: 'Inferred type is still nullable',
        severity: 'warning',
        explanation: 'var preserves the expression’s static type. GetString returns string?, so branch is nullable even though the keyword does not show it.',
        better: 'Validate branch before constructing Job, or centralise required-property parsing.',
      },
      {
        line: 12,
        title: 'Non-null contract receives maybe-null',
        severity: 'blocker',
        explanation: 'Job declares Branch as string, but branch remains string?. With warnings as errors this does not build; without that policy it pushes a null into a non-null contract.',
        better: 'Check branch is not null and only then construct the record.',
      },
      {
        line: 17,
        title: 'Nullable parameter dereferenced',
        severity: 'blocker',
        explanation: 'job is declared Job? and no guard narrows it before accessing Branch. This can throw NullReferenceException.',
        better: 'Reject null with ArgumentNullException.ThrowIfNull(job), pattern-match it, or make the parameter non-nullable.',
      },
    ],
    quiz: {
      question: 'With nullable enabled, what is the static type of branch when declared with var?',
      code: 'var branch = payload.GetProperty("branch").GetString();',
      options: ['string', 'string?', 'object?'],
      answer: 1,
      explanation: 'var is not dynamic and does not remove nullability. It asks the compiler to write the exact inferred static type, which is string? here.',
    },
  },
  {
    id: 'async-reliability',
    number: '03',
    title: 'Async that can stop safely',
    eyebrow: 'Tasks, cancellation & resources',
    duration: '45 min',
    difficulty: 'Core',
    summary: 'Replace Promise-shaped assumptions with Task semantics, cancellation propagation, deterministic disposal and observable failures.',
    outcome: 'Review background automation code for hangs, leaks and swallowed failures.',
    concepts: [
      {
        title: 'Task is not a thread',
        body: 'An async method runs synchronously until an incomplete await. Task represents eventual completion; I/O completion does not need a blocked thread. CPU work does not become asynchronous by adding async.',
        node: 'Promise-like result, stronger conventions',
      },
      {
        title: 'Cancellation is cooperative',
        body: 'CancellationToken is passed down the call chain. Operations observe it and usually throw OperationCanceledException. A token does nothing merely because it exists.',
        node: 'Structured AbortSignal propagation',
      },
      {
        title: 'Deterministic cleanup',
        body: 'using and await using compile to try/finally disposal. Streams, database contexts and browser sessions release resources at a known point instead of waiting for garbage collection.',
        node: 'Explicit lifecycle beyond Node GC',
      },
    ],
    callout: {
      label: 'Runtime advantage',
      title: 'Thread-pool and I/O integration',
      body: 'The CLR thread pool, async state machines and OS I/O completion work together. Unlike Node’s single JavaScript event loop, server code may resume on different pool threads—shared mutable state therefore needs deliberate synchronisation.',
    },
    fileName: 'AutomationRunner.cs',
    prompt: 'This worker runs unattended in production. Review its cancellation, failure and resource behavior.',
    code: `public async Task RunAsync(CancellationToken stoppingToken)
{
    while (true)
    {
        try
        {
            var client = new HttpClient();
            var work = GetNextJobAsync();
            ProcessAsync(work.Result);
            await Task.Delay(TimeSpan.FromSeconds(10));
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
        }
    }
}`,
    findings: [
      {
        line: 3,
        title: 'Loop ignores shutdown',
        severity: 'blocker',
        explanation: 'The loop never observes stoppingToken, so deployment shutdown can hang or terminate work abruptly.',
        better: 'Loop while !stoppingToken.IsCancellationRequested and pass the token into every cancellable operation.',
      },
      {
        line: 7,
        title: 'HttpClient lifecycle causes socket churn',
        severity: 'warning',
        explanation: 'Creating a client per iteration loses connection pooling and can exhaust sockets under load.',
        better: 'Inject HttpClient from IHttpClientFactory (typically via a typed client).',
      },
      {
        line: 9,
        title: 'Sync-over-async can deadlock or starve',
        severity: 'blocker',
        explanation: '.Result blocks a thread and wraps failures. The method is already async, so there is no reason to block.',
        better: 'var work = await GetNextJobAsync(stoppingToken).',
      },
      {
        line: 10,
        title: 'Fire-and-forget loses failure and ordering',
        severity: 'blocker',
        explanation: 'ProcessAsync is not awaited. The loop continues, exceptions become unobserved, and jobs can overlap unexpectedly.',
        better: 'await ProcessAsync(work, stoppingToken). Make concurrency explicit if it is required.',
      },
      {
        line: 11,
        title: 'Delay cannot be cancelled',
        severity: 'warning',
        explanation: 'Shutdown waits up to ten seconds because the token is not passed to Task.Delay.',
        better: 'await Task.Delay(interval, stoppingToken).',
      },
      {
        line: 13,
        title: 'Catch-all hides cancellation and failures',
        severity: 'blocker',
        explanation: 'Cancellation is swallowed and every failure becomes an unstructured string, creating an infinite retry loop with no operational signal.',
        better: 'Let expected cancellation exit; log failures structurally and apply an intentional retry policy at the correct boundary.',
      },
    ],
    quiz: {
      question: 'What does calling an async method do before its first incomplete await?',
      options: ['Always schedules it on a new thread', 'Runs it synchronously on the current thread', 'Queues it exclusively on the Node-style event loop'],
      answer: 1,
      explanation: 'async does not mean “new thread”. Execution is synchronous until an awaited operation is incomplete; the compiler-generated state machine arranges the continuation.',
    },
  },
  {
    id: 'aspnet-rest',
    number: '04',
    title: 'APIs with explicit contracts',
    eyebrow: 'ASP.NET Core & REST',
    duration: '50 min',
    difficulty: 'Core',
    summary: 'Build the HTTP layer: dependency injection, endpoint contracts, status codes, middleware, validation and request-scoped behavior.',
    outcome: 'Review an ASP.NET endpoint for correctness rather than just “returns JSON”.',
    concepts: [
      {
        title: 'Built-in dependency injection',
        body: 'Services register as singleton, scoped or transient. ASP.NET creates one scope per request. Dependencies are declared in constructors or endpoint parameters and resolved by the host.',
        node: 'Framework-level provider, not import mocking',
      },
      {
        title: 'Typed HTTP results',
        body: 'Minimal APIs can return Results or typed unions such as Results<Ok<Job>, NotFound>. Types document possible responses and improve OpenAPI metadata.',
        node: 'Resolvers become HTTP-specific contracts',
      },
      {
        title: 'Middleware pipeline',
        body: 'Middleware wraps later handlers, so ordering controls exception handling, authentication, authorisation, CORS and endpoints. It is an explicit request pipeline.',
        node: 'Like ordered Express middleware',
      },
    ],
    callout: {
      label: 'REST shift',
      title: 'The transport contract matters',
      body: 'GraphQL often returns 200 with field-level errors. REST uses method semantics, status codes, headers and representation formats directly. Idempotency, resource naming, 201 Location and problem details are part of the API contract.',
    },
    fileName: 'Program.cs',
    prompt: 'Review this production endpoint. Focus on HTTP semantics, dependency lifetimes and async behavior.',
    code: `var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<JobsDbContext>();
var app = builder.Build();

app.MapPost("/jobs", async (JobDto dto, JobsDbContext db) =>
{
    var job = new Job(dto.Id, dto.Branch);
    db.Jobs.Add(job);
    db.SaveChangesAsync();
    return Results.Ok(job);
});

app.MapGet("/jobs/{id}", (string id, JobsDbContext db) =>
    Results.Ok(db.Jobs.First(x => x.Id == id)));

app.Run();`,
    findings: [
      {
        line: 2,
        title: 'DbContext must not be singleton',
        severity: 'blocker',
        explanation: 'DbContext is not thread-safe. A singleton is shared by concurrent requests and keeps tracked entities indefinitely.',
        better: 'Register the provider with AddDbContext, which uses a scoped lifetime by default.',
      },
      {
        line: 9,
        title: 'Database write is not awaited',
        severity: 'blocker',
        explanation: 'The response can return before persistence completes; failures escape the request and the returned job may not exist in the database.',
        better: 'await db.SaveChangesAsync(cancellationToken).',
      },
      {
        line: 10,
        title: 'Creation returns the wrong HTTP contract',
        severity: 'warning',
        explanation: 'A successful resource creation should normally return 201 Created and a Location header, not generic 200 OK.',
        better: 'Return Results.Created($"/jobs/{job.Id}", job).',
      },
      {
        line: 14,
        title: 'Missing row becomes a 500',
        severity: 'blocker',
        explanation: 'First throws when no job exists. That turns a normal lookup miss into an internal server error.',
        better: 'Use SingleOrDefaultAsync and return NotFound when null.',
      },
    ],
    quiz: {
      question: 'Which lifetime normally matches an EF Core DbContext in an ASP.NET request?',
      options: ['Singleton', 'Scoped', 'Transient only'],
      answer: 1,
      explanation: 'One scoped context per request provides a unit of work and avoids cross-request concurrent access. AddDbContext registers it as scoped by default.',
    },
  },
  {
    id: 'data-sql',
    number: '05',
    title: 'SQL beneath the abstraction',
    eyebrow: 'EF Core & relational data',
    duration: '50 min',
    difficulty: 'Production',
    summary: 'Learn change tracking, LINQ translation, migrations, indexes, transactions and the point where an ORM stops protecting you.',
    outcome: 'Predict generated queries and spot N+1, over-fetching and transaction errors.',
    concepts: [
      {
        title: 'IQueryable is an expression',
        body: 'LINQ over DbSet builds an expression tree. EF translates supported operations into SQL when the query is executed. The database—not C#—does the filtering and projection.',
        node: 'More like a query builder than Array.filter',
      },
      {
        title: 'Tracking has a cost',
        body: 'Tracked entities enable updates and relationship fix-up. Read-only endpoints usually benefit from AsNoTracking and projection into response shapes.',
        node: 'Identity map inside the request scope',
      },
      {
        title: 'Migrations are deployable code',
        body: 'A migration describes schema change, but production safety still needs review: locking, backfills, index creation and old/new application compatibility.',
        node: 'Schema history plus generated operations',
      },
    ],
    callout: {
      label: 'Review habit',
      title: 'Ask what SQL executes',
      body: 'A clean LINQ expression can still scan a table, issue one query per row or materialise thousands of columns. Review query shape, cardinality and indexes; use ToQueryString and database execution plans when the answer matters.',
    },
    fileName: 'JobQueries.cs',
    prompt: 'This powers a busy operations dashboard. Select the lines that create correctness or scaling problems.',
    code: `public async Task<List<JobSummary>> GetOpenJobs()
{
    var jobs = await _db.Jobs
        .Include(x => x.Events)
        .ToListAsync();

    return jobs
        .Where(x => x.Status == "Open")
        .Select(x => new JobSummary(
            x.Id,
            x.Events.Last().CreatedAt,
            x.Events.Count))
        .ToList();
}`,
    findings: [
      {
        line: 4,
        title: 'Include over-fetches a full collection',
        severity: 'warning',
        explanation: 'Every event column for every job is loaded and tracked, although the response only needs a timestamp and count.',
        better: 'Project the required aggregates in the database rather than Include the collection.',
      },
      {
        line: 5,
        title: 'Query executes before filtering',
        severity: 'blocker',
        explanation: 'ToListAsync materialises all jobs and events. Everything after it runs in memory, so data transfer and memory grow with the whole table.',
        better: 'Keep Where and Select on IQueryable, then call ToListAsync once at the end.',
      },
      {
        line: 8,
        title: 'Filter runs in process',
        severity: 'warning',
        explanation: 'Because line 5 already materialised the query, the database cannot use an index on Status.',
        better: 'Move Where before materialisation and index the selective query path when justified.',
      },
      {
        line: 12,
        title: 'Last has no defined order',
        severity: 'blocker',
        explanation: 'Relational collections are unordered. Last without OrderBy does not mean most recent and may fail translation in a database query.',
        better: 'Use Events.Max(e => e.CreatedAt), or OrderByDescending(...).Select(...).FirstOrDefault() with explicit empty behavior.',
      },
    ],
    quiz: {
      question: 'At what point does this EF Core query normally execute?',
      code: 'var query = db.Jobs.Where(j => j.Status == "Open");',
      options: ['At the Where call', 'When query is assigned', 'When it is enumerated or materialised'],
      answer: 2,
      explanation: 'IQueryable operators build an expression tree. Execution is deferred until enumeration, ToListAsync, FirstAsync, CountAsync or another terminal operation.',
    },
    decisionLab: {
      title: 'Shape the query before it ships',
      scenario: 'A read-only dashboard needs 50 open jobs with only Id, Branch and the latest event timestamp.',
      question: 'Which query shape gives the database the clearest, bounded job?',
      options: [
        {
          label: 'Load entities and Include every event',
          detail: 'Include Events, call ToListAsync, then filter and map in C#.',
          correct: false,
          feedback: 'This transfers and tracks a much larger graph than the response needs, then throws away most of it.',
        },
        {
          label: 'Filter, project and limit in IQueryable',
          detail: 'Where → OrderBy → Select DTO with Max → Take(50) → ToListAsync.',
          correct: true,
          feedback: 'Correct. Filtering, projection, aggregation and the result bound remain visible to EF for SQL translation.',
        },
        {
          label: 'Switch to AsEnumerable first',
          detail: 'Use AsEnumerable, then apply the dashboard filters with normal LINQ.',
          correct: false,
          feedback: 'AsEnumerable moves subsequent operators to client-side execution. It is an explicit translation boundary, not a performance switch.',
        },
      ],
      takeaway: 'Review IQueryable from the terminal operation backwards: what executes in SQL, how many rows return, which columns return, and whether the result is tracked.',
    },
  },
  {
    id: 'automation-production',
    number: '06',
    title: 'Ship an automation worker',
    eyebrow: 'Workers, Docker & Azure',
    duration: '55 min',
    difficulty: 'Production',
    summary: 'Put the pieces together in a durable RPA worker: idempotency, hosted services, structured logs, containers, configuration and Azure identity.',
    outcome: 'Review a bot as an operable production system, not a script that works once.',
    concepts: [
      {
        title: 'Hosted worker lifecycle',
        body: 'BackgroundService participates in host startup and graceful shutdown. ExecuteAsync owns the long-running loop and receives the host cancellation token.',
        node: 'Managed process lifecycle around the loop',
      },
      {
        title: 'Idempotency before retries',
        body: 'A retry can repeat any side effect whose success was not observed. Give each job an identity, record transitions durably and make handlers safe to invoke again.',
        node: 'Reliability property, not a retry-library setting',
      },
      {
        title: 'Cloud-native configuration',
        body: 'Options bind environment-specific configuration. Secrets belong in Key Vault or platform secret stores; DefaultAzureCredential gives local developer identity and managed identity in Azure without embedded credentials.',
        node: 'One code path, environment-provided identity',
      },
    ],
    callout: {
      label: 'Deployment map',
      title: 'Container Apps is a strong worker default',
      body: 'For a containerised queue-driven worker, Azure Container Apps can scale from queue rules and use managed identity. Functions fits short event handlers; App Service fits web apps; AKS is justified only when Kubernetes control is genuinely required.',
    },
    fileName: 'VehicleBot.cs',
    prompt: 'Final review: this bot is being containerised and deployed to Azure. Find the operational and security blockers.',
    code: `public sealed class VehicleBot : BackgroundService
{
    private readonly string _connection =
        "Server=prod;User=bot;Password=P@ssword1";

    protected override async Task ExecuteAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            var job = await _queue.ReceiveAsync();
            await _browser.UpdateVehicleAsync(job);
            await _queue.CompleteAsync(job.Id);
            Console.WriteLine($"Completed {job.Id} for {job.Email}");
        }
    }
}`,
    findings: [
      {
        line: 3,
        title: 'Production secret is compiled into the image',
        severity: 'blocker',
        explanation: 'The credential leaks through source, build logs and image layers and cannot be rotated independently.',
        better: 'Use configuration plus managed identity where supported; otherwise resolve the secret from Key Vault/platform secrets.',
      },
      {
        line: 9,
        title: 'Receive cannot observe shutdown',
        severity: 'blocker',
        explanation: 'If ReceiveAsync waits, the host cannot stop gracefully because token is not propagated.',
        better: 'Pass token through ReceiveAsync and every network/browser operation.',
      },
      {
        line: 10,
        title: 'Side effect is not idempotent',
        severity: 'blocker',
        explanation: 'If the vehicle update succeeds and completion fails, delivery repeats and the browser action runs again.',
        better: 'Use a durable idempotency key/checkpoint and design the update so repeated execution is safe.',
      },
      {
        line: 12,
        title: 'Log leaks personal data and structure',
        severity: 'warning',
        explanation: 'Interpolated console output exposes an email and loses queryable fields, severity and correlation context.',
        better: 'Inject ILogger<VehicleBot> and log an approved set of structured fields, avoiding unnecessary personal data.',
      },
    ],
    quiz: {
      question: 'A bot updates a website, then crashes before acknowledging the queue message. What must make the retry safe?',
      options: ['A larger exception catch block', 'Idempotent handling keyed by the job identity', 'A singleton BackgroundService'],
      answer: 1,
      explanation: 'At-least-once delivery means a completed side effect can be retried. Durable idempotency—not merely catching or delaying—prevents duplicate business actions.',
    },
  },
  {
    id: 'di-composition',
    number: '07',
    title: 'Dependency injection that tells the truth',
    eyebrow: 'DI lifetimes & composition',
    duration: '45 min',
    difficulty: 'Core',
    summary: 'Read the composition root, follow object lifetimes and detect service locator, captive dependency and disposal mistakes.',
    outcome: 'Explain why a dependency exists, who owns it and how long it may safely live.',
    concepts: [
      {
        title: 'The composition root',
        body: 'Registration belongs near application startup. The container assembles object graphs; business code declares dependencies through constructors instead of reaching back into IServiceProvider.',
        node: 'Angular providers, but lifetime safety is explicit',
      },
      {
        title: 'Lifetime is part of correctness',
        body: 'Transient creates per resolution, scoped reuses within a scope, and singleton lives for the host. A longer-lived service must not capture a shorter-lived stateful dependency.',
        node: 'Object ownership, not a performance toggle',
      },
      {
        title: 'The container owns disposal',
        body: 'Services created by the container are disposed when their scope ends. Consumers use them but do not dispose injected instances. Factories are for genuinely shorter custom lifetimes.',
        node: 'Construction and cleanup stay symmetrical',
      },
    ],
    callout: {
      label: 'Review invariant',
      title: 'Follow the longest-lived object first',
      body: 'BackgroundService and other hosted services are singletons. To use scoped state such as DbContext, create and dispose a scope per unit of work. Enable scope validation so captive dependencies fail during development.',
    },
    fileName: 'Services.cs',
    prompt: 'This registration passes a quick manual test. Trace ownership and lifetime through the object graph before approving it.',
    code: `builder.Services.AddSingleton<JobCoordinator>();
builder.Services.AddScoped<JobsDbContext>();
builder.Services.AddTransient<VehicleApiClient>();

public sealed class JobCoordinator(
    JobsDbContext db,
    IServiceProvider services)
{
    public async Task RunAsync(CancellationToken token)
    {
        var client = services.GetRequiredService<VehicleApiClient>();
        var job = await db.Jobs.FirstAsync(token);
        await client.ProcessAsync(job, token);
        db.Dispose();
    }
}`,
    findings: [
      {
        line: 1,
        title: 'Singleton captures request-scoped state',
        severity: 'blocker',
        explanation: 'JobCoordinator lives for the host but requires JobsDbContext, which is scoped. The context is effectively promoted and may be used concurrently.',
        better: 'Make the coordinator scoped when it belongs to a request, or create a scope per background work item.',
      },
      {
        line: 6,
        title: 'Captive DbContext is not thread-safe',
        severity: 'blocker',
        explanation: 'The constructor makes the lifetime mismatch visible: one context would be retained across every call to the singleton coordinator.',
        better: 'Resolve scoped work from an explicit IServiceScope created by the hosted-service loop.',
      },
      {
        line: 7,
        title: 'IServiceProvider hides the real graph',
        severity: 'warning',
        explanation: 'Injecting the container enables service locator calls. Reviewers cannot see required dependencies from the constructor and failures move to runtime.',
        better: 'Inject the required service or a narrow, intentional factory instead of the general provider.',
      },
      {
        line: 11,
        title: 'Transient resolved from the root is retained',
        severity: 'warning',
        explanation: 'Because this provider belongs to the singleton graph, disposable transient instances can be captured until host shutdown.',
        better: 'Resolve the client inside the work scope or use IHttpClientFactory/typed-client registration as appropriate.',
      },
      {
        line: 14,
        title: 'Consumer disposes a container-owned service',
        severity: 'blocker',
        explanation: 'The container owns the context lifecycle. Manual disposal can break later calls while the singleton still holds the disposed instance.',
        better: 'Dispose the IServiceScope; it disposes every scoped dependency it created.',
      },
    ],
    quiz: {
      question: 'A singleton BackgroundService needs a new DbContext for each queue message. What should it depend on?',
      options: ['JobsDbContext directly', 'IServiceScopeFactory and a scope per message', 'A static JobsDbContext property'],
      answer: 1,
      explanation: 'Hosted services are singletons. Creating a scope per unit of work gives DbContext a bounded lifetime and lets the container dispose it safely.',
    },
    decisionLab: {
      title: 'Choose the lifetime boundary',
      scenario: 'A queue worker handles jobs concurrently. Each job performs one database transaction and then releases all tracked entities.',
      question: 'Which dependency design preserves that unit-of-work boundary?',
      options: [
        {
          label: 'Inject DbContext into the worker constructor',
          detail: 'Reuse one context for the entire host lifetime.',
          correct: false,
          feedback: 'The singleton worker captures a scoped, non-thread-safe context and shares tracking state across jobs.',
        },
        {
          label: 'Create an IServiceScope per job',
          detail: 'Resolve a scoped handler from the scope and dispose the scope after completion.',
          correct: true,
          feedback: 'Correct. The handler, DbContext and other scoped dependencies share one explicit unit-of-work lifetime.',
        },
        {
          label: 'Register every dependency as singleton',
          detail: 'Make all lifetimes match the worker.',
          correct: false,
          feedback: 'Matching lifetimes by promoting mutable state creates concurrency and retention bugs rather than fixing ownership.',
        },
      ],
      takeaway: 'A lifetime decision answers two questions: what state is shared, and which boundary guarantees cleanup?',
    },
  },
  {
    id: 'readable-architecture',
    number: '08',
    title: 'Code that humans and agents can change safely',
    eyebrow: 'Architecture & guardrails',
    duration: '50 min',
    difficulty: 'Production',
    summary: 'Use options, structured logging, analyzers, small boundaries and behavior-focused tests to make generated changes reviewable.',
    outcome: 'Judge generated .NET code by contracts and evidence rather than plausibility.',
    concepts: [
      {
        title: 'Boring boundaries win',
        body: 'Keep transport, orchestration, domain decisions and infrastructure separate enough to read independently. Prefer a clear vertical slice over speculative layers and generic repositories.',
        node: 'Optimise for local reasoning, not pattern count',
      },
      {
        title: 'Configuration is a contract',
        body: 'Bind related settings to typed options, validate them at startup and keep secrets outside source. A nullable environment string discovered during a job is too late.',
        node: 'Runtime inputs deserve typed validation',
      },
      {
        title: 'Guardrails beat prompt instructions',
        body: 'Nullable warnings, analyzers, compiler errors, focused tests and architecture checks give an AI coding agent fast objective feedback. Prose conventions alone drift.',
        node: 'Executable constraints scale review judgment',
      },
    ],
    callout: {
      label: 'AI-era review',
      title: 'Read contracts, then inspect the diff',
      body: 'Start with public inputs, outputs, lifetime and failure behavior. Check the changed path against compiler diagnostics and a behavior-level test. Generated code is not special: it still owns every side effect and edge case it introduces.',
    },
    fileName: 'JobProcessor.cs',
    prompt: 'An agent generated this “self-contained” processor. Review the boundaries, configuration, cancellation and observability.',
    code: `public static class JobProcessor
{
    public static async Task<bool> Process(string branch)
    {
        var connection = Environment.GetEnvironmentVariable("SQL");

        try
        {
            using var db = new SqlConnection(connection);
            await db.OpenAsync();
            Console.WriteLine("Processing " + branch);
            await UpdateBranch(db, branch);
            return true;
        }
        catch
        {
            return false;
        }
    }
}`,
    findings: [
      {
        line: 1,
        title: 'Static processor hard-wires every dependency',
        severity: 'warning',
        explanation: 'Database access, configuration and logging become global calls, so the behavior is difficult to isolate and its dependencies are invisible.',
        better: 'Use a small injected service with explicit narrow dependencies; do not create layers that add no behavior.',
      },
      {
        line: 3,
        title: 'Public async contract cannot be cancelled',
        severity: 'warning',
        explanation: 'Database open and update work can outlive request or worker shutdown because no CancellationToken enters the call chain.',
        better: 'Accept a token and propagate it through every supported async operation.',
      },
      {
        line: 5,
        title: 'Configuration is late and nullable',
        severity: 'blocker',
        explanation: 'A missing SQL variable is discovered inside live work and connection accepts a possibly null value.',
        better: 'Bind and validate typed options during host startup; inject the resulting configuration contract.',
      },
      {
        line: 11,
        title: 'Console text is not operational telemetry',
        severity: 'warning',
        explanation: 'Concatenated output has no level, event identity or structured Branch field and cannot participate cleanly in centralised logging.',
        better: 'Inject ILogger<JobProcessor> and use a structured message template with an approved data set.',
      },
      {
        line: 15,
        title: 'Catch-all turns every failure into false',
        severity: 'blocker',
        explanation: 'Cancellation, authentication, network and programming failures become indistinguishable and the original diagnostic is lost.',
        better: 'Model expected outcomes explicitly; log or propagate unexpected failures and preserve cancellation semantics.',
      },
    ],
    quiz: {
      question: 'What is the strongest guardrail for AI-generated code that must preserve cancellation behavior?',
      options: ['A prompt saying “remember cancellation”', 'A changed-contract test plus compiler/analyzer feedback', 'A longer method comment'],
      answer: 1,
      explanation: 'Executable checks produce repeatable evidence. Prompts and comments help intent, but they do not fail when an implementation violates the contract.',
    },
    decisionLab: {
      title: 'Keep the architecture proportional',
      scenario: 'A new endpoint validates a registration, loads one job, applies one domain rule and saves it. An agent proposes controllers, mediator, repository, unit of work and six interfaces.',
      question: 'What is the strongest starting structure?',
      options: [
        {
          label: 'Accept every abstraction for future flexibility',
          detail: 'More interfaces make later replacement easier.',
          correct: false,
          feedback: 'Weightless layers hide the actual transaction and multiply navigation without proving a second implementation or seam is needed.',
        },
        {
          label: 'Use a clear vertical slice with explicit dependencies',
          detail: 'Keep endpoint, focused handler/domain behavior and DbContext boundary visible.',
          correct: true,
          feedback: 'Correct. This preserves separation where behavior changes while keeping the use case readable end to end.',
        },
        {
          label: 'Put everything in the endpoint',
          detail: 'Fewer files always means simpler architecture.',
          correct: false,
          feedback: 'Transport, decisions and persistence then change for different reasons. Small does not mean boundary-free.',
        },
      ],
      takeaway: 'Require each abstraction to name the volatility, ownership or test seam it protects. Otherwise, keep the code direct.',
    },
  },
  {
    id: 'agentic-dotnet',
    number: '09',
    title: 'Review agentic .NET systems',
    eyebrow: 'AI clients, tools & workflows',
    duration: '55 min',
    difficulty: 'Production',
    summary: 'Read IChatClient integrations, agent tools and workflows with the same rigor as APIs: bounded authority, typed inputs and observable outcomes.',
    outcome: 'Choose functions, workflows or agents deliberately and review tool calls as security-sensitive side effects.',
    concepts: [
      {
        title: 'Use provider-neutral clients',
        body: 'Microsoft.Extensions.AI defines IChatClient and embedding abstractions. DI and middleware can add telemetry, caching and tool invocation without coupling domain code to one provider.',
        node: 'HttpClient-style abstraction for model calls',
      },
      {
        title: 'A tool is an authority boundary',
        body: 'Descriptions influence model selection, but code must validate arguments, authorise the action, enforce idempotency and minimise exposed capability. The model is not a security principal.',
        node: 'Treat tool input like an untrusted API request',
      },
      {
        title: 'Prefer deterministic control',
        body: 'Use a function for known logic and a workflow for known steps. Use an agent when the task is genuinely open-ended and needs tool selection or planning.',
        node: 'Agent autonomy must earn its uncertainty',
      },
    ],
    callout: {
      label: 'Current ecosystem',
      title: 'Extensions.AI below, Agent Framework above',
      body: 'Microsoft.Extensions.AI provides model and embedding abstractions. Microsoft Agent Framework adds agents, sessions, tools, middleware and explicit workflows. Keep business invariants outside probabilistic prompts.',
    },
    fileName: 'VehicleAgent.cs',
    prompt: 'This tool can update production vehicle records. Review it as both .NET code and an authority boundary.',
    code: `public sealed class VehicleAgent(IChatClient chat, JobsDbContext db)
{
    [Description("Updates any vehicle record")]
    public async Task<string> UpdateVehicle(string id, string status)
    {
        var job = await db.Jobs.FindAsync(id);
        job.Status = status;
        await db.SaveChangesAsync();
        return "done";
    }

    public Task<ChatResponse> Run(string request) =>
        chat.GetResponseAsync(request, new ChatOptions
        {
            Tools = [AIFunctionFactory.Create(UpdateVehicle)]
        });
}`,
    findings: [
      {
        line: 3,
        title: 'Tool advertises excessive authority',
        severity: 'blocker',
        explanation: 'The description offers updates to any vehicle with no stated policy boundary. Models use descriptions for selection, but descriptions do not enforce permission.',
        better: 'Expose the narrowest business operation and enforce caller authorisation in code before any side effect.',
      },
      {
        line: 4,
        title: 'Tool inputs are unvalidated strings',
        severity: 'blocker',
        explanation: 'The model can supply any id or status and there is no cancellation, actor context or idempotency key.',
        better: 'Use a typed request with constrained status, caller context, operation identity and CancellationToken.',
      },
      {
        line: 6,
        title: 'Missing entity is dereferenced',
        severity: 'blocker',
        explanation: 'FindAsync may return null. The next line throws instead of returning a controlled tool result the model can interpret.',
        better: 'Handle not-found explicitly and return a small typed outcome rather than an ambiguous string.',
      },
      {
        line: 8,
        title: 'Side effect has no concurrency or retry contract',
        severity: 'blocker',
        explanation: 'A repeated tool call can write twice, and concurrent updates can overwrite each other without a concurrency token.',
        better: 'Enforce idempotency and optimistic concurrency at the application and database boundaries.',
      },
      {
        line: 12,
        title: 'Agent run has no bounded execution contract',
        severity: 'warning',
        explanation: 'The request has no cancellation token, telemetry context or explicit limits around tool execution.',
        better: 'Propagate cancellation, correlate model and tool spans, and configure bounded tool-call behavior.',
      },
    ],
    quiz: {
      question: 'A calculation has fixed inputs and deterministic business rules. Which implementation should you choose first?',
      options: ['An autonomous agent with the calculator as a tool', 'A normal typed function', 'A multi-agent workflow'],
      answer: 1,
      explanation: 'If you can express the task as a function, use a function. Agents are for open-ended decisions and tool selection, not for replacing deterministic logic.',
    },
    decisionLab: {
      title: 'Agent, workflow or function?',
      scenario: 'A vehicle automation always validates input, checks inventory, updates one system, records an audit event and requests human approval on policy exceptions.',
      question: 'Which control model best fits the known sequence?',
      options: [
        {
          label: 'Autonomous agent',
          detail: 'Let the model decide which step to run and in what order.',
          correct: false,
          feedback: 'The sequence and exception boundary are known. Autonomy adds non-determinism without solving an open-ended problem.',
        },
        {
          label: 'Explicit workflow',
          detail: 'Encode ordered steps and the human-in-the-loop branch; use AI only inside a step that needs it.',
          correct: true,
          feedback: 'Correct. The workflow preserves auditability and control while still allowing a bounded AI capability where justified.',
        },
        {
          label: 'Single model prompt',
          detail: 'Ask the model to perform and remember the complete process.',
          correct: false,
          feedback: 'A prompt cannot guarantee durable state, side-effect ordering, approval or recovery after failure.',
        },
      ],
      takeaway: 'Put deterministic orchestration in code. Give a model only the decision surface that actually requires probabilistic reasoning.',
    },
  },
];

export const glossary = [
  ['CLR', 'The .NET runtime: loads assemblies, manages memory, JIT-compiles IL and provides services such as GC and threading.'],
  ['Roslyn', 'The open-source C# and Visual Basic compiler platform, including syntax and semantic APIs used by analyzers and IDEs.'],
  ['Assembly', 'A deployable .dll or .exe containing IL, metadata, resources and a manifest. Not the same as native assembly language.'],
  ['MSBuild', 'The build engine behind dotnet build; evaluates project files, properties, items and targets.'],
  ['NuGet', 'The .NET package ecosystem and package manager, analogous to npm but integrated with project restore and compilation.'],
  ['GC', 'Generational garbage collector for managed allocations. IDisposable is separate: it deterministically releases external resources.'],
  ['DbContext', 'EF Core unit of work and identity map. It is normally scoped, short-lived, not thread-safe and disposed by its owning scope.'],
  ['IQueryable', 'A composable expression tree a provider can translate, commonly into SQL. It does not normally execute until enumerated.'],
  ['IServiceCollection', 'The registration surface used at the composition root to describe service types, implementations and lifetimes.'],
  ['Options pattern', 'Typed configuration binding and validation through IOptions APIs instead of scattered string-key lookups.'],
  ['IChatClient', 'The provider-neutral Microsoft.Extensions.AI abstraction for chat model requests, streaming and middleware composition.'],
  ['Agent tool', 'A callable capability exposed to a model. Its code must validate, authorise and bound every side effect.'],
] as const;
