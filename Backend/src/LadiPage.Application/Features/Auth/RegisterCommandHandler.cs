using LadiPage.Core.Interfaces;
using MediatR;

namespace LadiPage.Application.Features.Auth;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, RegisterResult>
{
    private readonly IAuthService _authService;

    public RegisterCommandHandler(IAuthService authService)
    {
        _authService = authService;
    }

    public async Task<RegisterResult> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var userId = await _authService.RegisterAsync(request.Email, request.Password, request.FullName, request.Phone, cancellationToken);
        if (userId == null)
            throw new InvalidOperationException("Email already registered.");
        return new RegisterResult(userId.Value);
    }
}
