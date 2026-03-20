namespace LadiPage.Domain.Entities;

public class Order
{
    public long Id { get; set; }
    public long WorkspaceId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public long? ProductId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime CreatedAt { get; set; }

    public Workspace Workspace { get; set; } = null!;
    public Product? Product { get; set; }
}
