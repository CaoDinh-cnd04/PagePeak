namespace LadiPage.Application.Features.Auth;

public record TokenResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt);
