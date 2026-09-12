export type PatternConcept = {
  id: string;
  label: string;
  typeScriptLines: number[];
  csharpLines: number[];
  difference: string;
  review: string;
};

export type BridgePattern = {
  id: string;
  category: string;
  title: string;
  summary: string;
  typeScript: { label: string; fileName: string; code: string };
  csharp: { label: string; fileName: string; code: string };
  concepts: PatternConcept[];
};

export type TranslationFinding = {
  line: number;
  title: string;
  severity: 'blocker' | 'warning';
  explanation: string;
  better: string;
};

export type TranslationChallenge = {
  id: string;
  title: string;
  category: string;
  brief: string;
  sourceFile: string;
  sourceCode: string;
  generatedFile: string;
  generatedCode: string;
  findings: TranslationFinding[];
  idiomaticCode: string;
  idiomaticNotes: string[];
};

export const bridgePatterns: BridgePattern[] = [
  {
    id: 'di-lifetimes',
    category: 'Dependency injection',
    title: 'Provider → scoped service',
    summary: 'Both frameworks use constructor injection, but .NET makes host, request and transient lifetimes central to object-graph correctness.',
    typeScript: {
      label: 'NestJS',
      fileName: 'jobs.service.ts',
      code: `@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobs: Repository<Job>,
  ) {}

  find(id: string): Promise<Job | null> {
    return this.jobs.findOneBy({ id });
  }
}`,
    },
    csharp: {
      label: 'ASP.NET Core',
      fileName: 'JobsService.cs',
      code: `builder.Services.AddScoped<JobsService>();
builder.Services.AddDbContext<JobsDbContext>();

public sealed class JobsService(JobsDbContext db)
{
    public Task<Job?> FindAsync(
        string id,
        CancellationToken token) =>
        db.Jobs.SingleOrDefaultAsync(
            job => job.Id == id,
            token);
}`,
    },
    concepts: [
      {
        id: 'registration',
        label: 'Registration',
        typeScriptLines: [1],
        csharpLines: [1, 2],
        difference: 'Nest commonly discovers providers through module metadata and decorators. .NET registrations at the composition root explicitly choose each service lifetime.',
        review: 'Read startup registrations before reviewing injected services. A correct class with the wrong lifetime is still incorrect.',
      },
      {
        id: 'constructor',
        label: 'Constructor injection',
        typeScriptLines: [3, 4, 5],
        csharpLines: [4],
        difference: 'Both expose required dependencies through construction. C# primary constructors make the dependency compact without hiding it behind a service locator.',
        review: 'A general IServiceProvider or ModuleRef often hides the real graph. Prefer the narrow dependency unless runtime selection is genuinely required.',
      },
      {
        id: 'nullability',
        label: 'Missing values',
        typeScriptLines: [8],
        csharpLines: [6],
        difference: 'The TypeScript union is erased at runtime. Job? participates in Roslyn nullable flow analysis and callers receive diagnostics when they dereference it unsafely.',
        review: 'Check whether a missing row is normal. The return type should force the caller to handle that outcome deliberately.',
      },
      {
        id: 'cancellation',
        label: 'Cancellation',
        typeScriptLines: [8, 9],
        csharpLines: [7, 8, 11],
        difference: 'Promise does not carry cancellation by convention. .NET APIs conventionally accept and propagate CancellationToken through the full async call chain.',
        review: 'A token that stops at the service boundary is decorative. Follow it into the database or network operation.',
      },
    ],
  },
  {
    id: 'rest-endpoint',
    category: 'HTTP APIs',
    title: 'Controller → typed REST endpoint',
    summary: 'Route decorators map cleanly, but REST status codes, typed outcomes and cancellation form a more explicit .NET endpoint contract.',
    typeScript: {
      label: 'NestJS',
      fileName: 'jobs.controller.ts',
      code: `@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get(':id')
  async get(@Param('id') id: string) {
    const job = await this.jobs.find(id);
    if (!job) throw new NotFoundException();
    return job;
  }
}`,
    },
    csharp: {
      label: 'ASP.NET Core',
      fileName: 'Program.cs',
      code: `app.MapGet("/jobs/{id}", async Task<Results<
    Ok<JobResponse>,
    NotFound>> (
    string id,
    JobsService jobs,
    CancellationToken token) =>
{
    var job = await jobs.FindAsync(id, token);
    return job is null
        ? TypedResults.NotFound()
        : TypedResults.Ok(JobResponse.From(job));
});`,
    },
    concepts: [
      {
        id: 'route',
        label: 'Route contract',
        typeScriptLines: [1, 5],
        csharpLines: [1],
        difference: 'Nest combines controller and method decorators. Minimal APIs place the complete route beside the handler; controller attributes are another valid ASP.NET option.',
        review: 'Choose controllers or Minimal APIs consistently. Do not add a controller layer merely to imitate another framework.',
      },
      {
        id: 'binding',
        label: 'Parameter binding',
        typeScriptLines: [6],
        csharpLines: [5, 6, 7],
        difference: 'Nest uses parameter decorators. ASP.NET binds route values and resolves registered services from typed parameters, while CancellationToken comes from the request.',
        review: 'Distinguish user input from injected dependencies and verify validation occurs before side effects.',
      },
      {
        id: 'outcomes',
        label: 'Typed outcomes',
        typeScriptLines: [8, 9],
        csharpLines: [1, 2, 3, 10, 11, 12],
        difference: 'Throwing a framework exception is concise. A typed result union documents the possible HTTP outcomes and improves generated OpenAPI metadata.',
        review: 'Normal misses should not accidentally become 500 responses. Check 201, Location, 404 and 409 semantics rather than only the response body.',
      },
    ],
  },
  {
    id: 'validation',
    category: 'Input contracts',
    title: 'Validation decorators → request contract',
    summary: 'Both can use attributes, but static nullability, runtime validation and domain invariants are separate layers in .NET.',
    typeScript: {
      label: 'NestJS',
      fileName: 'create-job.dto.ts',
      code: `export class CreateJobDto {
  @IsString()
  @Matches(/^[A-Z0-9 ]{2,10}$/)
  registration!: string;

  @IsIn(['Queued', 'Priority'])
  kind!: string;
}`,
    },
    csharp: {
      label: 'ASP.NET Core',
      fileName: 'CreateJobRequest.cs',
      code: `public sealed record CreateJobRequest(
    [property: Required]
    [property: RegularExpression("^[A-Z0-9 ]{2,10}$")]
    string Registration,

    [property: EnumDataType(typeof(JobKind))]
    JobKind Kind);`,
    },
    concepts: [
      {
        id: 'runtime-validation',
        label: 'Runtime validation',
        typeScriptLines: [2, 3, 6],
        csharpLines: [2, 3, 6],
        difference: 'Both attribute systems provide runtime metadata. ASP.NET model validation and JSON binding still need to be configured and their failure response is part of the API contract.',
        review: 'Do not assume an attribute enforces every construction path. Domain objects must protect invariants that matter outside HTTP binding.',
      },
      {
        id: 'type-contract',
        label: 'Type contract',
        typeScriptLines: [4, 7],
        csharpLines: [4, 7],
        difference: 'TypeScript definite-assignment assertions silence its compiler. C# uses a non-null string and a real enum that remain represented in runtime metadata.',
        review: 'Prefer domain types such as enums or value objects when arbitrary strings would create invalid states.',
      },
      {
        id: 'immutability',
        label: 'Immutable request',
        typeScriptLines: [1, 4, 7],
        csharpLines: [1, 4, 7],
        difference: 'The Nest DTO exposes mutable properties. The positional record creates an immutable data-shaped request with value equality.',
        review: 'Use records for value-like transport data when mutation and identity add no meaning.',
      },
    ],
  },
  {
    id: 'async-cancellation',
    category: 'Async work',
    title: 'Promise orchestration → Task ownership',
    summary: 'Task resembles Promise, but cancellation, deterministic disposal and multithreaded continuations change the review questions.',
    typeScript: {
      label: 'Node.js',
      fileName: 'vehicle-client.ts',
      code: `async function updateVehicle(
  id: string,
  signal: AbortSignal,
): Promise<Result> {
  const response = await fetch(\`/vehicles/\${id}\`, {
    method: 'POST',
    signal,
  });
  return response.json();
}`,
    },
    csharp: {
      label: '.NET',
      fileName: 'VehicleClient.cs',
      code: `public async Task<Result> UpdateVehicleAsync(
    string id,
    CancellationToken token)
{
    using var response = await http.PostAsync(
        $"/vehicles/{id}",
        content: null,
        token);
    response.EnsureSuccessStatusCode();
    return await response.Content
        .ReadFromJsonAsync<Result>(token)
        ?? throw new InvalidDataException();
}`,
    },
    concepts: [
      {
        id: 'eventual-result',
        label: 'Eventual result',
        typeScriptLines: [1, 4, 5],
        csharpLines: [1],
        difference: 'Promise and Task both represent eventual completion. A C# async method runs synchronously until its first incomplete await and may resume on a pool thread.',
        review: 'Task is not a thread. Look for blocking .Result, missing await and unintended concurrent access to shared state.',
      },
      {
        id: 'cancel-chain',
        label: 'Cancellation chain',
        typeScriptLines: [3, 8],
        csharpLines: [3, 8, 12],
        difference: 'AbortSignal is passed into supporting APIs. CancellationToken follows the same cooperative idea but is a pervasive .NET convention from host to I/O call.',
        review: 'Verify expected cancellation is not swallowed by a catch-all and turned into a retry or error log.',
      },
      {
        id: 'resources',
        label: 'Resource ownership',
        typeScriptLines: [5, 10],
        csharpLines: [5, 9],
        difference: 'The response in .NET implements IDisposable. using compiles to a finally-based deterministic cleanup boundary independent of garbage collection.',
        review: 'Track who creates and who disposes streams, responses, scopes and database contexts.',
      },
    ],
  },
  {
    id: 'data-query',
    category: 'Data access',
    title: 'TypeORM query → EF Core expression',
    summary: 'Both build SQL, but IQueryable expression trees, change tracking and materialisation boundaries are central to EF Core review.',
    typeScript: {
      label: 'TypeORM',
      fileName: 'jobs.repository.ts',
      code: `return this.jobs
  .createQueryBuilder('job')
  .select(['job.id', 'job.branch'])
  .where('job.status = :status', { status: 'Open' })
  .orderBy('job.createdAt', 'DESC')
  .take(50)
  .getMany();`,
    },
    csharp: {
      label: 'EF Core',
      fileName: 'JobQueries.cs',
      code: `return await db.Jobs
    .AsNoTracking()
    .Where(job => job.Status == JobStatus.Open)
    .OrderByDescending(job => job.CreatedAt)
    .Select(job => new JobSummary(
        job.Id,
        job.Branch))
    .Take(50)
    .ToListAsync(token);`,
    },
    concepts: [
      {
        id: 'query-model',
        label: 'Query model',
        typeScriptLines: [1, 2],
        csharpLines: [1, 3, 4, 5],
        difference: 'The query builder constructs SQL explicitly. EF captures LINQ as an expression tree and asks the provider to translate supported nodes.',
        review: 'A clean LINQ chain is not proof of a good query. Inspect generated SQL and the database plan when cardinality or indexes matter.',
      },
      {
        id: 'projection',
        label: 'Projection',
        typeScriptLines: [3],
        csharpLines: [5, 6, 7],
        difference: 'Both restrict selected columns. EF projection also avoids materialising tracked entity instances when returning a response shape.',
        review: 'Select only required fields. Include is for loading entity graphs, not a default answer to every relationship.',
      },
      {
        id: 'execution',
        label: 'Execution boundary',
        typeScriptLines: [7],
        csharpLines: [9],
        difference: 'getMany and ToListAsync are terminal operations. Everything before should remain database-translatable; everything after runs in application memory.',
        review: 'Read backward from materialisation. Check filters, ordering, projection and limits occur before it.',
      },
      {
        id: 'tracking',
        label: 'Tracking',
        typeScriptLines: [1],
        csharpLines: [2],
        difference: 'EF tracks entity instances by default for later SaveChanges. AsNoTracking makes the read-only intent and lower ownership cost explicit.',
        review: 'Do not add AsNoTracking mechanically to update workflows; use it when the loaded entities will not be changed through this context.',
      },
    ],
  },
  {
    id: 'background-worker',
    category: 'Automation',
    title: 'Queue processor → hosted worker',
    summary: 'The host owns startup and shutdown; the worker owns a cancellable loop, scope-per-message dependencies and durable processing semantics.',
    typeScript: {
      label: 'NestJS / BullMQ',
      fileName: 'vehicle.processor.ts',
      code: `@Processor('vehicles')
export class VehicleProcessor {
  constructor(private readonly handler: VehicleHandler) {}

  @Process()
  async process(job: Job<VehicleCommand>) {
    await this.handler.execute(job.data);
  }
}`,
    },
    csharp: {
      label: '.NET Worker',
      fileName: 'VehicleWorker.cs',
      code: `public sealed class VehicleWorker(
    IServiceScopeFactory scopes,
    IJobQueue queue) : BackgroundService
{
    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        await foreach (var job in queue.ReadAllAsync(stoppingToken))
        {
            await using var scope = scopes.CreateAsyncScope();
            var handler = scope.ServiceProvider
                .GetRequiredService<VehicleHandler>();
            await handler.ExecuteAsync(job, stoppingToken);
        }
    }
}`,
    },
    concepts: [
      {
        id: 'host-lifecycle',
        label: 'Host lifecycle',
        typeScriptLines: [1, 2, 5],
        csharpLines: [3, 5],
        difference: 'Decorators connect the BullMQ processor. BackgroundService participates directly in .NET Generic Host startup and graceful shutdown.',
        review: 'The process lifecycle is part of correctness. Deployment must stop intake and let owned work finish within a bound.',
      },
      {
        id: 'work-scope',
        label: 'Scope per message',
        typeScriptLines: [3, 7],
        csharpLines: [2, 10, 11, 12],
        difference: 'BackgroundService is singleton. An explicit scope gives each job fresh scoped dependencies such as DbContext and a deterministic cleanup point.',
        review: 'Never solve a lifetime mismatch by promoting mutable dependencies to singleton.',
      },
      {
        id: 'shutdown',
        label: 'Graceful shutdown',
        typeScriptLines: [6, 7],
        csharpLines: [6, 8, 13],
        difference: 'The .NET host supplies a stopping token which must reach queue reads and handler I/O. The loop then exits cooperatively.',
        review: 'Look for uncancellable delays, receives and browser operations that can block a rollout.',
      },
    ],
  },
];

export const translationChallenges: TranslationChallenge[] = [
  {
    id: 'singleton-translation',
    title: 'The singleton translation trap',
    category: 'DI lifetimes',
    brief: 'The Nest provider works in a request pipeline. An agent translated “providers are singleton by default” literally into .NET.',
    sourceFile: 'jobs.service.ts',
    sourceCode: `@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobs: Repository<Job>,
  ) {}

  async markComplete(id: string): Promise<void> {
    await this.jobs.update(id, { status: 'Complete' });
  }
}`,
    generatedFile: 'JobsService.cs',
    generatedCode: `builder.Services.AddSingleton<JobsService>();
builder.Services.AddSingleton<JobsDbContext>();

public sealed class JobsService(JobsDbContext db)
{
    public async Task MarkComplete(string id)
    {
        var job = db.Jobs.First(x => x.Id == id);
        job.Status = "Complete";
        db.SaveChangesAsync();
    }
}`,
    findings: [
      {
        line: 2,
        title: 'DbContext registered as singleton',
        severity: 'blocker',
        explanation: 'DbContext is mutable, tracks entities and is not thread-safe. Concurrent requests would share one unit of work for the host lifetime.',
        better: 'Use AddDbContext, which registers a scoped context by default, and align JobsService with the request scope.',
      },
      {
        line: 6,
        title: 'Cancellation disappeared',
        severity: 'warning',
        explanation: 'The generated async contract cannot observe request shutdown or client cancellation.',
        better: 'Accept CancellationToken and propagate it into every EF async call.',
      },
      {
        line: 8,
        title: 'Synchronous database query inside async method',
        severity: 'warning',
        explanation: 'First blocks while the provider executes I/O and throws when the row is missing.',
        better: 'Use SingleOrDefaultAsync with the token and model the not-found outcome explicitly.',
      },
      {
        line: 10,
        title: 'Save task is discarded',
        severity: 'blocker',
        explanation: 'The method can report completion before persistence finishes; failures escape the request path.',
        better: 'await db.SaveChangesAsync(token).',
      },
    ],
    idiomaticCode: `builder.Services.AddScoped<JobsService>();
builder.Services.AddDbContext<JobsDbContext>(options =>
    options.UseSqlServer(connectionString));

public sealed class JobsService(JobsDbContext db)
{
    public async Task<bool> MarkCompleteAsync(
        string id,
        CancellationToken token)
    {
        var job = await db.Jobs.SingleOrDefaultAsync(
            job => job.Id == id,
            token);
        if (job is null) return false;

        job.Status = JobStatus.Complete;
        await db.SaveChangesAsync(token);
        return true;
    }
}`,
    idiomaticNotes: ['Scoped service and DbContext share one request unit of work.', 'The return contract makes not-found explicit.', 'Cancellation and async I/O remain intact through persistence.'],
  },
  {
    id: 'endpoint-translation',
    title: 'The “it returns JSON” endpoint',
    category: 'REST & cancellation',
    brief: 'A Nest controller was translated into a Minimal API. The happy-path body looks right, but the HTTP and failure contracts were lost.',
    sourceFile: 'jobs.controller.ts',
    sourceCode: `@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post()
  async create(@Body() request: CreateJobDto) {
    return this.jobs.create(request);
  }
}`,
    generatedFile: 'Program.cs',
    generatedCode: `app.MapPost("/jobs", async (CreateJobRequest request) =>
{
    var service = app.Services.GetService<JobsService>();
    try
    {
        var job = await service.CreateAsync(request);
        return Results.Ok(job);
    }
    catch
    {
        return Results.BadRequest();
    }
});`,
    findings: [
      {
        line: 3,
        title: 'Root service locator bypasses request scope',
        severity: 'blocker',
        explanation: 'Resolving from app.Services hides the dependency and can capture scoped or disposable services from the root provider.',
        better: 'Declare JobsService as an endpoint parameter so ASP.NET resolves it from the request scope.',
      },
      {
        line: 6,
        title: 'Cancellation is not propagated',
        severity: 'warning',
        explanation: 'Client disconnect and host shutdown cannot cancel the create operation because the endpoint has no CancellationToken.',
        better: 'Accept the request token and pass it through service and database calls.',
      },
      {
        line: 7,
        title: 'Creation returns 200 without Location',
        severity: 'warning',
        explanation: 'A new REST resource should normally produce 201 Created and identify the resource URI.',
        better: 'Return TypedResults.Created($"/jobs/{job.Id}", response).',
      },
      {
        line: 9,
        title: 'Every exception becomes client error',
        severity: 'blocker',
        explanation: 'Database outages and programming defects are mislabeled as bad input and all diagnostics disappear.',
        better: 'Validate input explicitly, model expected conflicts, and let global exception handling produce problem details for unexpected failures.',
      },
    ],
    idiomaticCode: `app.MapPost("/jobs", async Task<Created<JobResponse>> (
    CreateJobRequest request,
    JobsService jobs,
    CancellationToken token) =>
{
    var job = await jobs.CreateAsync(request, token);
    var response = JobResponse.From(job);
    return TypedResults.Created($"/jobs/{job.Id}", response);
});`,
    idiomaticNotes: ['Dependencies and cancellation are visible in the endpoint signature.', 'The typed return advertises the HTTP contract to readers and OpenAPI.', 'Unexpected failures stay observable through central exception handling.'],
  },
  {
    id: 'query-translation',
    title: 'The in-memory EF query',
    category: 'EF Core',
    brief: 'A TypeORM query was translated into familiar array-style LINQ. Find where database execution and bounded query behavior were lost.',
    sourceFile: 'jobs.repository.ts',
    sourceCode: `return this.jobs
  .createQueryBuilder('job')
  .where('job.status = :status', { status: 'Open' })
  .orderBy('job.createdAt', 'DESC')
  .limit(50)
  .getMany();`,
    generatedFile: 'JobQueries.cs',
    generatedCode: `public async Task<List<Job>> GetOpenJobs()
{
    var jobs = await db.Jobs
        .Include(job => job.Events)
        .ToListAsync();

    return jobs
        .Where(job => job.Status == "Open")
        .OrderByDescending(job => job.CreatedAt)
        .Take(50)
        .ToList();
}`,
    findings: [
      {
        line: 4,
        title: 'Full event graph is loaded without need',
        severity: 'warning',
        explanation: 'Include multiplies transferred and tracked data even though the method returns jobs and never reads Events.',
        better: 'Remove Include and project only fields required by the caller.',
      },
      {
        line: 5,
        title: 'Materialisation occurs before the query shape',
        severity: 'blocker',
        explanation: 'ToListAsync executes an unfiltered query. Every later operator runs against application memory.',
        better: 'Keep Where, OrderBy, projection and Take on IQueryable; materialise once at the end.',
      },
      {
        line: 8,
        title: 'Status filter cannot use a database index',
        severity: 'blocker',
        explanation: 'Because the data is already loaded, the database never sees the predicate and cannot optimise it.',
        better: 'Apply the typed enum predicate before ToListAsync and verify the production index/query plan where needed.',
      },
      {
        line: 11,
        title: 'Result is tracked and over-shaped',
        severity: 'warning',
        explanation: 'The read returns full tracked entities when a dashboard normally needs a stable response projection.',
        better: 'Use AsNoTracking and Select a bounded DTO before materialisation.',
      },
    ],
    idiomaticCode: `public Task<List<JobSummary>> GetOpenJobsAsync(
    CancellationToken token) =>
    db.Jobs
        .AsNoTracking()
        .Where(job => job.Status == JobStatus.Open)
        .OrderByDescending(job => job.CreatedAt)
        .Select(job => new JobSummary(job.Id, job.Branch))
        .Take(50)
        .ToListAsync(token);`,
    idiomaticNotes: ['The complete query remains visible to EF until the terminal operation.', 'Projection limits columns and avoids tracked entity ownership.', 'A typed status and explicit result bound make the query contract readable.'],
  },
];
