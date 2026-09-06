namespace ReviewLab.Capstone;

public sealed class AutomationWorker(
    IJobRepository repository,
    IExternalAutomationClient client,
    IToolDecisionService toolDecisions,
    IAuditLog auditLog)
{
    public async Task ProcessAsync(Guid jobId, CancellationToken cancellationToken)
    {
        if (await repository.HasProcessedAsync(jobId, cancellationToken)) return;

        var job = await repository.FindReadyByIdAsync(jobId, cancellationToken);
        if (job is null) return;

        var decision = await toolDecisions.DecideAsync(job, cancellationToken);
        if (decision != ToolDecision.Continue)
        {
            await auditLog.RecordAsync(job.Id, "tool-decision-rejected", cancellationToken);
            return;
        }

        await client.ExecuteAsync(job, cancellationToken);
        await repository.MarkProcessedAsync(job.Id, cancellationToken);
        await auditLog.RecordAsync(job.Id, "processed", cancellationToken);
    }
}
