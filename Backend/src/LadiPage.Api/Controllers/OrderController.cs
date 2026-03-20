using LadiPage.Api.Models;
using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrderController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IWorkspaceAccessService _workspaceAccess;

    public OrderController(IAppDbContext db, ICurrentUser currentUser, IWorkspaceAccessService workspaceAccess)
    {
        _db = db;
        _currentUser = currentUser;
        _workspaceAccess = workspaceAccess;
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders([FromQuery] long workspaceId, [FromQuery] string? status, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, workspaceId)) return NotFound();
        var query = _db.Orders.Where(o => o.WorkspaceId == workspaceId);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(o => o.Status == status);
        var items = await query.OrderByDescending(o => o.CreatedAt)
            .Select(o => new { o.Id, o.CustomerName, o.Email, o.Phone, o.ProductId, o.Amount, o.Status, o.CreatedAt }).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, req.WorkspaceId)) return NotFound();
        var o = new Order { WorkspaceId = req.WorkspaceId, CustomerName = req.CustomerName.Trim(), Email = req.Email, Phone = req.Phone, ProductId = req.ProductId, Amount = req.Amount, Status = "pending", CreatedAt = DateTime.UtcNow };
        _db.Orders.Add(o);
        await _db.SaveChangesAsync(ct);
        return Ok(new { o.Id, o.CustomerName, o.Amount, o.Status, o.CreatedAt });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateOrderRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var o = await _db.Orders.FindAsync([id], ct);
        if (o == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, o.WorkspaceId)) return NotFound();
        if (!string.IsNullOrWhiteSpace(req.CustomerName)) o.CustomerName = req.CustomerName.Trim();
        if (req.Email != null) o.Email = req.Email;
        if (req.Phone != null) o.Phone = req.Phone;
        if (!string.IsNullOrWhiteSpace(req.Status)) o.Status = req.Status;
        await _db.SaveChangesAsync(ct);
        return Ok(new { o.Id, o.Status });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var o = await _db.Orders.FindAsync([id], ct);
        if (o == null) return NotFound();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId!.Value, o.WorkspaceId)) return NotFound();
        _db.Orders.Remove(o);
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }
}
