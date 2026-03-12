using MediatR;

namespace LadiPage.Application.Features.Pages;

public record PublishPageCommand(long PageId) : IRequest<bool>;

