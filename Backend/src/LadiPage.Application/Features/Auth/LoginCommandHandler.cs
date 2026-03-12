using LadiPage.Core.Interfaces;
using MediatR;

namespace LadiPage.Application.Features.Auth;

public class LoginCommandHandler : IRequestHandler<LoginCommand, TokenResponse?>
{
    private readonly IAuthService _authService;

    public LoginCommandHandler(IAuthService authService)
    {
        _authService = authService;
    }

    public async Task<TokenResponse?> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(
            request.Email, request.Password,
            request.IpAddress, request.UserAgent,
            cancellationToken);
        return result == null ? null : new TokenResponse(result.AccessToken, result.RefreshToken, result.ExpiresAt);
    }
}
