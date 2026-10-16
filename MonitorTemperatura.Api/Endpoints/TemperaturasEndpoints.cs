using MonitorTemperatura.Api.Application;
using MonitorTemperatura.Api.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace MonitorTemperatura.Api.Endpoints;

public static class TemperaturasEndpoints
{
    public static IEndpointRouteBuilder MapTemperaturasEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/temperaturas").WithTags("Temperaturas");

        group.MapGet("/", ListarAsync)
            .WithName("ListarTemperaturas");

        group.MapGet("/{id:int}", ObterAsync)
            .WithName("ObterTemperatura");

        group.MapPost("/", CriarAsync)
            .AddEndpointFilter<ApiKeyEndpointFilter>()
            .WithName("CriarTemperatura");

        group.MapPut("/{id:int}", AtualizarAsync)
            .AddEndpointFilter<ApiKeyEndpointFilter>()
            .WithName("AtualizarTemperatura");

        group.MapDelete("/{id:int}", ExcluirAsync)
            .AddEndpointFilter<ApiKeyEndpointFilter>()
            .WithName("ExcluirTemperatura");

        return app;
    }

    private static async Task<IResult> ListarAsync(
        string? sensorId,
        DateTimeOffset? de,
        DateTimeOffset? ate,
        ITemperaturaService service,
        CancellationToken cancellationToken)
    {
        if (de.HasValue && ate.HasValue && de > ate)
        {
            return Results.ValidationProblem(new Dictionary<string, string[]>
            {
                ["periodo"] = ["A data inicial deve ser menor ou igual à data final."]
            });
        }

        var leituras = await service.ListarAsync(sensorId, de, ate, cancellationToken);
        return Results.Ok(leituras.Select(LeituraTemperaturaResponse.FromDomain));
    }

    private static async Task<IResult> ObterAsync(
        int id,
        ITemperaturaService service,
        CancellationToken cancellationToken)
    {
        var leitura = await service.ObterAsync(id, cancellationToken);
        return leitura is null
            ? Results.NotFound()
            : Results.Ok(LeituraTemperaturaResponse.FromDomain(leitura));
    }

    private static async Task<IResult> CriarAsync(
        CriarLeituraTemperaturaRequest request,
        [FromHeader(Name = "X-Api-Key")] string? apiKey,
        ITemperaturaService service,
        SensorStatusMonitor statusMonitor,
        CancellationToken cancellationToken)
    {
        var erros = Validar(request.ValorCelsius, request.SensorId, exigirSensorId: true);
        if (erros.Count > 0)
        {
            return Results.ValidationProblem(erros);
        }

        var leitura = await service.CriarAsync(request.SensorId, request.ValorCelsius, cancellationToken);
        await statusMonitor.RegistrarSinalAsync(leitura.SensorId);
        return Results.CreatedAtRoute(
            "ObterTemperatura",
            new { id = leitura.Id },
            LeituraTemperaturaResponse.FromDomain(leitura));
    }

    private static async Task<IResult> AtualizarAsync(
        int id,
        AtualizarLeituraTemperaturaRequest request,
        [FromHeader(Name = "X-Api-Key")] string? apiKey,
        ITemperaturaService service,
        CancellationToken cancellationToken)
    {
        var erros = Validar(request.ValorCelsius);
        if (erros.Count > 0)
        {
            return Results.ValidationProblem(erros);
        }

        var leitura = await service.AtualizarAsync(id, request.ValorCelsius, cancellationToken);
        return leitura is null
            ? Results.NotFound()
            : Results.Ok(LeituraTemperaturaResponse.FromDomain(leitura));
    }

    private static async Task<IResult> ExcluirAsync(
        int id,
        [FromHeader(Name = "X-Api-Key")] string? apiKey,
        ITemperaturaService service,
        CancellationToken cancellationToken)
    {
        var excluida = await service.ExcluirAsync(id, cancellationToken);
        return excluida ? Results.NoContent() : Results.NotFound();
    }

    private static Dictionary<string, string[]> Validar(
        double valorCelsius,
        string? sensorId = null,
        bool exigirSensorId = false)
    {
        var erros = new Dictionary<string, string[]>();

        if (!double.IsFinite(valorCelsius) || valorCelsius is < -40 or > 80)
        {
            erros["valorCelsius"] = ["Informe uma temperatura entre -40 °C e 80 °C."];
        }

        if ((exigirSensorId && string.IsNullOrWhiteSpace(sensorId))
            || (sensorId is not null && sensorId.Length > 60))
        {
            erros["sensorId"] = ["Informe um identificador de sensor com até 60 caracteres."];
        }

        return erros;
    }
}
