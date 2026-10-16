using System.Text.Json;
using MonitorTemperatura.Api.Application;

namespace MonitorTemperatura.Api.Endpoints;

public static class SensorStatusEndpoints
{
    public static IEndpointRouteBuilder MapSensorStatusEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/sensores/esp32").WithTags("Sensores");

        group.MapGet("/status", (SensorStatusMonitor monitor) =>
            Results.Ok(monitor.GetCurrentStatus()));

        group.MapGet("/status/events", StreamStatusAsync)
            .WithName("AcompanharStatusEsp32");

        return app;
    }

    private static async Task StreamStatusAsync(
        HttpContext context,
        SensorStatusMonitor monitor,
        CancellationToken cancellationToken)
    {
        context.Response.ContentType = "text/event-stream";
        context.Response.Headers.CacheControl = "no-cache, no-transform";
        context.Response.Headers.Append("X-Accel-Buffering", "no");

        await foreach (var status in monitor.SubscribeAsync(cancellationToken))
        {
            var json = JsonSerializer.Serialize(status, new JsonSerializerOptions(JsonSerializerDefaults.Web));
            await context.Response.WriteAsync($"data: {json}\n\n", cancellationToken);
            await context.Response.Body.FlushAsync(cancellationToken);
        }
    }
}
