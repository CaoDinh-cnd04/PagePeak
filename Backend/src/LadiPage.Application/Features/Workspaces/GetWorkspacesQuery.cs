using MediatR;

namespace LadiPage.Application.Features.Workspaces;

public record GetWorkspacesQuery : IRequest<IReadOnlyList<WorkspaceDto>>;
