using LadiPage.Api.Models;
using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/customers")]
[Authorize]
public class CustomerController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceAccessService _workspaceAccess;

    public CustomerController(IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess)
    {
        _db = db;
        _currentUser = currentUser;
        _workspaceAccess = workspaceAccess;
    }

    [HttpGet]
    public async Task<IActionResult> GetCustomers([FromQuery] long workspaceId, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, workspaceId)) return NotFound();
        var items = await _db.Customers.Where(c => c.WorkspaceId == workspaceId).OrderByDescending(c => c.CreatedAt)
            .Select(c => new { c.Id, c.Name, c.Email, c.Phone, c.Group, c.Source, c.CreatedAt }).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomerRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, req.WorkspaceId)) return NotFound();
        var c = new Customer { WorkspaceId = req.WorkspaceId, Name = req.Name.Trim(), Email = req.Email, Phone = req.Phone, Group = req.Group, Source = req.Source, CreatedAt = DateTime.UtcNow };
        _db.Customers.Add(c);
        await _db.SaveChangesAsync(ct);
        return Ok(new { c.Id, c.Name, c.Email, c.Phone, c.CreatedAt });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateCustomerRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var c = await _db.Customers.FindAsync([id], ct);
        if (c == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, c.WorkspaceId)) return NotFound();
        if (!string.IsNullOrWhiteSpace(req.Name)) c.Name = req.Name.Trim();
        if (req.Email != null) c.Email = req.Email;
        if (req.Phone != null) c.Phone = req.Phone;
        if (req.Group != null) c.Group = req.Group;
        if (req.Source != null) c.Source = req.Source;
        await _db.SaveChangesAsync(ct);
        return Ok(new { c.Id, c.Name, c.Email });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var c = await _db.Customers.FindAsync([id], ct);
        if (c == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, c.WorkspaceId)) return NotFound();
        _db.Customers.Remove(c);
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
