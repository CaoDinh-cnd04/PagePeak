using LadiPage.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Workspaces;

public class GetWorkspaceByIdQueryHandler : IRequestHandler<GetWorkspaceByIdQuery, WorkspaceDto?>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public GetWorkspaceByIdQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<WorkspaceDto?> Handle(GetWorkspaceByIdQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null)
            return null;

        var userId = _currentUser.UserId.Value;
        var w = await _db.Workspaces
            .AsNoTracking()
            .Where(w => w.Id == request.Id && (w.OwnerId == userId || _db.WorkspaceMembers.Any(m => m.WorkspaceId == w.Id && m.UserId == userId)))
            .Select(w => new WorkspaceDto(w.Id, w.Name, w.Slug, w.LogoUrl, w.IsDefault, w.CreatedAt))
            .FirstOrDefaultAsync(cancellationToken);
        return w;
    }
}
