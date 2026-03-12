using MediatR;

namespace LadiPage.Application.Features.Auth;

public record RefreshTokenCommand(string RefreshToken) : IRequest<TokenResponse?>;
