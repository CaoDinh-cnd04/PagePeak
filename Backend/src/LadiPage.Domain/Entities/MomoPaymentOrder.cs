namespace LadiPage.Domain.Entities;

/// <summary>
/// Đơn thanh toán MoMo (nâng cấp gói) — map bảng GiaoDichThanhToanMoMo.
/// </summary>
public class MomoPaymentOrder
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public int PlanId { get; set; }
    public long Amount { get; set; }
    /// <summary>Mã đơn gửi MoMo (orderId), duy nhất.</summary>
    public string OrderId { get; set; } = string.Empty;
    public string RequestId { get; set; } = string.Empty;
    /// <summary>cho, thanhcong, thatbai</summary>
    public string Status { get; set; } = "cho";
    public string? MomoTransId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public User? User { get; set; }
    public Plan? Plan { get; set; }
}
