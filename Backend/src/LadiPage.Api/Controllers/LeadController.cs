using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/leads")]
[Authorize]
public class LeadController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceAccessService _workspaceAccess;

    public LeadController(IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess)
    {
        _db = db;
        _currentUser = currentUser;
        _workspaceAccess = workspaceAccess;
    }

    [HttpGet]
    public async Task<IActionResult> GetLeads([FromQuery] long workspaceId, [FromQuery] long? pageId, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, workspaceId)) return NotFound();
        var query = _db.Leads.Where(l => l.WorkspaceId == workspaceId);
        if (pageId.HasValue) query = query.Where(l => l.PageId == pageId.Value);
        var items = await query.OrderByDescending(l => l.CreatedAt)
            .Select(l => new { l.Id, l.PageId, l.FormId, l.DataJson, l.IpAddress, l.CreatedAt })
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var l = await _db.Leads.FindAsync([id], ct);
        if (l == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, l.WorkspaceId)) return NotFound();
        _db.Leads.Remove(l);
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
