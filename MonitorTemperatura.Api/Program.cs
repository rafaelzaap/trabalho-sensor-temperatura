using Microsoft.EntityFrameworkCore;
using MonitorTemperatura.Api.Application;
using MonitorTemperatura.Api.Endpoints;
using MonitorTemperatura.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

var allowedOrigin = builder.Configuration["Cors:AllowedOrigin"]
    ?? "http://localhost:5500";

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(allowedOrigin)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var connectionString = builder.Configuration.GetConnectionString("Temperaturas")
    ?? "Data Source=temperaturas.db";

builder.Services.AddDbContext<TemperaturaDbContext>(options =>
    options.UseSqlite(connectionString));
builder.Services.AddScoped<ILeituraTemperaturaRepository, LeituraTemperaturaRepository>();
builder.Services.AddScoped<ITemperaturaService, TemperaturaService>();
builder.Services.AddScoped<ApiKeyEndpointFilter>();
builder.Services.AddSingleton<SensorStatusMonitor>();
builder.Services.AddHostedService(provider => provider.GetRequiredService<SensorStatusMonitor>());

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Monitor de Temperatura API v1");
    });
}

app.UseHttpsRedirection();
app.UseCors("Frontend");

app.MapTemperaturasEndpoints();
app.MapSensorStatusEndpoints();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TemperaturaDbContext>();
    await db.Database.MigrateAsync();
}
await app.Services.GetRequiredService<SensorStatusMonitor>().InitializeAsync();

app.Run();
