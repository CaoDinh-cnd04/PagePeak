using LadiPage.Api.Services;
using LadiPage.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LadiPage.Api.Controllers;

/// <summary>OnePay redirect GET sau khi thanh toán — vpc_ReturnURL trỏ tới URL công khai của API.</summary>
[ApiController]
[Route("api/payments/onepay")]
public class OnePayReturnController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly IOnePayPaymentService _onepay;
    private readonly OnePayCallbackProcessor _processor;
    private readonly IConfiguration _config;

    public OnePayReturnController(
        IAppDbContext db,
        IOnePayPaymentService onepay,
        OnePayCallbackProcessor processor,
        IConfiguration config)
    {
        _db = db;
        _onepay = onepay;
        _processor = processor;
        _config = config;
    }

    [HttpGet("return")]
    [AllowAnonymous]
    public async Task<IActionResult> ReturnGet(CancellationToken ct)
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var kv in Request.Query)
        {
            if (kv.Value.Count == 0) continue;
            dict[kv.Key] = kv.Value.ToString();
        }

        var result = await _processor.ProcessAsync(_db, _onepay, dict, requireUserId: null, ct);
        var fe = _config["Frontend:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:5173";
        var basePath = $"{fe}/dashboard/settings?tab=billing&payment=onepay";

        switch (result)
        {
            case OnePayCallbackResult.PaidResult:
            case OnePayCallbackResult.AlreadyDoneResult:
                return Redirect($"{basePath}&onepayResult=ok");
            case OnePayCallbackResult.DeclinedResult d:
                return Redirect($"{basePath}&onepayResult=fail&onepayCode={Uri.EscapeDataString(d.ResponseCode)}");
            case OnePayCallbackResult.FailedResult f:
                return Redirect($"{basePath}&onepayResult=fail&onepayReason={Uri.EscapeDataString(f.Error)}");
            default:
                return Redirect($"{basePath}&onepayResult=fail");
        }
    }
}
