using MediatR;

namespace LadiPage.Application.Features.Pages;

public record CreatePageCommand(long WorkspaceId, string Name, string Slug, long? TemplateId = null, string? JsonContent = null) : IRequest<PageDto>;

