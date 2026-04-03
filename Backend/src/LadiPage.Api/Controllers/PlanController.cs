using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using LadiPage.Api.Models;
using LadiPage.Api.Services;
using LadiPage.Domain.Entities;
using LadiPage.Domain.Interfaces;
using LadiPage.Infrastructure.Services;
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
    private readonly IOnePayPaymentService _onepay;
    private readonly OnePayCallbackProcessor _onePayProcessor;
    private readonly ILogger<PlanController> _log;

    public PlanController(
        IAppDbContext db,
        ICurrentUser currentUser,
        IConfiguration config,
        IOnePayPaymentService onepay,
        OnePayCallbackProcessor onePayProcessor,
        ILogger<PlanController> log)
    {
        _db = db;
        _currentUser = currentUser;
        _config = config;
        _onepay = onepay;
        _onePayProcessor = onePayProcessor;
        _log = log;
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

    /// <summary>Trạng thái thanh toán (OnePay / nâng cấp thử) cho UI bảng giá.</summary>
    [HttpGet("billing-options")]
    [AllowAnonymous]
    public IActionResult GetBillingOptions()
    {
        var o = _config.GetSection(OnePayOptions.SectionName);
        var onePayEnabled = o.GetValue<bool>("Enabled")
            && !string.IsNullOrWhiteSpace(o["MerchantId"])
            && !string.IsNullOrWhiteSpace(o["AccessCode"])
            && !string.IsNullOrWhiteSpace(o["SecureSecretHex"]);
        return Ok(new
        {
            onePayEnabled,
            testUpgradeEnabled = _config.GetValue<bool>("AllowTestUpgrade"),
        });
    }

    /// <summary>Tạo URL thanh toán OnePay VPC (redirect browser).</summary>
    [HttpPost("onepay/create")]
    [Authorize]
    public async Task<IActionResult> CreateOnePayCheckout([FromBody] OnePayCheckoutRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();

        var o = _config.GetSection(OnePayOptions.SectionName);
        if (!o.GetValue<bool>("Enabled")
            || string.IsNullOrWhiteSpace(o["MerchantId"])
            || string.IsNullOrWhiteSpace(o["AccessCode"])
            || string.IsNullOrWhiteSpace(o["SecureSecretHex"]))
            return BadRequest(new { error = "Thanh toán OnePay chưa được bật hoặc cấu hình chưa đủ (OnePay:Enabled, MerchantId, AccessCode, SecureSecretHex)." });

        var plan = await _db.Plans.AsNoTracking().FirstOrDefaultAsync(p => p.Id == req.PlanId && p.IsActive, ct);
        if (plan == null)
            return BadRequest(new { error = "Gói không tồn tại hoặc không khả dụng." });
        if (plan.Price <= 0)
            return BadRequest(new { error = "Gói này không cần thanh toán." });

        var amount = (long)Math.Round(plan.Price, 0, MidpointRounding.AwayFromZero);
        var userId = _currentUser.UserId.Value;
        var orderId = $"PP{userId}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..8]}";
        if (orderId.Length > 40)
            orderId = orderId[..40];
        var requestId = Guid.NewGuid().ToString("N");

        var orderInfo = PaymentOrderInfoSanitizer.ForPlanPayment(plan.Code, plan.Name);
        var redirectBaseOverride = o["RedirectBaseUrl"];
        string frontendBase;
        if (!string.IsNullOrWhiteSpace(req.RedirectBaseUrl)
            && TryValidateClientRedirectBase(req.RedirectBaseUrl, _config, out var clientBase))
            frontendBase = clientBase;
        else if (!string.IsNullOrWhiteSpace(redirectBaseOverride))
            frontendBase = redirectBaseOverride.TrimEnd('/');
        else
            frontendBase = (_config["Frontend:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');

        var redirectPath = o["RedirectPath"] ?? "/dashboard/settings?tab=billing&payment=onepay";
        if (!redirectPath.StartsWith('/'))
            redirectPath = "/" + redirectPath;

        var callbackBase = o["CallbackBaseUrl"]?.Trim().TrimEnd('/');
        string returnUrl;
        if (!string.IsNullOrWhiteSpace(callbackBase))
            returnUrl = $"{callbackBase}/api/payments/onepay/return";
        else
            returnUrl = frontendBase + redirectPath;

        var row = new MomoPaymentOrder
        {
            UserId = userId,
            PlanId = plan.Id,
            Amount = amount,
            OrderId = orderId,
            RequestId = requestId,
            Status = "cho",
            CreatedAt = DateTime.UtcNow,
        };
        _db.MomoPaymentOrders.Add(row);
        await _db.SaveChangesAsync(ct);

        string payUrl;
        try
        {
            payUrl = _onepay.BuildPaymentRedirectUrl(amount, orderId, orderInfo, returnUrl);
        }
        catch (Exception ex)
        {
            row.Status = "thatbai";
            row.CompletedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            _log.LogWarning(ex, "OnePay/create: không tạo được URL orderId={OrderId}", orderId);
            return BadRequest(new { error = "Không tạo được link thanh toán OnePay." });
        }

        return Ok(new { payUrl, orderId });
    }

    /// <summary>Khi vpc_ReturnURL trỏ về frontend: gửi nguyên query string từ URL để server xác nhận chữ ký và nâng cấp gói.</summary>
    [HttpPost("onepay/confirm")]
    [Authorize]
    public async Task<IActionResult> ConfirmOnePay([FromBody] OnePayConfirmRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(req.RawQuery))
            return BadRequest(new { error = "Thiếu rawQuery." });

        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var parsed = QueryHelpers.ParseQuery(req.RawQuery.TrimStart('?'));
        foreach (var kv in parsed)
        {
            if (kv.Value.Count == 0) continue;
            var sb = new StringBuilder();
            for (var i = 0; i < kv.Value.Count; i++)
            {
                if (i > 0) sb.Append(',');
                sb.Append(kv.Value[i]);
            }
            dict[kv.Key] = sb.ToString();
        }

        var result = await _onePayProcessor.ProcessAsync(_db, _onepay, dict, _currentUser.UserId.Value, ct);
        return result switch
        {
            OnePayCallbackResult.PaidResult => Ok(new { ok = true }),
            OnePayCallbackResult.AlreadyDoneResult => Ok(new { ok = true, already = true }),
            OnePayCallbackResult.DeclinedResult d => BadRequest(new { error = d.Message, code = d.ResponseCode }),
            OnePayCallbackResult.FailedResult f => BadRequest(new { error = f.Error }),
            _ => BadRequest(new { error = "Không xử lý được giao dịch." }),
        };
    }

    [HttpPost("upgrade")]
    [Authorize]
    public async Task<IActionResult> Upgrade([FromBody] UpgradePlanRequest req, CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();

        var op = _config.GetSection(OnePayOptions.SectionName);
        var onePayLive = op.GetValue<bool>("Enabled")
            && !string.IsNullOrWhiteSpace(op["MerchantId"])
            && !string.IsNullOrWhiteSpace(op["AccessCode"])
            && !string.IsNullOrWhiteSpace(op["SecureSecretHex"]);
        if (onePayLive)
            return BadRequest(new { error = "Vui lòng thanh toán qua OnePay (POST /api/plans/onepay/create). Nâng cấp trực tiếp không khả dụng." });

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

    /// <summary>Hủy gói trả phí, chuyển về gói miễn phí (không hoàn tiền — chỉ cập nhật quyền).</summary>
    [HttpPost("cancel")]
    [Authorize]
    public async Task<IActionResult> CancelSubscription(CancellationToken ct)
    {
        if (_currentUser.UserId == null) return Unauthorized();

        var freePlan = await _db.Plans.AsNoTracking().FirstOrDefaultAsync(p => p.Code == "free" && p.IsActive, ct);
        if (freePlan == null)
            return BadRequest(new { error = "Hệ thống chưa cấu hình gói miễn phí." });

        var user = await _db.Users.Include(u => u.CurrentPlan).FirstOrDefaultAsync(u => u.Id == _currentUser.UserId.Value, ct);
        if (user == null) return Unauthorized();

        var current = user.CurrentPlan;
        if (current == null || current.Code == "free" || current.Price <= 0)
            return BadRequest(new { error = "Bạn đang dùng gói miễn phí, không cần hủy." });

        user.CurrentPlanId = freePlan.Id;
        user.PlanExpiresAt = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(new { ok = true, planName = freePlan.Name });
    }

    /// <summary>Chỉ chấp nhận origin trong Cors:Origins hoặc localhost / tunnel (ngrok, loca.lt).</summary>
    private static bool TryValidateClientRedirectBase(string? raw, IConfiguration config, out string normalizedBase)
    {
        normalizedBase = "";
        if (string.IsNullOrWhiteSpace(raw)) return false;
        var trimmed = raw.Trim().TrimEnd('/');
        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri)) return false;
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return false;
        if (uri.Scheme == Uri.UriSchemeHttp && uri.Host != "localhost" && uri.Host != "127.0.0.1") return false;

        var host = uri.Host;
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
        {
            normalizedBase = trimmed;
            return true;
        }

        if (host.EndsWith(".ngrok-free.dev", StringComparison.OrdinalIgnoreCase)
            || host.EndsWith(".ngrok-free.app", StringComparison.OrdinalIgnoreCase)
            || host.EndsWith(".ngrok.io", StringComparison.OrdinalIgnoreCase)
            || host.EndsWith(".loca.lt", StringComparison.OrdinalIgnoreCase))
        {
            normalizedBase = trimmed;
            return true;
        }

        var portSuffix = uri.IsDefaultPort ? "" : ":" + uri.Port.ToString(CultureInfo.InvariantCulture);
        var origin = $"{uri.Scheme}://{uri.Host}{portSuffix}";
        var origins = config.GetSection("Cors:Origins").Get<string[]>();
        if (origins == null) return false;
        foreach (var o in origins)
        {
            if (string.IsNullOrWhiteSpace(o)) continue;
            if (string.Equals(o.TrimEnd('/'), origin, StringComparison.OrdinalIgnoreCase))
            {
                normalizedBase = trimmed;
                return true;
            }
        }

        return false;
    }
}
