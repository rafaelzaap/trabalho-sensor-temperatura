namespace MonitorTemperatura.Api.Contracts;

public sealed record SensorStatusResponse(
    string SensorId,
    bool Connected,
    DateTimeOffset? LastSignalAtUtc);
