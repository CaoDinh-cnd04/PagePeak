using MediatR;

namespace LadiPage.Application.Features.Auth;

public record LoginCommand(string Email, string Password, string? IpAddress = null, string? UserAgent = null) : IRequest<TokenResponse?>;
