using MediatR;

namespace LadiPage.Application.Features.Pages;

public record GetPagesQuery(long WorkspaceId) : IRequest<IReadOnlyList<PageDto>>;

