namespace LadiPage.Core.Entities;

public class Media
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public long? WorkspaceId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string OriginalName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "image/png";
    public long FileSize { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public string? AltText { get; set; }
    public string? Folder { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public Workspace? Workspace { get; set; }
}
