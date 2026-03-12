namespace LadiPage.Core.Entities;

public class User
{
    public long Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public string Role { get; set; } = "nguoidung";
    public string Status { get; set; } = "hoatdong";
    public bool EmailConfirmed { get; set; }
    public bool PhoneConfirmed { get; set; }
    public int? CurrentPlanId { get; set; }
    public DateTime? PlanExpiresAt { get; set; }
    public string? ReferralCode { get; set; }
    public long? ReferredByUserId { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Plan? CurrentPlan { get; set; }
}
