namespace LadiPage.Core.Auth;

public record AuthTokenResult(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt
);
