namespace LadiPage.Domain.Entities;

public class Product
{
    public long Id { get; set; }
    public long WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? Category { get; set; }
    public int Stock { get; set; }
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; }

    public Workspace Workspace { get; set; } = null!;
}
