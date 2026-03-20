using LadiPage.Api.Models;
using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/domains")]
[Authorize]
public class DomainController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceAccessService _workspaceAccess;

    public DomainController(IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess)
    {
        _db = db;
        _currentUser = currentUser;
        _workspaceAccess = workspaceAccess;
    }

    [HttpGet]
    public async Task<IActionResult> GetDomains([FromQuery] long workspaceId, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, workspaceId)) return NotFound();
        var items = await _db.Domains.Where(d => d.WorkspaceId == workspaceId).OrderByDescending(d => d.CreatedAt)
            .Select(d => new { d.Id, d.DomainName, d.Status, d.VerifiedAt, d.CreatedAt }).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDomainRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, req.WorkspaceId)) return NotFound();
        var domain = new CustomDomain { WorkspaceId = req.WorkspaceId, DomainName = req.DomainName.Trim().ToLowerInvariant(), Status = "pending", CreatedAt = DateTime.UtcNow };
        _db.Domains.Add(domain);
        await _db.SaveChangesAsync(ct);
        return Ok(new { domain.Id, domain.DomainName, domain.Status, domain.CreatedAt });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var domain = await _db.Domains.FindAsync([id], ct);
        if (domain == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, domain.WorkspaceId)) return NotFound();
        _db.Domains.Remove(domain);
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
