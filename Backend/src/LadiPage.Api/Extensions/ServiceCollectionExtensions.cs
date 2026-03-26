using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace LadiPage.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration config)
    {
        var frontendLogin = $"{(config["Frontend:BaseUrl"] ?? "http://localhost:3000").TrimEnd('/')}/login?error=oauth_failed";

        Task HandleOAuthRemoteFailure(RemoteFailureContext ctx, string provider)
        {
            var logger = ctx.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger($"Auth.{provider}");
            var ex = ctx.Failure;
            var msg = ex?.Message ?? "";
            var inner = ex?.InnerException;
            if (msg.Contains("Correlation", StringComparison.OrdinalIgnoreCase))
                logger.LogInformation("{Provider} OAuth: correlation cookie không khớp (dùng cùng host, ví dụ chỉ localhost:5000; không restart API giữa chừng; đăng nhập Google trong cùng một tab).", provider);
            else if (inner is TaskCanceledException or OperationCanceledException || ex is TaskCanceledException)
                logger.LogInformation(ex, "{Provider} OAuth: đổi code lấy token bị hủy/timeout (mạng hoặc Google chậm).", provider);
            else
                logger.LogWarning(ex, "{Provider} OAuth remote failure", provider);
            ctx.Response.Redirect(frontendLogin);
            ctx.HandleResponse();
            return Task.CompletedTask;
        }

        var jwtSecret = config["JwtSettings:Secret"] ?? throw new InvalidOperationException("JwtSettings:Secret is required.");
        var issuer = config["JwtSettings:Issuer"];
        var audience = config["JwtSettings:Audience"];

        var authBuilder = services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            })
            .AddCookie("ExternalCookie", options =>
            {
                options.Cookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax;
                options.Cookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.SameAsRequest;
            });

        var googleClientId = config["Authentication:Google:ClientId"];
        var googleClientSecret = config["Authentication:Google:ClientSecret"];
        if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
        {
            authBuilder.AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
            {
                options.ClientId = googleClientId;
                options.ClientSecret = googleClientSecret;
                options.SignInScheme = "ExternalCookie";
                options.CallbackPath = "/signin-google";
                options.BackchannelTimeout = TimeSpan.FromMinutes(2);
                options.CorrelationCookie.Path = "/";
                options.CorrelationCookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax;
                options.CorrelationCookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.SameAsRequest;
                options.Events.OnRemoteFailure = ctx => HandleOAuthRemoteFailure(ctx, "Google");
            });
        }

        var fbAppId = config["Authentication:Facebook:AppId"];
        var fbAppSecret = config["Authentication:Facebook:AppSecret"];
        if (!string.IsNullOrWhiteSpace(fbAppId) && !string.IsNullOrWhiteSpace(fbAppSecret))
        {
            authBuilder.AddFacebook(FacebookDefaults.AuthenticationScheme, options =>
            {
                options.AppId = fbAppId;
                options.AppSecret = fbAppSecret;
                options.SignInScheme = "ExternalCookie";
                options.CallbackPath = "/signin-facebook";
                options.BackchannelTimeout = TimeSpan.FromMinutes(2);
                options.CorrelationCookie.Path = "/";
                options.CorrelationCookie.SameSite = Microsoft.AspNetCore.Http.SameSiteMode.Lax;
                options.CorrelationCookie.SecurePolicy = Microsoft.AspNetCore.Http.CookieSecurePolicy.SameAsRequest;
                options.Events.OnRemoteFailure = ctx => HandleOAuthRemoteFailure(ctx, "Facebook");
            });
        }

        return services;
    }

    public static IServiceCollection AddCorsPolicy(this IServiceCollection services, IConfiguration config)
    {
        services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                var allowedOrigins = config.GetSection("Cors:Origins").Get<string[]>();
                if (allowedOrigins != null && allowedOrigins.Length > 0)
                    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
                else
                    policy.SetIsOriginAllowed(_ => true).AllowAnyHeader().AllowAnyMethod();
            });
        });
        return services;
    }
}
