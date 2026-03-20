using System.Text.Json;
using LadiPage.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class GetPageContentQueryHandler : IRequestHandler<GetPageContentQuery, PageContentDto?>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceAccessService _workspaceAccess;

    public GetPageContentQueryHandler(IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess)
    {
        _db = db;
        _currentUser = currentUser;
        _workspaceAccess = workspaceAccess;
    }

    public async Task<PageContentDto?> Handle(GetPageContentQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null) return null;

        var page = await _db.Pages
            .AsNoTracking()
            .Where(p => p.Id == request.PageId)
            .Select(p => new
            {
                p.Id, p.WorkspaceId, p.Name, p.Slug, p.Status,
                p.MetaTitle, p.MetaDescription, p.PageType, p.MobileFriendly,
                p.JsonContent
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (page is null) return null;

        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, page.WorkspaceId, cancellationToken))
            return null;

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

        PageSettingsDto? pageSettings = null;
        if (!string.IsNullOrWhiteSpace(page.JsonContent))
        {
            try
            {
                var json = JsonDocument.Parse(page.JsonContent);
                if (json.RootElement.TryGetProperty("pageSettings", out var psEl))
                {
                    pageSettings = new PageSettingsDto(
                        psEl.TryGetProperty("metaKeywords", out var mk) ? mk.GetString() : null,
                        psEl.TryGetProperty("metaImageUrl", out var mi) ? mi.GetString() : null,
                        psEl.TryGetProperty("faviconUrl", out var fv) ? fv.GetString() : null,
                        psEl.TryGetProperty("facebookPixelId", out var fp) ? fp.GetString() : null,
                        psEl.TryGetProperty("googleAnalyticsId", out var ga) ? ga.GetString() : null,
                        psEl.TryGetProperty("googleAdsId", out var gads) ? gads.GetString() : null,
                        psEl.TryGetProperty("tiktokPixelId", out var tt) ? tt.GetString() : null,
                        psEl.TryGetProperty("zaloAdsType", out var za) ? za.GetString() : null,
                        psEl.TryGetProperty("zaloAdsPixelId", out var zap) ? zap.GetString() : null,
                        psEl.TryGetProperty("googleTagManagerId", out var gtm) ? gtm.GetString() : null,
                        psEl.TryGetProperty("codeBeforeHead", out var cbh) ? cbh.GetString() : null,
                        psEl.TryGetProperty("codeBeforeBody", out var cbb) ? cbb.GetString() : null,
                        psEl.TryGetProperty("useDelayJS", out var udj) && udj.ValueKind == JsonValueKind.True ? true : null,
                        psEl.TryGetProperty("useLazyload", out var ull) && ull.ValueKind == JsonValueKind.True ? true : null
                    );
                }
            }
            catch
            {
                // ignore parse errors
            }
        }

        return new PageContentDto(
            page.Id, page.WorkspaceId, page.Name, page.Slug, page.Status,
            page.MetaTitle, page.MetaDescription, page.PageType, page.MobileFriendly,
            sectionDtos,
            pageSettings
        );
    }
}
