using LadiPage.Core.Entities;
using LadiPage.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Workspaces;

public class CreateWorkspaceCommandHandler : IRequestHandler<CreateWorkspaceCommand, WorkspaceDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IDateTime _dateTime;

    public CreateWorkspaceCommandHandler(IAppDbContext db, ICurrentUser currentUser, IDateTime dateTime)
    {
        _db = db;
        _currentUser = currentUser;
        _dateTime = dateTime;
    }

    public async Task<WorkspaceDto> Handle(CreateWorkspaceCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null)
            throw new UnauthorizedAccessException("User not authenticated.");

        var slug = request.Slug.ToLowerInvariant();
        if (await _db.Workspaces.AsNoTracking().AnyAsync(w => w.Slug == slug, cancellationToken))
            throw new InvalidOperationException("Slug already exists.");

        var workspace = new Workspace
        {
            OwnerId = _currentUser.UserId.Value,
            Name = request.Name,
            Slug = slug,
            IsDefault = false,
            CreatedAt = _dateTime.UtcNow,
            UpdatedAt = _dateTime.UtcNow
        };
        _db.Workspaces.Add(workspace);
        await _db.SaveChangesAsync(cancellationToken);

        return new WorkspaceDto(workspace.Id, workspace.Name, workspace.Slug, workspace.LogoUrl, workspace.IsDefault, workspace.CreatedAt);
    }
}
