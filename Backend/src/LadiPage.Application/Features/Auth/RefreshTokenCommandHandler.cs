using LadiPage.Core.Interfaces;
using MediatR;

namespace LadiPage.Application.Features.Auth;

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, TokenResponse?>
{
    private readonly IAuthService _authService;

    public RefreshTokenCommandHandler(IAuthService authService)
    {
        _authService = authService;
    }

    public async Task<TokenResponse?> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var result = await _authService.RefreshTokenAsync(request.RefreshToken, cancellationToken);
        return result == null ? null : new TokenResponse(result.AccessToken, result.RefreshToken, result.ExpiresAt);
    }
}
