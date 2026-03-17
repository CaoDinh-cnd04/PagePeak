using System.Text.Json;
using LadiPage.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class PublishPageCommandHandler : IRequestHandler<PublishPageCommand, PublishPageResult>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceAccessService _workspaceAccess;

    public PublishPageCommandHandler(IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess)
    {
        _db = db;
        _currentUser = currentUser;
        _workspaceAccess = workspaceAccess;
    }

    public async Task<PublishPageResult> Handle(PublishPageCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null) return new PublishPageResult(false, "Unauthorized", []);

        var page = await _db.Pages
            .Include(p => p.Sections)
                .ThenInclude(s => s.Elements)
            .FirstOrDefaultAsync(p => p.Id == request.PageId, cancellationToken);

        if (page == null)
            return new PublishPageResult(false, "Page not found", []);

        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, page.WorkspaceId, cancellationToken))
            return new PublishPageResult(false, "Page not found", []);

        var checks = new List<PublishCheckItem>();

        // 1. Page name
        var hasName = !string.IsNullOrWhiteSpace(page.Name);
        checks.Add(new("name", hasName, hasName ? "Trang đã có tên" : "Trang chưa có tên"));

        // 2. Slug
        var hasSlug = !string.IsNullOrWhiteSpace(page.Slug);
        checks.Add(new("slug", hasSlug, hasSlug ? $"Slug: {page.Slug}" : "Trang chưa có slug (URL)"));

        // 3. At least one section
        var hasSections = page.Sections.Count > 0;
        checks.Add(new("sections", hasSections, hasSections ? $"{page.Sections.Count} section(s)" : "Trang chưa có section nào"));

        // 4. At least one element across all sections
        var totalElements = page.Sections.Sum(s => s.Elements.Count);
        var jsonHasElements = false;
        if (totalElements == 0 && !string.IsNullOrWhiteSpace(page.JsonContent) && page.JsonContent != "{}")
        {
            try
            {
                using var doc = JsonDocument.Parse(page.JsonContent);
                if (doc.RootElement.TryGetProperty("sections", out var sectionsEl) && sectionsEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var sec in sectionsEl.EnumerateArray())
                    {
                        if (sec.TryGetProperty("elements", out var elementsEl) && elementsEl.ValueKind == JsonValueKind.Array && elementsEl.GetArrayLength() > 0)
                        {
                            jsonHasElements = true;
                            break;
                        }
                    }
                }
            }
            catch { /* ignore parse errors */ }
        }
        var hasElements = totalElements > 0 || jsonHasElements;
        checks.Add(new("elements", hasElements, hasElements ? $"{Math.Max(totalElements, 1)}+ element(s)" : "Trang chưa có nội dung (element)"));

        // 5. Meta title (SEO)
        var hasMetaTitle = !string.IsNullOrWhiteSpace(page.MetaTitle);
        checks.Add(new("metaTitle", hasMetaTitle, hasMetaTitle ? $"Meta title: {page.MetaTitle}" : "Chưa có Meta Title (SEO)"));

        // 6. Meta description (SEO) — warning, not blocking
        var hasMetaDesc = !string.IsNullOrWhiteSpace(page.MetaDescription);
        checks.Add(new("metaDescription", hasMetaDesc, hasMetaDesc ? "Đã có meta description" : "Chưa có Meta Description (khuyến nghị)"));

        // Required checks: name, slug, sections, elements
        var requiredKeys = new HashSet<string> { "name", "slug", "sections", "elements" };
        var failedRequired = checks.Where(c => requiredKeys.Contains(c.Key) && !c.Passed).ToList();

        if (failedRequired.Count > 0)
        {
            return new PublishPageResult(false, "Chưa đủ điều kiện để xuất bản", checks);
        }

        page.Status = "published";
        page.PublishedAt = DateTime.UtcNow;
        page.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        return new PublishPageResult(true, null, checks);
    }
}
