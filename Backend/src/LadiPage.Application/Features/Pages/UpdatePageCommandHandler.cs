using LadiPage.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class UpdatePageCommandHandler : IRequestHandler<UpdatePageCommand, PageDto?>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public UpdatePageCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<PageDto?> Handle(UpdatePageCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null) return null;
        var userId = _currentUser.UserId.Value;

        var page = await _db.Pages
            .FirstOrDefaultAsync(p => p.Id == request.PageId, cancellationToken);
        if (page == null) return null;

        var canAccess = await _db.Workspaces
            .AsNoTracking()
            .AnyAsync(w => w.Id == page.WorkspaceId &&
                (w.OwnerId == userId || _db.WorkspaceMembers.Any(m => m.WorkspaceId == w.Id && m.UserId == userId)), cancellationToken);
        if (!canAccess) return null;

        page.Name = request.Name.Trim();
        page.Slug = request.Slug.Trim();
        page.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return new PageDto(page.Id, page.WorkspaceId, page.Name, page.Slug, page.Status, page.UpdatedAt);
    }
}
