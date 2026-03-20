using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class UpdatePageContentCommandHandler : IRequestHandler<UpdatePageContentCommand, bool>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public UpdatePageContentCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<bool> Handle(UpdatePageContentCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null) return false;
        var userId = _currentUser.UserId.Value;

        var page = await _db.Pages
            .FirstOrDefaultAsync(p => p.Id == request.PageId, cancellationToken);

        if (page is null) return false;

        var canAccess = await _db.Workspaces
            .AsNoTracking()
            .AnyAsync(w => w.Id == page.WorkspaceId &&
                (w.OwnerId == userId || _db.WorkspaceMembers.Any(m => m.WorkspaceId == w.Id && m.UserId == userId)), cancellationToken);

        if (!canAccess) return false;

        var existingSections = await _db.PageSections
            .Where(s => s.PageId == page.Id)
            .ToListAsync(cancellationToken);

        if (existingSections.Count > 0)
        {
            var existingSectionIds = existingSections.Select(s => s.Id).ToArray();
            var existingElements = await _db.PageElements
                .Where(e => existingSectionIds.Contains(e.SectionId))
                .ToListAsync(cancellationToken);
            _db.PageElements.RemoveRange(existingElements);
            _db.PageSections.RemoveRange(existingSections);
        }

        var newSections = new List<PageSection>();
        foreach (var s in request.Content.Sections)
        {
            var section = new PageSection
            {
                PageId = page.Id,
                Order = s.Order,
                Name = s.Name,
                BackgroundColor = s.BackgroundColor,
                BackgroundImageUrl = s.BackgroundImageUrl,
                Height = s.Height,
                IsVisible = s.IsVisible,
                IsLocked = s.IsLocked,
                CustomClass = s.CustomClass
            };
            newSections.Add(section);
        }

        _db.PageSections.AddRange(newSections);
        await _db.SaveChangesAsync(cancellationToken);

        var sectionIdMap = newSections
            .OrderBy(s => s.Order)
            .Select((s, index) => new { s, index })
            .ToDictionary(x => request.Content.Sections[x.index].Id, x => x.s.Id);

        var newElements = new List<PageElement>();
        foreach (var s in request.Content.Sections)
        {
            if (!sectionIdMap.TryGetValue(s.Id, out var newSectionId)) continue;

            foreach (var e in s.Elements)
            {
                newElements.Add(new PageElement
                {
                    SectionId = newSectionId,
                    Type = e.Type,
                    Order = e.Order,
                    X = e.X,
                    Y = e.Y,
                    Width = e.Width,
                    Height = e.Height,
                    ZIndex = e.ZIndex,
                    Rotation = e.Rotation,
                    Opacity = e.Opacity,
                    IsLocked = e.IsLocked,
                    IsHidden = e.IsHidden,
                    Content = e.Content,
                    Href = e.Href,
                    Target = e.Target,
                    ImageUrl = e.ImageUrl,
                    VideoUrl = e.VideoUrl,
                    StylesJson = string.IsNullOrWhiteSpace(e.StylesJson) ? "{}" : e.StylesJson
                });
            }
        }

        if (newElements.Count > 0)
            _db.PageElements.AddRange(newElements);

        page.JsonContent = System.Text.Json.JsonSerializer.Serialize(request.Content);
        page.MetaTitle = request.Content.MetaTitle;
        page.MetaDescription = request.Content.MetaDescription;
        page.MobileFriendly = request.Content.MobileFriendly;
        page.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
