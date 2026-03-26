using LadiPage.Api.Models;
using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/tags")]
[Authorize]
public class TagController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceAccessService _workspaceAccess;

    public TagController(IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess)
    {
        _db = db;
        _currentUser = currentUser;
        _workspaceAccess = workspaceAccess;
    }

    [HttpGet]
    public async Task<IActionResult> GetTags([FromQuery] long workspaceId, [FromQuery] string? search, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, workspaceId)) return NotFound();

        var q = _db.Tags.AsNoTracking().Where(t => t.WorkspaceId == workspaceId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(t => t.Name.ToLower().Contains(s));
        }

        var items = await q
            .OrderBy(t => t.Name)
            .Select(t => new
            {
                t.Id,
                t.Name,
                t.Color,
                t.CreatedAt,
                t.UpdatedAt,
                UsageCount = _db.PageTags.Count(pt => pt.TagId == t.Id),
            })
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTagRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, req.WorkspaceId)) return NotFound();

        var now = DateTime.UtcNow;
        var tag = new Tag
        {
            WorkspaceId = req.WorkspaceId,
            Name = req.Name.Trim(),
            Color = req.Color,
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.Tags.Add(tag);
        await _db.SaveChangesAsync(ct);
        return Ok(new { tag.Id, tag.Name, tag.Color, tag.CreatedAt, tag.UpdatedAt, usageCount = 0 });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateTagRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var tag = await _db.Tags.FindAsync([id], ct);
        if (tag == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, tag.WorkspaceId)) return NotFound();
        if (!string.IsNullOrWhiteSpace(req.Name)) tag.Name = req.Name.Trim();
        if (req.Color != null) tag.Color = req.Color;
        tag.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        var usage = await _db.PageTags.CountAsync(pt => pt.TagId == id, ct);
        return Ok(new { tag.Id, tag.Name, tag.Color, tag.CreatedAt, tag.UpdatedAt, usageCount = usage });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var tag = await _db.Tags.FindAsync([id], ct);
        if (tag == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, tag.WorkspaceId)) return NotFound();

        var links = await _db.PageTags.Where(pt => pt.TagId == id).ToListAsync(ct);
        _db.PageTags.RemoveRange(links);
        _db.Tags.Remove(tag);
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }

    [HttpPost("bulk-delete")]
    public async Task<IActionResult> BulkDelete([FromBody] BulkDeleteTagsRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (req.Ids == null || req.Ids.Length == 0) return Ok(new { ok = true, deleted = 0 });

        var tags = await _db.Tags.Where(t => req.Ids.Contains(t.Id)).ToListAsync(ct);
        foreach (var tag in tags)
        {
            if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, tag.WorkspaceId))
                return NotFound();
        }

        var tagIds = tags.Select(t => t.Id).ToList();
        var pageLinks = await _db.PageTags.Where(pt => tagIds.Contains(pt.TagId)).ToListAsync(ct);
        _db.PageTags.RemoveRange(pageLinks);
        _db.Tags.RemoveRange(tags);
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true, deleted = tags.Count });
    }

    /// <summary>Gán danh sách tag cho một trang (thay thế toàn bộ).</summary>
    [HttpPut("page/{pageId:long}")]
    public async Task<IActionResult> SyncPageTags(long pageId, [FromBody] SyncPageTagsRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var page = await _db.Pages.AsNoTracking().FirstOrDefaultAsync(p => p.Id == pageId, ct);
        if (page == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, page.WorkspaceId)) return NotFound();

        var ids = req.TagIds ?? [];
        var validTags = await _db.Tags
            .Where(t => t.WorkspaceId == page.WorkspaceId && ids.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync(ct);

        var existing = await _db.PageTags.Where(pt => pt.PageId == pageId).ToListAsync(ct);
        _db.PageTags.RemoveRange(existing);

        foreach (var tid in validTags)
            _db.PageTags.Add(new PageTag { PageId = pageId, TagId = tid });

        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true, tagIds = validTags });
    }

    [HttpGet("page/{pageId:long}")]
    public async Task<IActionResult> GetPageTags(long pageId, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var page = await _db.Pages.AsNoTracking().FirstOrDefaultAsync(p => p.Id == pageId, ct);
        if (page == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, page.WorkspaceId)) return NotFound();

        var list = await _db.PageTags.AsNoTracking()
            .Where(pt => pt.PageId == pageId)
            .Join(_db.Tags.AsNoTracking(), pt => pt.TagId, t => t.Id, (pt, t) => new { t.Id, t.Name, t.Color })
            .ToListAsync(ct);
        return Ok(list);
    }
}
