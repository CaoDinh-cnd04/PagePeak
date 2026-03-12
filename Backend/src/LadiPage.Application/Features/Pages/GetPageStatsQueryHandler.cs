using LadiPage.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class GetPageStatsQueryHandler : IRequestHandler<GetPageStatsQuery, PageStatsDto?>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public GetPageStatsQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<PageStatsDto?> Handle(GetPageStatsQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null) return null;
        var userId = _currentUser.UserId.Value;

        var page = await _db.Pages
            .AsNoTracking()
            .Where(p => p.Id == request.PageId)
            .Select(p => new { p.Id, p.WorkspaceId, p.Name })
            .FirstOrDefaultAsync(cancellationToken);
        if (page == null) return null;

        var canAccess = await _db.Workspaces
            .AsNoTracking()
            .AnyAsync(w => w.Id == page.WorkspaceId &&
                (w.OwnerId == userId || _db.WorkspaceMembers.Any(m => m.WorkspaceId == w.Id && m.UserId == userId)), cancellationToken);
        if (!canAccess) return null;

        // Placeholder: no PageView table yet. Return zeros; you can add PageViews/PageStats table later.
        return new PageStatsDto(page.Id, page.Name, 0, 0, null);
    }
}
