using MediatR;

namespace LadiPage.Application.Features.Workspaces;

public record CreateWorkspaceCommand(string Name, string Slug) : IRequest<WorkspaceDto>;
