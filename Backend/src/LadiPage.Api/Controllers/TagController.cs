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
    public async Task<IActionResult> GetTags([FromQuery] long workspaceId, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, workspaceId)) return NotFound();
        var items = await _db.Tags.Where(t => t.WorkspaceId == workspaceId).OrderBy(t => t.Name)
            .Select(t => new { t.Id, t.Name, t.Color, t.CreatedAt }).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTagRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, req.WorkspaceId)) return NotFound();
        var tag = new Tag { WorkspaceId = req.WorkspaceId, Name = req.Name.Trim(), Color = req.Color, CreatedAt = DateTime.UtcNow };
        _db.Tags.Add(tag);
        await _db.SaveChangesAsync(ct);
        return Ok(new { tag.Id, tag.Name, tag.Color, tag.CreatedAt });
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
        await _db.SaveChangesAsync(ct);
        return Ok(new { tag.Id, tag.Name, tag.Color });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var tag = await _db.Tags.FindAsync([id], ct);
        if (tag == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, tag.WorkspaceId)) return NotFound();
        _db.Tags.Remove(tag);
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
