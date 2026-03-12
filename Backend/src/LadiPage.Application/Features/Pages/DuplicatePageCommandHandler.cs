using LadiPage.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class DuplicatePageCommandHandler : IRequestHandler<DuplicatePageCommand, PageDto?>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public DuplicatePageCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<PageDto?> Handle(DuplicatePageCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null) return null;
        var userId = _currentUser.UserId.Value;

        var source = await _db.Pages
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.PageId, cancellationToken);
        if (source == null) return null;

        var canAccess = await _db.Workspaces
            .AsNoTracking()
            .AnyAsync(w => w.Id == source.WorkspaceId &&
                (w.OwnerId == userId || _db.WorkspaceMembers.Any(m => m.WorkspaceId == w.Id && m.UserId == userId)), cancellationToken);
        if (!canAccess) return null;

        var suffix = DateTime.UtcNow.Ticks % 10000;
        var name = $"{source.Name.TrimEnd()} (Copy)";
        if (name.Length > 200) name = name[..200];
        var slug = $"{source.Slug}-copy-{suffix}";
        if (slug.Length > 150) slug = slug[..150];

        var now = DateTime.UtcNow;
        var page = new LadiPage.Core.Entities.Page
        {
            WorkspaceId = source.WorkspaceId,
            Name = name,
            Slug = slug,
            Status = "draft",
            PageType = source.PageType,
            JsonContent = source.JsonContent ?? "{}",
            HtmlContent = source.HtmlContent,
            MobileFriendly = source.MobileFriendly,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Pages.Add(page);
        await _db.SaveChangesAsync(cancellationToken);

        return new PageDto(page.Id, page.WorkspaceId, page.Name, page.Slug, page.Status, page.UpdatedAt);
    }
}
