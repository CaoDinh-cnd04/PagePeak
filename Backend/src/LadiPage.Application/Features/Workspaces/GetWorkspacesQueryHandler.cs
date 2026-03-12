using LadiPage.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Workspaces;

public class GetWorkspacesQueryHandler : IRequestHandler<GetWorkspacesQuery, IReadOnlyList<WorkspaceDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public GetWorkspacesQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<WorkspaceDto>> Handle(GetWorkspacesQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null)
            return Array.Empty<WorkspaceDto>();

        var userId = _currentUser.UserId.Value;
        var list = await _db.Workspaces
            .AsNoTracking()
            .Where(w => w.OwnerId == userId || _db.WorkspaceMembers.Any(m => m.WorkspaceId == w.Id && m.UserId == userId))
            .OrderBy(w => w.Name)
            .Select(w => new WorkspaceDto(w.Id, w.Name, w.Slug, w.LogoUrl, w.IsDefault, w.CreatedAt))
            .ToListAsync(cancellationToken);
        return list;
    }
}
