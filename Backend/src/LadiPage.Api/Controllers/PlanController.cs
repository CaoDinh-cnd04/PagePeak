using LadiPage.Api.Models;
using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Controllers;

[ApiController]
[Route("api/plans")]
public class PlanController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IConfiguration _config;

    public PlanController(IAppDbContext db, ICurrentUser currentUser, IConfiguration config)
    {
        _db = db;
        _currentUser = currentUser;
        _config = config;
    }

    [HttpGet]
    [AllowAnonymous]
    [ResponseCache(Duration = 300, VaryByQueryKeys = [])]
    public async Task<IActionResult> GetPlans(CancellationToken ct)
    {
        var plans = await _db.Plans.AsNoTracking().Where(p => p.IsActive).OrderBy(p => p.Price)
            .Select(p => new { p.Id, p.Name, p.Code, p.Price, p.BillingCycle, p.MaxPages, p.MaxMembers, p.MaxPageViews, p.StorageGb, p.HasAi, p.HasEcommerce, p.HasAutomation, p.HasAbTest, p.HasCustomDomain })
            .ToListAsync(ct);
        return Ok(plans);
    }

    [HttpPost("upgrade")]
    [Authorize]
    public async Task<IActionResult> Upgrade([FromBody] UpgradePlanRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        var allowTestUpgrade = _config.GetValue<bool>("AllowTestUpgrade");
        if (!allowTestUpgrade)
            return BadRequest(new { error = "Chức năng nâng cấp đang bảo trì. Vui lòng liên hệ hỗ trợ." });

        var plan = await _db.Plans.AsNoTracking().FirstOrDefaultAsync(p => p.Id == req.PlanId && p.IsActive, ct);
        if (plan == null)
            return BadRequest(new { error = "Gói không tồn tại hoặc không khả dụng." });

        var user = await _db.Users.FindAsync([_currentUser.UserId.Value], ct);
        if (user == null) return Unauthorized();

        user.CurrentPlanId = plan.Id;
        user.PlanExpiresAt = DateTime.UtcNow.AddYears(1);
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true, planName = plan.Name });
    }
}
