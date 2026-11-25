using System.Security.Claims;

sealed class AdminLoginGate
{
    private readonly SemaphoreSlim mutex = new(1);
    private int failures;
    private DateTimeOffset lastFailure;
    private DateTimeOffset lockedUntil;
    private static readonly TimeSpan Duration = TimeSpan.FromMinutes(15);

    public async ValueTask<object?> Filter(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        await mutex.WaitAsync(http.RequestAborted);
        try
        {
            var now = DateTimeOffset.UtcNow;
            if (now < lockedUntil) return Locked(http, now);
            if (now - lastFailure >= Duration || lockedUntil != default)
            {
                failures = 0;
                lockedUntil = default;
            }
            try
            {
                var result = await next(context);
                if (result is IStatusCodeHttpResult { StatusCode: 200 } &&
                    (http.Request.Path == "/api/admin/verify" ||
                     http.Response.Headers.SetCookie.Any(cookie => cookie?.StartsWith("JasmineStore.Admin=") == true)
                     && result is IValueHttpResult { Value: { } payload }
                     && payload.GetType().GetProperty("mfa")?.GetValue(payload) is false))
                    failures = 0;
                return result;
            }
            catch (StoreException ex) when (ex.Status == 401)
            {
                lastFailure = DateTimeOffset.UtcNow;
                if (++failures < 5) throw;
                lockedUntil = lastFailure + Duration;
                return Locked(http, lastFailure);
            }
        }
        finally { mutex.Release(); }
    }

    private object Locked(HttpContext http, DateTimeOffset now)
    {
        http.Response.Headers.RetryAfter = Math.Ceiling((lockedUntil - now).TotalSeconds).ToString(System.Globalization.CultureInfo.InvariantCulture);
        return Results.Json(new { error = "توقف تسجيل دخول الإدارة مؤقتًا بعد 5 محاولات خاطئة. حاولي بعد 15 دقيقة." }, statusCode: 429);
    }
}
