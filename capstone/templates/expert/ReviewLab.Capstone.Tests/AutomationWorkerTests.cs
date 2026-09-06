using Microsoft.Extensions.DependencyInjection;
using ReviewLab.Capstone;

namespace ReviewLab.Capstone.Tests;

public sealed class AutomationWorkerTests
{
    [Fact]
    public async Task Uses_targeted_query_and_propagates_cancellation()
    {
        using var source = new CancellationTokenSource();
        var job = new AutomationJob(Guid.NewGuid(), "payload");
        var repository = new FakeRepository(job);
        var client = new FakeClient();
        var tool = new FakeTool(ToolDecision.Continue);
        var audit = new FakeAudit();

        await new AutomationWorker(repository, client, tool, audit).ProcessAsync(job.Id, source.Token);

        Assert.True(repository.FindReadyCalled);
        Assert.False(repository.GetAllCalled);
        Assert.Equal(source.Token, repository.LastToken);
        Assert.Equal(source.Token, client.LastToken);
        Assert.Equal(source.Token, tool.LastToken);
        Assert.Equal(source.Token, audit.LastToken);
    }

    [Fact]
    public async Task Skips_duplicate_jobs()
    {
        var job = new AutomationJob(Guid.NewGuid(), "payload");
        var repository = new FakeRepository(job) { AlreadyProcessed = true };
        var client = new FakeClient();
        var audit = new FakeAudit();

        await new AutomationWorker(repository, client, new FakeTool(ToolDecision.Continue), audit)
            .ProcessAsync(job.Id, CancellationToken.None);

        Assert.Equal(0, client.Executions);
        Assert.Equal(0, repository.MarkProcessedCalls);
    }

    [Fact]
    public async Task Rejects_destructive_tool_authority_and_records_evidence()
    {
        var job = new AutomationJob(Guid.NewGuid(), "payload");
        var repository = new FakeRepository(job);
        var client = new FakeClient();
        var audit = new FakeAudit();

        await new AutomationWorker(repository, client, new FakeTool(ToolDecision.DeleteJob), audit)
            .ProcessAsync(job.Id, CancellationToken.None);

        Assert.Equal(0, client.Executions);
        Assert.Contains(audit.Events, entry => entry == (job.Id, "tool-decision-rejected"));
    }

    [Fact]
    public void Registers_worker_as_scoped()
    {
        var services = new ServiceCollection();
        services.AddCapstoneWorker();

        var descriptor = Assert.Single(services.Where(item => item.ServiceType == typeof(AutomationWorker)));
        Assert.Equal(ServiceLifetime.Scoped, descriptor.Lifetime);
    }

    [Fact]
    public async Task Successful_run_marks_processed_and_records_audit()
    {
        var job = new AutomationJob(Guid.NewGuid(), "payload");
        var repository = new FakeRepository(job);
        var client = new FakeClient();
        var audit = new FakeAudit();

        await new AutomationWorker(repository, client, new FakeTool(ToolDecision.Continue), audit)
            .ProcessAsync(job.Id, CancellationToken.None);

        Assert.Equal(1, client.Executions);
        Assert.Equal(1, repository.MarkProcessedCalls);
        Assert.Contains(audit.Events, entry => entry == (job.Id, "processed"));
    }

    private sealed class FakeRepository(AutomationJob job) : IJobRepository
    {
        public bool AlreadyProcessed { get; set; }
        public bool GetAllCalled { get; private set; }
        public bool FindReadyCalled { get; private set; }
        public int MarkProcessedCalls { get; private set; }
        public CancellationToken LastToken { get; private set; }

        public Task<IReadOnlyList<AutomationJob>> GetAllAsync(CancellationToken cancellationToken)
        {
            GetAllCalled = true;
            LastToken = cancellationToken;
            return Task.FromResult<IReadOnlyList<AutomationJob>>([job]);
        }

        public Task<AutomationJob?> FindReadyByIdAsync(Guid id, CancellationToken cancellationToken)
        {
            FindReadyCalled = true;
            LastToken = cancellationToken;
            return Task.FromResult<AutomationJob?>(id == job.Id ? job : null);
        }

        public Task<bool> HasProcessedAsync(Guid id, CancellationToken cancellationToken)
        {
            LastToken = cancellationToken;
            return Task.FromResult(AlreadyProcessed);
        }

        public Task MarkProcessedAsync(Guid id, CancellationToken cancellationToken)
        {
            MarkProcessedCalls++;
            LastToken = cancellationToken;
            return Task.CompletedTask;
        }
    }

    private sealed class FakeClient : IExternalAutomationClient
    {
        public int Executions { get; private set; }
        public CancellationToken LastToken { get; private set; }

        public Task ExecuteAsync(AutomationJob job, CancellationToken cancellationToken)
        {
            Executions++;
            LastToken = cancellationToken;
            return Task.CompletedTask;
        }
    }

    private sealed class FakeTool(ToolDecision decision) : IToolDecisionService
    {
        public CancellationToken LastToken { get; private set; }

        public Task<ToolDecision> DecideAsync(AutomationJob job, CancellationToken cancellationToken)
        {
            LastToken = cancellationToken;
            return Task.FromResult(decision);
        }
    }

    private sealed class FakeAudit : IAuditLog
    {
        public List<(Guid JobId, string Outcome)> Events { get; } = [];
        public CancellationToken LastToken { get; private set; }

        public Task RecordAsync(Guid jobId, string outcome, CancellationToken cancellationToken)
        {
            Events.Add((jobId, outcome));
            LastToken = cancellationToken;
            return Task.CompletedTask;
        }
    }
}
