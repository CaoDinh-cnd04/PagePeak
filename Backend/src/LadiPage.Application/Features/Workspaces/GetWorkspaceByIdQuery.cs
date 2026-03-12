using MediatR;

namespace LadiPage.Application.Features.Workspaces;

public record GetWorkspaceByIdQuery(long Id) : IRequest<WorkspaceDto?>;
