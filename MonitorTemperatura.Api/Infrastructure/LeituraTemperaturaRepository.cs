using Microsoft.EntityFrameworkCore;
using MonitorTemperatura.Api.Application;
using MonitorTemperatura.Api.Domain;

namespace MonitorTemperatura.Api.Infrastructure;

public sealed class LeituraTemperaturaRepository(TemperaturaDbContext db) : ILeituraTemperaturaRepository
{
    public async Task<IReadOnlyList<LeituraTemperatura>> ListarAsync(
        string? sensorId,
        DateTimeOffset? de,
        DateTimeOffset? ate,
        CancellationToken cancellationToken)
    {
        var query = db.Leituras.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(sensorId))
        {
            query = query.Where(leitura => leitura.SensorId == sensorId);
        }

        if (de.HasValue)
        {
            var inicioUtc = de.Value.UtcDateTime;
            query = query.Where(leitura => leitura.RegistradaEmUtc >= inicioUtc);
        }

        if (ate.HasValue)
        {
            var fimUtc = ate.Value.UtcDateTime;
            query = query.Where(leitura => leitura.RegistradaEmUtc <= fimUtc);
        }

        return await query
            .OrderByDescending(leitura => leitura.RegistradaEmUtc)
            .Take(100)
            .ToListAsync(cancellationToken);
    }

    public Task<LeituraTemperatura?> ObterAsync(int id, CancellationToken cancellationToken) =>
        db.Leituras.FirstOrDefaultAsync(leitura => leitura.Id == id, cancellationToken);

    public async Task AdicionarAsync(LeituraTemperatura leitura, CancellationToken cancellationToken) =>
        await db.Leituras.AddAsync(leitura, cancellationToken);

    public Task SalvarAlteracoesAsync(CancellationToken cancellationToken) =>
        db.SaveChangesAsync(cancellationToken);

    public void Remover(LeituraTemperatura leitura) => db.Leituras.Remove(leitura);
}
