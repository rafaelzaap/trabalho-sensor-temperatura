using MonitorTemperatura.Api.Domain;

namespace MonitorTemperatura.Api.Application;

public interface ITemperaturaService
{
    Task<IReadOnlyList<LeituraTemperatura>> ListarAsync(
        string? sensorId,
        DateTimeOffset? de,
        DateTimeOffset? ate,
        CancellationToken cancellationToken);

    Task<LeituraTemperatura?> ObterAsync(int id, CancellationToken cancellationToken);
    Task<LeituraTemperatura> CriarAsync(string sensorId, double valorCelsius, CancellationToken cancellationToken);
    Task<LeituraTemperatura?> AtualizarAsync(int id, double valorCelsius, CancellationToken cancellationToken);
    Task<bool> ExcluirAsync(int id, CancellationToken cancellationToken);
}
