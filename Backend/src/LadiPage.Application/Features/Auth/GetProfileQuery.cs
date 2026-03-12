using MediatR;

namespace LadiPage.Application.Features.Auth;

public record GetProfileQuery : IRequest<UserProfileDto?>;
