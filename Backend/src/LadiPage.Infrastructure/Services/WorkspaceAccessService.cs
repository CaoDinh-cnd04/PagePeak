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
        if (workspaceId <= 0) return false;

        var ownerId = await _db.Workspaces
            .AsNoTracking()
            .Where(w => w.Id == workspaceId)
            .Select(w => (long?)w.OwnerId)
            .FirstOrDefaultAsync(cancellationToken);

        if (ownerId == null) return false;
        if (ownerId.Value == userId) return true;

        return await _db.WorkspaceMembers
            .AsNoTracking()
            .AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == userId, cancellationToken);
    }
}
