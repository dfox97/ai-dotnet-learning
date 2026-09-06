using Microsoft.Extensions.DependencyInjection;

namespace ReviewLab.Capstone;

public static class Composition
{
    public static IServiceCollection AddCapstoneWorker(this IServiceCollection services)
    {
        // Intentional lifetime defect: the worker depends on scoped persistence concerns.
        services.AddSingleton<AutomationWorker>();
        return services;
    }
}
