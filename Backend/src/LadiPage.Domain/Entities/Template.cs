namespace LadiPage.Domain.Entities;

public class Template
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string? ThumbnailUrl { get; set; }
    public string JsonContent { get; set; } = "{}";
    public string? Description { get; set; }
    public string DesignType { get; set; } = "responsive";
    public bool IsFeatured { get; set; }
    public int UsageCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
