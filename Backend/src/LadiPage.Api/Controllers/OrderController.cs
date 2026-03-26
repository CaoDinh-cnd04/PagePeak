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
    public async Task<IActionResult> GetOrders(
        [FromQuery] long workspaceId,
        [FromQuery] string? status,
        [FromQuery] string? q,
        [FromQuery] bool incomplete = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sort = "created_desc",
        CancellationToken ct = default)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, workspaceId)) return NotFound();

        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var query = _db.Orders.AsNoTracking().Where(o => o.WorkspaceId == workspaceId);
        if (incomplete)
            query = query.Where(o => o.Status == "pending" || o.Status == "shipping");
        else if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(o => o.Status == status);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var t = q.Trim();
            if (long.TryParse(t, out var orderId))
            {
                query = query.Where(o =>
                    o.Id == orderId ||
                    o.CustomerName.Contains(t) ||
                    (o.Email != null && o.Email.Contains(t)) ||
                    (o.Phone != null && o.Phone.Contains(t)));
            }
            else
            {
                query = query.Where(o =>
                    o.CustomerName.Contains(t) ||
                    (o.Email != null && o.Email.Contains(t)) ||
                    (o.Phone != null && o.Phone.Contains(t)));
            }
        }

        var totalCount = await query.CountAsync(ct);

        query = sort switch
        {
            "amount_asc" => query.OrderBy(o => o.Amount),
            "amount_desc" => query.OrderByDescending(o => o.Amount),
            "created_asc" => query.OrderBy(o => o.CreatedAt),
            _ => query.OrderByDescending(o => o.CreatedAt),
        };

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new
            {
                o.Id,
                o.CustomerName,
                o.Email,
                o.Phone,
                o.ProductId,
                ProductName = o.Product != null ? o.Product.Name : null,
                o.Amount,
                o.Status,
                o.CreatedAt,
            })
            .ToListAsync(ct);

        return Ok(new { items, totalCount });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (!await _workspaceAccess.CanAccessWorkspaceAsync(_currentUser.UserId.Value, req.WorkspaceId)) return NotFound();
        var o = new Order
        {
            WorkspaceId = req.WorkspaceId,
            CustomerName = req.CustomerName.Trim(),
            Email = req.Email,
            Phone = req.Phone,
            ProductId = req.ProductId,
            Amount = req.Amount,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
        };
        _db.Orders.Add(o);
        await _db.SaveChangesAsync(ct);
        var dto = await ProjectOrderAsync(o.Id, ct);
        return Ok(dto);
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
        var dto = await ProjectOrderAsync(o.Id, ct);
        return Ok(dto);
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

    private async Task<object?> ProjectOrderAsync(long id, CancellationToken ct) =>
        await _db.Orders.AsNoTracking()
            .Where(o => o.Id == id)
            .Select(o => new
            {
                o.Id,
                o.CustomerName,
                o.Email,
                o.Phone,
                o.ProductId,
                ProductName = o.Product != null ? o.Product.Name : null,
                o.Amount,
                o.Status,
                o.CreatedAt,
            })
            .FirstOrDefaultAsync(ct);
}
