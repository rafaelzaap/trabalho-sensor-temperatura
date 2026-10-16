using System.Security.Cryptography;
using System.Text;

namespace MonitorTemperatura.Api.Endpoints;

public sealed class ApiKeyEndpointFilter(IConfiguration configuration) : IEndpointFilter
{
    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var expected = configuration["Authentication:ApiKey"];
        var provided = context.HttpContext.Request.Headers["X-Api-Key"].ToString();

        if (string.IsNullOrEmpty(expected) || string.IsNullOrEmpty(provided))
        {
            return ValueTask.FromResult<object?>(Results.Unauthorized());
        }

        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var providedBytes = Encoding.UTF8.GetBytes(provided);
        var valid = expectedBytes.Length == providedBytes.Length
            && CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes);

        return valid
            ? next(context)
            : ValueTask.FromResult<object?>(Results.Unauthorized());
    }
}
