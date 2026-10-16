using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using MonitorTemperatura.Api.Contracts;
using MonitorTemperatura.Api.Infrastructure;

namespace MonitorTemperatura.Api.Application;

public sealed class SensorStatusMonitor(
    IConfiguration configuration,
    IServiceScopeFactory scopeFactory) : BackgroundService
{
    private readonly object _sync = new();
    private readonly List<Channel<SensorStatusResponse>> _subscribers = [];
    private readonly TimeSpan _timeout = TimeSpan.FromMinutes(
        configuration.GetValue("Monitoring:TimeoutMinutes", 5));
    private readonly TimeSpan _checkInterval = TimeSpan.FromSeconds(
        configuration.GetValue("Monitoring:CheckIntervalSeconds", 5));
    private DateTimeOffset? _lastSignalAtUtc;
    private bool _connected;

    public string SensorId { get; } =
        configuration["Monitoring:SensorId"] ?? "esp32-01";

    public SensorStatusResponse GetCurrentStatus()
    {
        lock (_sync)
        {
            return CreateSnapshot();
        }
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TemperaturaDbContext>();
        var lastSignal = await db.Leituras
            .AsNoTracking()
            .Where(leitura => leitura.SensorId == SensorId)
            .OrderByDescending(leitura => leitura.RegistradaEmUtc)
            .Select(leitura => (DateTime?)leitura.RegistradaEmUtc)
            .FirstOrDefaultAsync(cancellationToken);

        lock (_sync)
        {
            _lastSignalAtUtc = lastSignal.HasValue
                ? new DateTimeOffset(DateTime.SpecifyKind(lastSignal.Value, DateTimeKind.Utc))
                : null;
            _connected = IsRecent(_lastSignalAtUtc, DateTimeOffset.UtcNow);
        }
    }

    public async IAsyncEnumerable<SensorStatusResponse> SubscribeAsync(
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var channel = Channel.CreateBounded<SensorStatusResponse>(new BoundedChannelOptions(1)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false
        });

        lock (_sync)
        {
            _subscribers.Add(channel);
            channel.Writer.TryWrite(CreateSnapshot());
        }

        try
        {
            await foreach (var status in channel.Reader.ReadAllAsync(cancellationToken))
            {
                yield return status;
            }
        }
        finally
        {
            lock (_sync)
            {
                _subscribers.Remove(channel);
                channel.Writer.TryComplete();
            }
        }
    }

    public Task RegistrarSinalAsync(string sensorId)
    {
        if (!string.Equals(sensorId, SensorId, StringComparison.Ordinal))
        {
            return Task.CompletedTask;
        }

        lock (_sync)
        {
            _lastSignalAtUtc = DateTimeOffset.UtcNow;
            _connected = true;
            Publish(CreateSnapshot());
        }

        return Task.CompletedTask;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_checkInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            lock (_sync)
            {
                var connected = IsRecent(_lastSignalAtUtc, DateTimeOffset.UtcNow);
                if (connected == _connected)
                {
                    continue;
                }

                _connected = connected;
                Publish(CreateSnapshot());
            }
        }
    }

    private bool IsRecent(DateTimeOffset? lastSignalAtUtc, DateTimeOffset now) =>
        lastSignalAtUtc.HasValue && now - lastSignalAtUtc.Value <= _timeout;

    private SensorStatusResponse CreateSnapshot() =>
        new(SensorId, _connected, _lastSignalAtUtc);

    private void Publish(SensorStatusResponse status)
    {
        foreach (var subscriber in _subscribers)
        {
            subscriber.Writer.TryWrite(status);
        }
    }
}
