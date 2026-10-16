namespace MonitorTemperatura.Api.Domain;

public sealed class LeituraTemperatura
{
    public int Id { get; set; }
    public double ValorCelsius { get; set; }
    public DateTime RegistradaEmUtc { get; set; }
    public string SensorId { get; set; } = string.Empty;
}
