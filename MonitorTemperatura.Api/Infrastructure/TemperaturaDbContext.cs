using Microsoft.EntityFrameworkCore;
using MonitorTemperatura.Api.Domain;

namespace MonitorTemperatura.Api.Infrastructure;

public sealed class TemperaturaDbContext(DbContextOptions<TemperaturaDbContext> options) : DbContext(options)
{
    public DbSet<LeituraTemperatura> Leituras => Set<LeituraTemperatura>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<LeituraTemperatura>(entity =>
        {
            entity.HasKey(leitura => leitura.Id);
            entity.Property(leitura => leitura.SensorId).HasMaxLength(60).IsRequired();
            entity.HasIndex(leitura => leitura.RegistradaEmUtc);
            entity.HasIndex(leitura => new { leitura.SensorId, leitura.RegistradaEmUtc });
        });
    }
}
