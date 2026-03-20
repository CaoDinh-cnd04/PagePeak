using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public SettingsController(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    [HttpGet("plan")]
    public async Task<IActionResult> GetPlan(CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var user = await _db.Users.AsNoTracking().Include(u => u.CurrentPlan)
            .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId.Value, ct);
        if (user == null) return Unauthorized();

        var workspaceIds = await _db.Workspaces.Where(w => w.OwnerId == user.Id).Select(w => w.Id).ToListAsync(ct);
        var totalPages = workspaceIds.Count > 0 ? await _db.Pages.CountAsync(p => workspaceIds.Contains(p.WorkspaceId), ct) : 0;
        var publishedPages = workspaceIds.Count > 0 ? await _db.Pages.CountAsync(p => workspaceIds.Contains(p.WorkspaceId) && p.Status == "published", ct) : 0;
        var totalMembers = workspaceIds.Count > 0 ? await _db.WorkspaceMembers.CountAsync(m => workspaceIds.Contains(m.WorkspaceId), ct) : 0;

        var plan = user.CurrentPlan;
        return Ok(new
        {
            plan = plan == null ? null : new
            {
                plan.Id, plan.Name, plan.Code, plan.Price, plan.BillingCycle, plan.MaxPages, plan.MaxMembers,
                plan.MaxPageViews, plan.StorageGb, plan.HasAi, plan.HasEcommerce, plan.HasAutomation, plan.HasAbTest, plan.HasCustomDomain
            },
            usage = new { totalPages, publishedPages, totalMembers },
            planExpiresAt = user.PlanExpiresAt,
            emailConfirmed = user.EmailConfirmed,
            phoneConfirmed = user.PhoneConfirmed,
            createdAt = user.CreatedAt,
            lastLoginAt = user.LastLoginAt,
            referralCode = user.ReferralCode
        });
    }
}
