namespace LadiPage.Domain.Entities;

public class Workspace
{
    public long Id { get; set; }
    public long OwnerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public int? PlanId { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public string? StoreAddress { get; set; }
    public string? StorePhone { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? Province { get; set; }
    public string? District { get; set; }
    public string? Ward { get; set; }
    public string? Timezone { get; set; }
    public string? StoreCurrency { get; set; }

    public User Owner { get; set; } = null!;
    public Plan? Plan { get; set; }
}
