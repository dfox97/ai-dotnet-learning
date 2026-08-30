export type LearningResource = {
  title: string;
  category: 'Start here' | 'C# & runtime' | 'ASP.NET & DI' | 'EF Core & SQL' | 'AI & agents';
  format: 'Guide' | 'Tutorial' | 'Reference' | 'Sample';
  url: string;
  description: string;
  reviewUse: string;
  level: 'Foundation' | 'Core' | 'Production';
};

export const resources: LearningResource[] = [
  {
    title: 'Tour of C#',
    category: 'Start here',
    format: 'Tutorial',
    url: 'https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/',
    description: 'A compact language tour covering types, program structure, exceptions and the unified type system.',
    reviewUse: 'Use first to recognise syntax without trying to memorise the whole language.',
    level: 'Foundation',
  },
  {
    title: '.NET fundamentals learning path',
    category: 'Start here',
    format: 'Tutorial',
    url: 'https://learn.microsoft.com/en-us/training/paths/build-dotnet-applications-csharp/',
    description: 'Microsoft Learn modules that connect C# syntax with projects, packages, debugging and application structure.',
    reviewUse: 'Use for short guided exercises when a review reveals a missing fundamental.',
    level: 'Foundation',
  },
  {
    title: 'C# language reference',
    category: 'C# & runtime',
    format: 'Reference',
    url: 'https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/',
    description: 'The authoritative reference for keywords, operators, attributes and language features.',
    reviewUse: 'Check exact semantics when generated code uses unfamiliar syntax such as required, init or pattern matching.',
    level: 'Core',
  },
  {
    title: '.NET fundamentals overview',
    category: 'C# & runtime',
    format: 'Guide',
    url: 'https://learn.microsoft.com/en-us/dotnet/fundamentals/',
    description: 'Runtime, garbage collection, dependency loading, SDK tooling, diagnostics and common application models.',
    reviewUse: 'Use to separate language, compiler, runtime and framework responsibilities in a review.',
    level: 'Core',
  },
  {
    title: 'Dependency injection in .NET',
    category: 'ASP.NET & DI',
    format: 'Guide',
    url: 'https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection',
    description: 'How the built-in service container registers, resolves and disposes services across lifetimes.',
    reviewUse: 'Read before judging constructor injection, composition roots or service lifetime registration.',
    level: 'Core',
  },
  {
    title: 'Dependency injection guidelines',
    category: 'ASP.NET & DI',
    format: 'Reference',
    url: 'https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/guidelines',
    description: 'Official lifetime, disposal, thread-safety and anti-pattern guidance for the built-in container.',
    reviewUse: 'Use when reviewing service locator calls, singleton state, BuildServiceProvider or captured scoped services.',
    level: 'Production',
  },
  {
    title: 'ASP.NET Core fundamentals',
    category: 'ASP.NET & DI',
    format: 'Guide',
    url: 'https://learn.microsoft.com/en-us/aspnet/core/fundamentals/',
    description: 'The host, middleware pipeline, configuration, logging, environments and application startup model.',
    reviewUse: 'Use to reason about where request behavior lives and why middleware ordering changes behavior.',
    level: 'Core',
  },
  {
    title: 'EF Core overview',
    category: 'EF Core & SQL',
    format: 'Guide',
    url: 'https://learn.microsoft.com/en-us/ef/core/',
    description: 'Models, DbContext, querying, change tracking, saving and production ORM considerations.',
    reviewUse: 'Start here before reviewing an unfamiliar DbContext or entity model.',
    level: 'Core',
  },
  {
    title: 'Efficient querying with EF Core',
    category: 'EF Core & SQL',
    format: 'Guide',
    url: 'https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying',
    description: 'Indexes, projections, result limits, pagination, related data, N+1 queries, buffering and tracking costs.',
    reviewUse: 'Use when a LINQ query looks clean but its SQL shape, roundtrips or cardinality are unclear.',
    level: 'Production',
  },
  {
    title: 'Applying EF Core migrations',
    category: 'EF Core & SQL',
    format: 'Reference',
    url: 'https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying',
    description: 'Deployment options and tradeoffs for scripts, bundles, command-line application and runtime migration.',
    reviewUse: 'Use during deployment review; avoid treating schema migration as a harmless application startup step.',
    level: 'Production',
  },
  {
    title: 'Microsoft.Extensions.AI',
    category: 'AI & agents',
    format: 'Guide',
    url: 'https://learn.microsoft.com/en-us/dotnet/ai/microsoft-extensions-ai',
    description: 'Provider-neutral IChatClient and embedding abstractions with DI, telemetry, caching and tool middleware.',
    reviewUse: 'Prefer the abstraction when generated code hard-codes one model provider throughout business logic.',
    level: 'Core',
  },
  {
    title: 'Microsoft Agent Framework overview',
    category: 'AI & agents',
    format: 'Guide',
    url: 'https://learn.microsoft.com/en-us/agent-framework/overview/',
    description: 'Agents, explicit workflows, tools, sessions, middleware and model-provider integrations for .NET.',
    reviewUse: 'Use to decide whether a task needs an agent, a controlled workflow or simply a deterministic function.',
    level: 'Production',
  },
  {
    title: 'eShopSupport AI sample',
    category: 'AI & agents',
    format: 'Sample',
    url: 'https://github.com/dotnet/eShopSupport',
    description: 'A Microsoft sample showing AI evaluation, data ingestion and support workflows in a realistic .NET solution.',
    reviewUse: 'Read architecture and tests rather than copying snippets; compare boundaries with your own automation system.',
    level: 'Production',
  },
];

export const resourceCategories = ['All', 'Start here', 'C# & runtime', 'ASP.NET & DI', 'EF Core & SQL', 'AI & agents'] as const;
