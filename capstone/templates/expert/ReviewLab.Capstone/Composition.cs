using Microsoft.Extensions.DependencyInjection;

namespace ReviewLab.Capstone;

public static class Composition
{
    public static IServiceCollection AddCapstoneWorker(this IServiceCollection services)
    {
        services.AddScoped<AutomationWorker>();
        return services;
    }
}
