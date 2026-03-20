using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly IAppDbContext _db;

    public NotificationController(IAppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetNotifications(CancellationToken ct)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
            return Unauthorized();
        var items = await _db.Notifications.Where(n => n.UserId == userId).OrderByDescending(n => n.CreatedAt).Take(50)
            .Select(n => new { n.Id, n.Title, n.Message, n.Type, n.IsRead, n.CreatedAt }).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPut("{id:long}/read")]
    public async Task<IActionResult> MarkRead(long id, CancellationToken ct)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
            return Unauthorized();
        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (n == null) return NotFound();
        n.IsRead = true;
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }

    [HttpPut("mark-all-read")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
            return Unauthorized();
        await _db.Notifications.Where(n => n.UserId == userId).ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
        return Ok(new { ok = true });
    }
}
