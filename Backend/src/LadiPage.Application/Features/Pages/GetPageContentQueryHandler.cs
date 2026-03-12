using LadiPage.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class GetPageContentQueryHandler : IRequestHandler<GetPageContentQuery, PageContentDto?>
{
    private readonly IAppDbContext _db;

    public GetPageContentQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<PageContentDto?> Handle(GetPageContentQuery request, CancellationToken cancellationToken)
    {
        var page = await _db.Pages
            .AsNoTracking()
            .Where(p => p.Id == request.PageId)
            .Select(p => new
            {
                p.Id, p.WorkspaceId, p.Name, p.Slug, p.Status,
                p.MetaTitle, p.MetaDescription, p.PageType, p.MobileFriendly
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (page is null) return null;

        var sections = await _db.PageSections
            .AsNoTracking()
            .Where(s => s.PageId == page.Id)
            .OrderBy(s => s.Order)
            .Select(s => new
            {
                s.Id, s.PageId, s.Order, s.Name,
                s.BackgroundColor, s.BackgroundImageUrl,
                s.Height, s.IsVisible, s.IsLocked, s.CustomClass
            })
            .ToListAsync(cancellationToken);

        var sectionIds = sections.Select(s => s.Id).ToArray();

        var elements = await _db.PageElements
            .AsNoTracking()
            .Where(e => sectionIds.Contains(e.SectionId))
            .OrderBy(e => e.SectionId)
            .ThenBy(e => e.Order)
            .ToListAsync(cancellationToken);

        var sectionDtos = sections
            .Select(s =>
            {
                var els = elements
                    .Where(e => e.SectionId == s.Id)
                    .Select(e => new PageElementDto(
                        e.Id, e.SectionId, e.Type, e.Order,
                        e.X, e.Y, e.Width, e.Height, e.ZIndex,
                        e.Rotation, e.Opacity, e.IsLocked, e.IsHidden,
                        e.Content, e.Href, e.Target,
                        e.ImageUrl, e.VideoUrl, e.StylesJson
                    ))
                    .ToList();

                return new PageSectionDto(
                    s.Id, s.PageId, s.Order, s.Name,
                    s.BackgroundColor, s.BackgroundImageUrl,
                    s.Height, s.IsVisible, s.IsLocked, s.CustomClass,
                    els
                );
            })
            .ToList();

        return new PageContentDto(
            page.Id, page.WorkspaceId, page.Name, page.Slug, page.Status,
            page.MetaTitle, page.MetaDescription, page.PageType, page.MobileFriendly,
            sectionDtos
        );
    }
}
