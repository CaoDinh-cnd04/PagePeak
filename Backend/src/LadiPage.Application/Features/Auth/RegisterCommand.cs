using MediatR;

namespace LadiPage.Application.Features.Auth;

public record RegisterCommand(string Email, string Password, string FullName, string? Phone = null, string? RecaptchaToken = null) : IRequest<RegisterResult>;

public record RegisterResult(long UserId);
