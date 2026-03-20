namespace LadiPage.Domain.Entities;

public class PlanSubscription
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public int PlanId { get; set; }
    public string Status { get; set; } = "hoatdong";
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool AutoRenew { get; set; } = true;
    public string? PaymentMethod { get; set; }
    public string? TransactionId { get; set; }
    public decimal AmountPaid { get; set; }
    public string Currency { get; set; } = "VND";
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public Plan Plan { get; set; } = null!;
}
