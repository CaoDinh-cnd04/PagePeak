namespace LadiPage.Domain.Entities;

public class Plan
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string BillingCycle { get; set; } = "thang";
    public int MaxPages { get; set; } = 10;
    public int MaxMembers { get; set; } = 1;
    public long? MaxPageViews { get; set; }
    public decimal StorageGb { get; set; } = 1;
    public bool HasAi { get; set; }
    public bool HasEcommerce { get; set; }
    public bool HasAutomation { get; set; }
    public bool HasAbTest { get; set; }
    public bool HasCustomDomain { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
