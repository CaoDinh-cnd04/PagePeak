using LadiPage.Core.Entities;
using LadiPage.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Application.Features.Pages;

public class CreatePageCommandHandler : IRequestHandler<CreatePageCommand, PageDto>
{
    private readonly IAppDbContext _db;

    public CreatePageCommandHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<PageDto> Handle(CreatePageCommand request, CancellationToken cancellationToken)
    {
        // Basic check workspace exists
        var wsExists = await _db.Workspaces.AsNoTracking()
            .AnyAsync(w => w.Id == request.WorkspaceId, cancellationToken);
        if (!wsExists) throw new InvalidOperationException("Workspace not found.");

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

