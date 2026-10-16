namespace MonitorTemperatura.Api.Contracts;

public sealed record LeituraTemperaturaResponse(
    int Id,
    double ValorCelsius,
    DateTime RegistradaEmUtc,
    string SensorId)
{
    public static LeituraTemperaturaResponse FromDomain(Domain.LeituraTemperatura leitura) =>
        new(leitura.Id, leitura.ValorCelsius, leitura.RegistradaEmUtc, leitura.SensorId);
}
