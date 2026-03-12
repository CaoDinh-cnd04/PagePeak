using LadiPage.Core.Interfaces;
using MediatR;

namespace LadiPage.Application.Features.Auth;

public class RevokeTokenCommandHandler : IRequestHandler<RevokeTokenCommand, bool>
{
    private readonly IAuthService _authService;

    public RevokeTokenCommandHandler(IAuthService authService)
    {
        _authService = authService;
    }

    public async Task<bool> Handle(RevokeTokenCommand request, CancellationToken cancellationToken) =>
        await _authService.RevokeRefreshTokenAsync(request.RefreshToken, cancellationToken);
}
