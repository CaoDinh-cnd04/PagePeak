using System.Text.Json;
using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class CreatePageCommandHandler : IRequestHandler<CreatePageCommand, PageDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public CreatePageCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<PageDto> Handle(CreatePageCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == null)
            throw new InvalidOperationException("Unauthorized.");

        // Basic check workspace exists and user has access (owner or member)
        var canAccess = await _db.Workspaces.AsNoTracking()
            .AnyAsync(w => w.Id == request.WorkspaceId &&
                (w.OwnerId == _currentUser.UserId.Value || _db.WorkspaceMembers.Any(m => m.WorkspaceId == w.Id && m.UserId == _currentUser.UserId.Value)), cancellationToken);
        if (!canAccess) throw new InvalidOperationException("Workspace not found hoặc bạn không có quyền tạo trang trong workspace này.");

        // Check plan limit: total pages across all user's workspaces
        var user = await _db.Users.AsNoTracking()
            .Include(u => u.CurrentPlan)
            .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId.Value, cancellationToken);
        if (user?.CurrentPlan != null)
        {
            var workspaceIds = await _db.Workspaces
                .Where(w => w.OwnerId == user.Id)
                .Select(w => w.Id)
                .ToListAsync(cancellationToken);
            var totalPages = workspaceIds.Count > 0
                ? await _db.Pages.CountAsync(p => workspaceIds.Contains(p.WorkspaceId), cancellationToken)
                : 0;
            if (totalPages >= user.CurrentPlan.MaxPages)
                throw new InvalidOperationException("Bạn đã đạt giới hạn trang của gói hiện tại. Vui lòng nâng cấp gói.");
        }

        var now = DateTime.UtcNow;
        var page = new Page
        {
            WorkspaceId = request.WorkspaceId,
            Name = request.Name.Trim(),
            Slug = request.Slug.Trim(),
            Status = "draft",
            PageType = "trangdich",
            JsonContent = "{}",
            HtmlContent = null,
            MobileFriendly = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        // Resolve template JsonContent — from DB template or direct payload
        string? templateJson = null;

        if (request.TemplateId is > 0)
        {
            var tpl = await _db.Templates.AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == request.TemplateId.Value, cancellationToken);
            if (tpl != null)
                templateJson = tpl.JsonContent;
        }

        if (templateJson == null && !string.IsNullOrWhiteSpace(request.JsonContent))
            templateJson = request.JsonContent;

        _db.Pages.Add(page);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("IX_Trang_MaKhongGian_DuongDan") == true)
        {
            throw new InvalidOperationException("Slug đã tồn tại trong workspace này. Vui lòng chọn slug khác.");
        }

        // Parse template JSON and create PageSection + PageElement records
        if (!string.IsNullOrWhiteSpace(templateJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(templateJson);
                var root = doc.RootElement;

                if (root.TryGetProperty("sections", out var sectionsEl) && sectionsEl.ValueKind == JsonValueKind.Array)
                {
                    int sectionOrder = 1;
                    foreach (var sEl in sectionsEl.EnumerateArray())
                    {
                        var section = new PageSection
                        {
                            PageId = page.Id,
                            Order = sEl.TryGetProperty("order", out var ord) ? ord.GetInt32() : sectionOrder,
                            Name = sEl.TryGetProperty("name", out var sName) ? sName.GetString() : "Section",
                            BackgroundColor = sEl.TryGetProperty("backgroundColor", out var bgc) && bgc.ValueKind != JsonValueKind.Null ? bgc.GetString() : null,
                            BackgroundImageUrl = sEl.TryGetProperty("backgroundImageUrl", out var bgi) && bgi.ValueKind != JsonValueKind.Null ? bgi.GetString() : null,
                            Height = sEl.TryGetProperty("height", out var ht) ? ht.GetInt32() : 600,
                            IsVisible = !sEl.TryGetProperty("visible", out var vis) || vis.GetBoolean(),
                            IsLocked = sEl.TryGetProperty("isLocked", out var slk) && slk.GetBoolean(),
                        };
                        _db.PageSections.Add(section);
                        await _db.SaveChangesAsync(cancellationToken);

                        if (sEl.TryGetProperty("elements", out var elsEl) && elsEl.ValueKind == JsonValueKind.Array)
                        {
                            int elOrder = 1;
                            foreach (var eEl in elsEl.EnumerateArray())
                            {
                                var stylesJson = "{}";
                                if (eEl.TryGetProperty("styles", out var stylesEl))
                                    stylesJson = stylesEl.GetRawText();

                                var element = new PageElement
                                {
                                    SectionId = section.Id,
                                    Type = eEl.TryGetProperty("type", out var tp) ? tp.GetString() ?? "text" : "text",
                                    Order = eEl.TryGetProperty("order", out var eOrd) ? eOrd.GetInt32() : elOrder,
                                    X = eEl.TryGetProperty("x", out var ex) ? ex.GetInt32() : 0,
                                    Y = eEl.TryGetProperty("y", out var ey) ? ey.GetInt32() : 0,
                                    Width = eEl.TryGetProperty("width", out var ew) ? ew.GetInt32() : null,
                                    Height = eEl.TryGetProperty("height", out var eh) ? eh.GetInt32() : null,
                                    ZIndex = eEl.TryGetProperty("zIndex", out var zi) ? zi.GetInt32() : 0,
                                    Rotation = eEl.TryGetProperty("rotation", out var rot) ? rot.GetDouble() : 0,
                                    Opacity = eEl.TryGetProperty("opacity", out var op) ? op.GetDouble() : 1.0,
                                    IsLocked = eEl.TryGetProperty("isLocked", out var elk) && elk.GetBoolean(),
                                    IsHidden = eEl.TryGetProperty("isHidden", out var ehi) && ehi.GetBoolean(),
                                    Content = eEl.TryGetProperty("content", out var cnt) ? cnt.GetString() : null,
                                    StylesJson = stylesJson,
                                };
                                _db.PageElements.Add(element);
                                elOrder++;
                            }
                            await _db.SaveChangesAsync(cancellationToken);
                        }
                        sectionOrder++;
                    }
                }
            }
            catch
            {
                // If template JSON parsing fails, page is still created (just empty)
            }
        }

        return new PageDto(page.Id, page.WorkspaceId, page.Name, page.Slug, page.Status, page.UpdatedAt);
    }
}
