using MonitorTemperatura.Api.Domain;

namespace MonitorTemperatura.Api.Application;

public interface ILeituraTemperaturaRepository
{
    Task<IReadOnlyList<LeituraTemperatura>> ListarAsync(
        string? sensorId,
        DateTimeOffset? de,
        DateTimeOffset? ate,
        CancellationToken cancellationToken);

    Task<LeituraTemperatura?> ObterAsync(int id, CancellationToken cancellationToken);
    Task AdicionarAsync(LeituraTemperatura leitura, CancellationToken cancellationToken);
    Task SalvarAlteracoesAsync(CancellationToken cancellationToken);
    void Remover(LeituraTemperatura leitura);
}
