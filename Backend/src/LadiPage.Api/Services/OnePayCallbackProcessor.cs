using System.Globalization;
using LadiPage.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LadiPage.Api.Services;

public sealed class OnePayCallbackProcessor
{
    private static string G(IReadOnlyDictionary<string, string> q, string key)
    {
        foreach (var kv in q)
        {
            if (string.Equals(kv.Key, key, StringComparison.OrdinalIgnoreCase))
                return kv.Value;
        }
        return "";
    }

    /// <summary>
    /// requireUserId: null = callback server (OnePay redirect tới API); có giá trị = user đã đăng nhập xác nhận từ SPA.
    /// </summary>
    public async Task<OnePayCallbackResult> ProcessAsync(
        IAppDbContext db,
        IOnePayPaymentService onepay,
        IReadOnlyDictionary<string, string> query,
        long? requireUserId,
        CancellationToken ct)
    {
        if (!onepay.TryVerifySecureHash(query, out var err))
            return OnePayCallbackResult.Fail(err ?? "Chữ ký không hợp lệ.");

        var rc = G(query, "vpc_TxnResponseCode");
        if (rc != "0")
        {
            var msg = G(query, "vpc_Message");
            return OnePayCallbackResult.Declined(rc, string.IsNullOrEmpty(msg) ? $"Mã phản hồi {rc}" : msg);
        }

        var merchRef = G(query, "vpc_MerchTxnRef");
        if (string.IsNullOrEmpty(merchRef))
            return OnePayCallbackResult.Fail("Thiếu vpc_MerchTxnRef.");

        var order = await db.MomoPaymentOrders.FirstOrDefaultAsync(o => o.OrderId == merchRef, ct);
        if (order == null)
            return OnePayCallbackResult.Fail("Không tìm thấy đơn hàng.");

        if (requireUserId != null && order.UserId != requireUserId.Value)
            return OnePayCallbackResult.Fail("Đơn không thuộc tài khoản hiện tại.");

        var amtStr = G(query, "vpc_Amount");
        if (!long.TryParse(amtStr, NumberStyles.Integer, CultureInfo.InvariantCulture, out var minor))
            return OnePayCallbackResult.Fail("Số tiền không hợp lệ.");

        if (minor != checked(order.Amount * 100))
            return OnePayCallbackResult.Fail("Số tiền không khớp đơn.");

        if (order.Status == "thanhcong")
            return OnePayCallbackResult.AlreadyDone;

        var user = await db.Users.FindAsync([order.UserId], ct);
        var plan = await db.Plans.AsNoTracking().FirstOrDefaultAsync(p => p.Id == order.PlanId, ct);
        if (user == null || plan == null)
        {
            order.Status = "thatbai";
            order.CompletedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            return OnePayCallbackResult.Fail("Không tìm thấy người dùng hoặc gói.");
        }

        user.CurrentPlanId = plan.Id;
        user.PlanExpiresAt = DateTime.UtcNow.AddYears(1);
        user.UpdatedAt = DateTime.UtcNow;
        order.Status = "thanhcong";
        order.CompletedAt = DateTime.UtcNow;
        order.MomoTransId = G(query, "vpc_TransactionNo");
        await db.SaveChangesAsync(ct);

        return OnePayCallbackResult.Paid;
    }
}

public abstract record OnePayCallbackResult
{
    public sealed record PaidResult : OnePayCallbackResult;
    public sealed record AlreadyDoneResult : OnePayCallbackResult;
    public sealed record DeclinedResult(string ResponseCode, string Message) : OnePayCallbackResult;
    public sealed record FailedResult(string Error) : OnePayCallbackResult;

    public static OnePayCallbackResult Paid { get; } = new PaidResult();
    public static OnePayCallbackResult AlreadyDone { get; } = new AlreadyDoneResult();
    public static OnePayCallbackResult Declined(string code, string message) => new DeclinedResult(code, message);
    public static OnePayCallbackResult Fail(string error) => new FailedResult(error);
}
