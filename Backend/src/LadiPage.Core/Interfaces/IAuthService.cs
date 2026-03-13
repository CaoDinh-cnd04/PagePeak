using LadiPage.Core.Auth;

namespace LadiPage.Core.Interfaces;

public interface IAuthService
{
    Task<AuthTokenResult?> LoginAsync(string email, string password, string? ipAddress = null, string? userAgent = null, CancellationToken cancellationToken = default);
    Task<long?> RegisterAsync(string email, string password, string fullName, string? phone = null, CancellationToken cancellationToken = default);
    Task<bool> VerifyEmailAsync(string token, CancellationToken cancellationToken = default);
    Task<bool> ResendVerificationEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<AuthTokenResult?> LoginOrRegisterExternalAsync(string email, string fullName, string? ipAddress = null, string? userAgent = null, CancellationToken cancellationToken = default);
    Task<AuthTokenResult?> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);
    Task<bool> RevokeRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);
}
