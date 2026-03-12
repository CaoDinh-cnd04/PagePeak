namespace LadiPage.Core.Entities;

public class Template
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string? ThumbnailUrl { get; set; }
    public string JsonContent { get; set; } = "{}";
    public DateTime CreatedAt { get; set; }
}

