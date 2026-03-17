using LadiPage.Core.Entities;
using LadiPage.Core.Interfaces;
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

        if (request.TemplateId is > 0)
        {
            var tpl = await _db.Templates.AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == request.TemplateId.Value, cancellationToken);
            if (tpl != null)
                page.JsonContent = tpl.JsonContent;
        }

        _db.Pages.Add(page);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("IX_Trang_MaKhongGian_DuongDan") == true)
        {
            // Duplicate key (slug trùng trong cùng workspace)
            throw new InvalidOperationException("Slug đã tồn tại trong workspace này. Vui lòng chọn slug khác.");
        }

        return new PageDto(page.Id, page.WorkspaceId, page.Name, page.Slug, page.Status, page.UpdatedAt);
    }
}

