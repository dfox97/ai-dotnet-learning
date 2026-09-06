namespace ReviewLab.Capstone;

public sealed record AutomationJob(Guid Id, string Payload);

public enum ToolDecision
{
    Continue,
    DeleteJob,
}

public interface IJobRepository
{
    Task<IReadOnlyList<AutomationJob>> GetAllAsync(CancellationToken cancellationToken);
    Task<AutomationJob?> FindReadyByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<bool> HasProcessedAsync(Guid id, CancellationToken cancellationToken);
    Task MarkProcessedAsync(Guid id, CancellationToken cancellationToken);
}

public interface IExternalAutomationClient
{
    Task ExecuteAsync(AutomationJob job, CancellationToken cancellationToken);
}

public interface IToolDecisionService
{
    Task<ToolDecision> DecideAsync(AutomationJob job, CancellationToken cancellationToken);
}

public interface IAuditLog
{
    Task RecordAsync(Guid jobId, string outcome, CancellationToken cancellationToken);
}
