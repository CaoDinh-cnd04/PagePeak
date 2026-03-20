using LadiPage.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Infrastructure.Services;

public class WorkspaceAccessService : IWorkspaceAccessService
{
    private readonly IAppDbContext _db;

    public WorkspaceAccessService(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> CanAccessWorkspaceAsync(long userId, long workspaceId, CancellationToken cancellationToken = default)
    {
        return await _db.Workspaces
            .AsNoTracking()
            .AnyAsync(w => w.Id == workspaceId &&
                (w.OwnerId == userId || _db.WorkspaceMembers.Any(m => m.WorkspaceId == w.Id && m.UserId == userId)), cancellationToken);
    }
}
