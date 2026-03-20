namespace LadiPage.Domain.Auth;

public record AuthTokenResult(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt
);
