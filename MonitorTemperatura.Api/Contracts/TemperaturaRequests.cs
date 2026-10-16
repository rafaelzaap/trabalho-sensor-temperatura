namespace MonitorTemperatura.Api.Contracts;

public sealed record CriarLeituraTemperaturaRequest(double ValorCelsius, string SensorId);

public sealed record AtualizarLeituraTemperaturaRequest(double ValorCelsius);
