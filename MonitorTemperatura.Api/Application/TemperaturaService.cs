using MonitorTemperatura.Api.Domain;

namespace MonitorTemperatura.Api.Application;

public sealed class TemperaturaService(ILeituraTemperaturaRepository repository) : ITemperaturaService
{
    public Task<IReadOnlyList<LeituraTemperatura>> ListarAsync(
        string? sensorId,
        DateTimeOffset? de,
        DateTimeOffset? ate,
        CancellationToken cancellationToken) =>
        repository.ListarAsync(sensorId, de, ate, cancellationToken);

    public Task<LeituraTemperatura?> ObterAsync(int id, CancellationToken cancellationToken) =>
        repository.ObterAsync(id, cancellationToken);

    public async Task<LeituraTemperatura> CriarAsync(
        string sensorId,
        double valorCelsius,
        CancellationToken cancellationToken)
    {
        var leitura = new LeituraTemperatura
        {
            SensorId = sensorId.Trim(),
            ValorCelsius = valorCelsius,
            RegistradaEmUtc = DateTime.UtcNow
        };

        await repository.AdicionarAsync(leitura, cancellationToken);
        await repository.SalvarAlteracoesAsync(cancellationToken);
        return leitura;
    }

    public async Task<LeituraTemperatura?> AtualizarAsync(
        int id,
        double valorCelsius,
        CancellationToken cancellationToken)
    {
        var leitura = await repository.ObterAsync(id, cancellationToken);
        if (leitura is null)
        {
            return null;
        }

        leitura.ValorCelsius = valorCelsius;
        await repository.SalvarAlteracoesAsync(cancellationToken);
        return leitura;
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken cancellationToken)
    {
        var leitura = await repository.ObterAsync(id, cancellationToken);
        if (leitura is null)
        {
            return false;
        }

        repository.Remover(leitura);
        await repository.SalvarAlteracoesAsync(cancellationToken);
        return true;
    }
}
