namespace ReviewLab.Capstone;

public sealed class AutomationWorker(
    IJobRepository repository,
    IExternalAutomationClient client,
    IToolDecisionService toolDecisions,
    IAuditLog auditLog)
{
    public async Task ProcessAsync(Guid jobId, CancellationToken cancellationToken)
    {
        // Intentional capstone defects:
        // - loads the full set instead of querying the requested row
        // - drops caller cancellation
        // - performs no idempotency check
        // - grants the AI tool authority to delete work
        // - waits synchronously inside an async flow
        // - omits the audit trail
        var jobs = await repository.GetAllAsync(CancellationToken.None);
        var job = jobs.FirstOrDefault(candidate => candidate.Id == jobId);
        if (job is null) return;

        var decision = toolDecisions.DecideAsync(job, CancellationToken.None).Result;
        if (decision == ToolDecision.DeleteJob) return;

        await client.ExecuteAsync(job, CancellationToken.None);
        await repository.MarkProcessedAsync(job.Id, CancellationToken.None);

        _ = auditLog;
        _ = cancellationToken;
    }
}
