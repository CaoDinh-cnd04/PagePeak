using MediatR;

namespace LadiPage.Application.Features.Auth;

public record RevokeTokenCommand(string RefreshToken) : IRequest<bool>;
