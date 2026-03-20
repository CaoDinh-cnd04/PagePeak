using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceAccessService _workspaceAccess;

    public ReportController(IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess)
    {
        _db = db;
        _currentUser = currentUser;
        _workspaceAccess = workspaceAccess;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview([FromQuery] long workspaceId, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, workspaceId)) return NotFound();

        var totalPages = await _db.Pages.CountAsync(p => p.WorkspaceId == workspaceId, ct);
        var publishedPages = await _db.Pages.CountAsync(p => p.WorkspaceId == workspaceId && p.Status == "published", ct);
        var draftPages = totalPages - publishedPages;
        var totalSections = await _db.PageSections.CountAsync(s => _db.Pages.Any(p => p.Id == s.PageId && p.WorkspaceId == workspaceId), ct);
        var totalElements = await _db.PageElements.CountAsync(e => _db.PageSections.Any(s => s.Id == e.SectionId && _db.Pages.Any(p => p.Id == s.PageId && p.WorkspaceId == workspaceId)), ct);
        var totalProducts = await _db.Products.CountAsync(p => p.WorkspaceId == workspaceId, ct);
        var totalOrders = await _db.Orders.CountAsync(o => o.WorkspaceId == workspaceId, ct);
        var totalCustomers = await _db.Customers.CountAsync(c => c.WorkspaceId == workspaceId, ct);
        var totalLeads = await _db.Leads.CountAsync(l => l.WorkspaceId == workspaceId, ct);

        return Ok(new { totalPages, publishedPages, draftPages, totalSections, totalElements, totalProducts, totalOrders, totalCustomers, totalLeads });
    }
}
